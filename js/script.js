// ---------- i18n (EN / VI) ----------
// Any element with data-en / data-vi gets its text swapped. Inputs/textareas
// use data-en-ph / data-vi-ph for placeholders. Preference is remembered
// per-browser via localStorage.
(function () {
  const STORAGE_KEY = 'ts_lang';

  function applyLang(lang) {
    document.documentElement.setAttribute('lang', lang === 'vi' ? 'vi' : 'en');
    document.querySelectorAll('[data-en]').forEach(function (el) {
      const val = el.getAttribute('data-' + lang);
      if (val !== null) el.textContent = val;
    });
    document.querySelectorAll('[data-en-ph]').forEach(function (el) {
      const val = el.getAttribute('data-' + lang + '-ph');
      if (val !== null) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('.langtoggle button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    applyLang(lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const saved = 'en';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (e) {}
    applyLang(saved);
    document.querySelectorAll('.langtoggle button').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
    });
  });
})();

// ---------- Mini image carousels (used inside feature cards) ----------
// Each .mini-carousel holds a .mini-track of .mini-slide items and its own
// .mini-dots. Pure CSS scroll-snap does the swipe; this just syncs the dots.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.mini-carousel').forEach(function (root) {
    const track = root.querySelector('.mini-track');
    const dotsWrap = root.querySelector('.mini-dots');
    const slides = Array.prototype.slice.call(track.children);
    if (!dotsWrap || slides.length < 2) return;

    slides.forEach(function (_, i) {
      const dot = document.createElement('button');
      dot.className = 'mini-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Photo ' + (i + 1));
      dot.addEventListener('click', function () {
        track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
      });
      dotsWrap.appendChild(dot);
    });
    const dots = Array.prototype.slice.call(dotsWrap.children);

    const timer;
    track.addEventListener('scroll', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      }, 60);
    });
  });
});

// ---------- Quote form ----------
// Submits via fetch so the page never leaves. Posts to the form's
// data-ajax-action (FormSubmit's /ajax/ endpoint) when present, which emails
// the submission straight to the owner's inbox with no backend to run.
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('quote-form');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  // Set min date to today
  const eventDateInput = document.getElementById('event_date');
  if (eventDateInput) {
    const today = new Date().toISOString().split('T')[0];
    eventDateInput.min = today;
  }

  // ---------- Validation helpers ----------
  const validators = {
    name: (value) => {
      if (!value.trim()) return 'Please enter your name.';
      if (value.trim().length < 2) return 'Name must be at least 2 characters.';
      return '';
    },
    email: (value) => {
      if (!value.trim()) return 'Please enter your email address.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address.';
      return '';
    },
    event_date: (value) => {
      if (!value) return ''; // optional
      const selected = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return 'Event date cannot be in the past.';
      return '';
    },
    guest_count: (value) => {
      if (!value) return ''; // optional
      const num = Number(value);
      if (isNaN(num) || num < 1) return 'Guest count must be at least 1.';
      if (!Number.isInteger(num)) return 'Guest count must be a whole number.';
      return '';
    },
    message: (value) => {
      if (!value.trim()) return 'Please tell us what you need.';
      if (value.trim().length < 10) return 'Please provide a bit more detail (at least 10 characters).';
      return '';
    }
  };

  function showError(fieldName, message) {
    const input = document.getElementById(fieldName);
    const errorEl = document.getElementById(`${fieldName}-error`);
    if (!input || !errorEl) return;

    if (message) {
      input.classList.add('error');
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
    } else {
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
      errorEl.textContent = '';
    }
  }

  function clearAllErrors() {
    Object.keys(validators).forEach(name => showError(name, ''));
  }

  function validateField(name) {
    const input = document.getElementById(name);
    if (!input) return true;
    const message = validators[name](input.value);
    showError(name, message);
    return !message;
  }

  function validateForm() {
    let isValid = true;
    Object.keys(validators).forEach(name => {
      if (!validateField(name)) isValid = false;
    });
    return isValid;
  }

  // Real-time validation on blur / input
  Object.keys(validators).forEach(name => {
    const input = document.getElementById(name);
    if (!input) return;

    input.addEventListener('blur', () => validateField(name));
    input.addEventListener('input', () => {
      // Clear error as soon as user starts correcting
      if (input.classList.contains('error')) {
        validateField(name);
      }
    });
  });

  // ---------- Status helper ----------
  function setStatus(type, message) {
    console.log('test', statusEl)
    statusEl.className = `status ${type}`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
  }


  form.addEventListener('submit', function (e) {
    const action = form.dataset.ajaxAction || form.getAttribute('action') || '';

    e.preventDefault();

    // Honeypot check
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) {
      // Silent fail for bots
      return;
    }

    clearAllErrors();
    if (!validateForm()) {
      setStatus('error', 'Please fix the errors above and try again.');
      // Focus first invalid field
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    // Disable button + show loading
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    setStatus('loading', 'Sending your request…');

    if (status) status.textContent = 'Sending…';
    fetch(action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!status) return;
        if (res.ok) {
          status.textContent = "Thanks! We'll follow up by email soon.";
          setStatus('success', 'Thank you! Your quote request has been sent successfully. We’ll get back to you soon.');
          clearAllErrors();
          form.reset();
        } else {
          status.textContent = 'Something went wrong — please email us directly.';
          // FormSubmit sometimes returns useful messages
          const errorMsg = data.message || data.error || 'Something went wrong. Please try again later.';
          setStatus('error', errorMsg);
        }
      })
      .catch(function () {
        if (status) status.textContent = 'Something went wrong — please email us directly.';
        console.error('Form submission error:', err);
      setStatus('error', 'Network error. Please check your connection and try again.');
      });
  });
});





document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quote-form');
  const statusEl = document.getElementById('form-status');
  console.log({statusEl})
  const submitBtn = document.getElementById('submit-btn');

  

  // ---------- Form submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot check
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) {
      // Silent fail for bots
      return;
    }

    clearAllErrors();
    if (!validateForm()) {
      setStatus('error', 'Please fix the errors above and try again.');
      // Focus first invalid field
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    // Disable button + show loading
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    setStatus('loading', 'Sending your request…');

    try {
      const formData = new FormData(form);

      const response = await fetch(form.dataset.ajaxAction, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('success', 'Thank you! Your quote request has been sent successfully. We’ll get back to you soon.');
        form.reset();
        clearAllErrors();
      } else {
        // FormSubmit sometimes returns useful messages
        const errorMsg = data.message || data.error || 'Something went wrong. Please try again later.';
        setStatus('error', errorMsg);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setStatus('error', 'Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});