// Compose order-confirmation email: form on the left, live preview on the right.
// "Send email" posts to EmailJS (fill in EMAILJS below once); "Copy for Gmail"
// and "Download .html" work with no setup.
(function () {
  'use strict';

  // ---- ONE-TIME SETUP: paste your EmailJS values here (see README §0.8) ----
  const EMAILJS = { serviceId: '', templateId: '', publicKey: '' };
  // --------------------------------------------------------------------------

  const SITE_URL = 'https://twosistertampa.com';
  const SUBJECT = 'Your order is confirmed – Two Sisters Tampa';
  const DRAFT_KEY = 'ts_compose_draft_v1';
  const FIELDS = ['name', 'email', 'style', 'dimensions', 'design', 'delivery', 'setup'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const $ = (s, r) => (r || document).querySelector(s);
  const statusEl = $('#cStatus');
  let lines = [{ label: '', amount: '' }, { label: '', amount: '' }];

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const multiline = (s) => esc(s).replace(/\r?\n/g, '<br>');
  const configured = () => !!(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);

  function parseAmount(raw) {
    const t = String(raw).replace(/[$,\s]/g, '');
    return /^-?\d+(\.\d{1,2})?$/.test(t) ? parseFloat(t) : NaN;
  }
  function money(n) {
    const neg = n < 0, v = Math.abs(n);
    const s = v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
    return (neg ? '-$' : '$') + s;
  }
  function collect() {
    const d = {};
    FIELDS.forEach((k) => { d[k] = $('#f-' + k).value; });
    d.lines = lines.map((l) => ({ label: l.label, amount: l.amount }));
    return d;
  }
  function validLines(d) {
    return d.lines.filter((l) => l.label.trim() && !isNaN(parseAmount(l.amount)))
      .map((l) => ({ label: l.label.trim(), value: parseAmount(l.amount) }));
  }
  const totalOf = (items) => items.reduce((a, l) => a + l.value, 0);

  // ---------- email HTML ----------
  function buildEmail(d, opts) {
    opts = opts || {};
    const ph = (label) => '<span style="color:#B7A89B;font-style:italic;">[' + label + ']</span>';
    const text = (v, label, multi) => {
      v = (v || '').trim();
      if (v) return multi ? multiline(v) : esc(v);
      return opts.preview ? ph(label) : '';
    };
    const first = (d.name || '').trim().split(/\s+/)[0];
    const logo = opts.preview ? new URL('images/logo.png', location.href).href : SITE_URL + '/images/logo.png';

    const rowTd = 'padding:13px 0;border-bottom:2px dotted #DCCFA8;vertical-align:top;font-size:15px;line-height:1.55;color:#5A4034;';
    const row = (k, v) => '<tr><td class="k" style="width:112px;padding:13px 16px 13px 0;border-bottom:2px dotted #DCCFA8;vertical-align:top;font-size:15px;line-height:1.55;color:#6F8A5B;font-weight:700;">' + k + '</td><td style="' + rowTd + '">' + v + '</td></tr>';

    let items = validLines(d);
    if (!items.length && opts.preview) items = [{ label: '__ph__', value: 0 }];
    const total = totalOf(items);
    const priceRows = items.map((l, i) => {
      const last = i === items.length - 1;
      const b = last ? 'border-bottom:2px dotted #E8BFA6;' : '';
      return '<tr><td style="padding:11px 0;font-size:15px;color:#5A4034;' + b + '">' + (l.label === '__ph__' ? ph('Item') : esc(l.label)) + '</td><td align="right" style="padding:11px 0;font-size:15px;color:#5A4034;' + b + '">' + money(l.value) + '</td></tr>';
    }).join('');

    const HEAD = "font-family:'Fredoka','Trebuchet MS',Arial,sans-serif;";
    const SANS = "font-family:'Nunito','Helvetica Neue',Arial,sans-serif;";
    const BODY = SANS + 'font-size:16px;line-height:1.65;color:#5A4034;';
    const strong = (t) => '<strong style="color:#785848;">' + t + '</strong>';
    const polRow = (t, last) => '<tr><td style="padding:0 0 ' + (last ? 12 : 14) + 'px;">' + t + '</td></tr>';
    const link = (href, label, color, extra) => '<a href="' + href + '" style="color:' + color + ';font-weight:700;text-decoration:none;' + (extra || '') + '">' + label + '</a>';
    // inline-block links wrap cleanly on narrow phones (a run of &nbsp; forced the card wider than the screen)
    const footLink = (href, label) => link(href, label, '#FFF4CC', 'display:inline-block;padding:0 8px;');

    const fragment =
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3ECD6;"><tr><td align="center" style="padding:28px 12px;">' +
'<table role="presentation" class="card" width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;margin:0 auto;background:#FFFCF3;border-radius:18px;overflow:hidden;">' +
'<tr><td align="center" style="background:#FFF4CC;padding:26px 20px 14px;"><img src="' + logo + '" width="190" alt="Two Sisters Tampa" style="display:block;width:190px;max-width:60%;height:auto;border:0;"></td></tr>' +
'<tr><td align="center" style="background:#809868;padding:11px 20px;"><span style="' + HEAD + 'font-size:15px;color:#FFFCF3;letter-spacing:0.5px;">Order confirmation</span></td></tr>' +
'<tr><td class="pad" style="padding:38px 44px 0;"><h1 class="h1" style="' + HEAD + 'margin:0;font-size:36px;line-height:1.15;font-weight:600;color:#785848;">Your cake order is confirmed!</h1><div style="width:64px;height:6px;background:#F8C858;border-radius:3px;margin-top:16px;"></div></td></tr>' +
'<tr><td class="pad" style="padding:22px 44px 0;' + BODY + '"><p style="margin:0 0 16px;">Hi ' + text(first, 'Customer name') + ',</p><p style="margin:0 0 16px;">On behalf of Two Sisters – Tampa Bakery, thank you for choosing us for your special day, and congratulations on your wedding!</p><p style="margin:0;">We have confirmed your order. Here are the details for your cake:</p></td></tr>' +
'<tr><td class="pad" style="padding:26px 44px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="' + SANS + 'border-top:2px dotted #DCCFA8;">' +
  row('Style', text(d.style, 'Style')) + row('Dimensions', text(d.dimensions, 'Dimensions')) + row('Design', text(d.design, 'Design', true)) + row('Delivery', text(d.delivery, 'Delivery')) + row('Setup', text(d.setup, 'Setup', true)) +
'</table></td></tr>' +
'<tr><td class="pad" style="padding:30px 44px 0;"><div style="background:#FCE6D6;border-radius:16px;padding:22px 26px;"><div style="' + HEAD + 'font-size:21px;font-weight:600;color:#785848;margin-bottom:8px;">Pricing breakdown</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="' + SANS + '">' + priceRows +
  '<tr><td style="padding:16px 0 11px;font-weight:700;font-size:17px;color:#5A4034;">Total</td><td align="right" style="' + HEAD + 'padding:12px 0 11px;font-size:30px;font-weight:600;color:#6F8A5B;">' + money(total) + '</td></tr></table></div></td></tr>' +
'<tr><td class="pad" style="padding:30px 44px 0;' + BODY + '"><p style="margin:0 0 16px;">Please review the details and let us know if everything looks correct. Once confirmed, we’ll coordinate the remaining details so everything is beautifully prepared for your event.</p><p style="margin:0;">Please also send us the contact details of the people in charge on the day, so we can connect on arrival for setup.</p></td></tr>' +
'<tr><td class="pad" align="left" style="padding:24px 44px 0;"><a href="https://m.me/twosistersTampa" style="' + HEAD + 'display:inline-block;background:#6F8A5B;color:#FFFCF3;text-decoration:none;font-size:17px;font-weight:500;padding:14px 34px;border-radius:999px;border-bottom:4px solid #F8C858;">Confirm my order</a></td></tr>' +
'<tr><td class="pad" style="padding:42px 44px 0;"><div style="background:#F5F8EE;border:2px solid #D5E0C4;border-radius:16px;padding:26px 26px 14px;"><div style="' + HEAD + 'font-size:22px;font-weight:600;color:#6F8A5B;margin-bottom:4px;">Good to know before your event</div><div style="' + SANS + 'font-size:14px;line-height:1.6;color:#7B6459;margin-bottom:18px;">Please read the following information about our desserts and services.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="' + SANS + 'font-size:14px;line-height:1.6;color:#5A4034;">' +
  polRow(strong('Ingredient disclosure.') + ' We will provide a display menu listing all ingredients for our pastries and wedding cake. You and your guests are responsible for reviewing it to be aware of any potential allergens.') +
  polRow(strong('Allergy responsibility.') + ' We take great care in preparing our desserts, but we cannot assume responsibility for allergic reactions or issues arising from consuming our products.') +
  polRow(strong('Dessert table setup.') + ' After setup, we will photograph and film the display. From that point on, any changes, damage, or discrepancies in dessert count are the responsibility of the customer and the venue.') +
  polRow(strong('Coverage for damages.') + ' If our cake stands or decoration items are lost or damaged during the event, you agree to cover the cost of repair or replacement for any item not returned in its original condition.') +
  polRow(strong('Promotional use.') + ' By engaging our services, you allow us to use photographs and videos of our desserts for business promotion.', true) +
'</table></div></td></tr>' +
'<tr><td class="pad" style="padding:30px 44px 38px;' + BODY + '"><p style="margin:0 0 16px;">We appreciate your understanding and look forward to making your wedding sweet and memorable!</p><p style="margin:0 0 22px;">If you have any questions, reply to this email, call us at ' + link('tel:+17347371382', '+1 734 737 1382', '#6F8A5B') + ', or message us on our page.</p><p style="margin:0;">Best regards,</p><p style="' + HEAD + 'margin:4px 0 0;font-size:23px;font-weight:600;color:#6F8A5B;">Two Sisters – Tampa</p></td></tr>' +
'<tr><td style="background:#809868;border-top:6px solid #F8C858;padding:24px 30px;text-align:center;"><div style="' + HEAD + 'font-size:16px;color:#FFFCF3;margin-bottom:6px;">Two Sisters Tampa</div><div style="' + SANS + 'font-size:13px;color:#FFFCF3;line-height:1.7;margin-bottom:12px;">Custom Cakes · Asian-Inspired Desserts · Sweet Tables · Event Bars</div><div style="' + SANS + 'font-size:14px;line-height:2;">' +
  footLink('tel:+17347371382', '+1 734 737 1382') + footLink('https://m.me/twosistersTampa', 'Messenger') + footLink('https://www.instagram.com/twosisters_tampa/', 'Instagram') + footLink('https://twosistertampa.com/Facebook', 'Facebook') + footLink('https://twosistertampa.com/', 'twosistertampa.com') +
'</div></td></tr></table></td></tr></table>';

    if (opts.fragment) return fragment;
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">' +
      (opts.preview ? '<base target="_blank">' : '') + '<title>' + esc(SUBJECT) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">' +
      '<style>body{margin:0;padding:0;background:#F3ECD6;}@media (max-width:520px){.pad{padding-left:22px !important;padding-right:22px !important;}.k{width:86px !important;}.h1{font-size:30px !important;}}</style>' +
      '</head><body style="margin:0;padding:0;background:#F3ECD6;">' + fragment + '</body></html>';
  }

  // ---------- price lines ----------
  const lineWrap = $('#lines');
  function renderLines() {
    lineWrap.innerHTML = '';
    const hints = ['Custom Table Runner Cake', 'Delivery & On-Site Assembly'];
    lines.forEach((ln, i) => {
      const row = document.createElement('div');
      row.className = 'line';
      row.innerHTML =
        '<div class="field"><input type="text" data-i="' + i + '" data-k="label" aria-label="Item ' + (i + 1) + '" placeholder="' + esc(hints[i] || 'Item') + '"><p class="field-error"></p></div>' +
        '<div class="field amt"><input type="text" inputmode="decimal" data-i="' + i + '" data-k="amount" aria-label="Price ' + (i + 1) + '" placeholder="0"><p class="field-error"></p></div>' +
        '<button type="button" class="line-del" aria-label="Remove line ' + (i + 1) + '"' + (lines.length < 2 ? ' hidden' : '') + '>×</button>';
      row.querySelector('[data-k="label"]').value = ln.label;
      row.querySelector('[data-k="amount"]').value = ln.amount;
      row.querySelector('.line-del').addEventListener('click', () => { lines.splice(i, 1); renderLines(); update(); });
      lineWrap.appendChild(row);
    });
  }
  lineWrap.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.i === undefined) return;
    lines[+t.dataset.i][t.dataset.k] = t.value;
    clearErr(t);
    update();
  });
  $('#addLine').addEventListener('click', () => {
    lines.push({ label: '', amount: '' });
    renderLines();
    const inputs = lineWrap.querySelectorAll('[data-k="label"]');
    inputs[inputs.length - 1].focus();
    update();
  });

  // ---------- preview ----------
  const frame = $('#preview');
  let timer;
  function renderPreview() {
    const d = collect();
    const doc = frame.contentDocument;
    if (!doc) return;
    const win = frame.contentWindow;
    const y = win.scrollY || 0;
    doc.open(); doc.write(buildEmail(d, { preview: true })); doc.close();
    win.scrollTo(0, y);
    $('#pvTo').textContent = d.email.trim() || '—';
    $('#pvSubject').textContent = SUBJECT;
    $('#totalOut').textContent = money(totalOf(validLines(d)));
  }
  function update() {
    clearTimeout(timer);
    timer = setTimeout(() => { renderPreview(); saveDraft(); }, 120);
  }

  // ---------- draft ----------
  function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collect())); } catch (e) {} }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d) return;
      FIELDS.forEach((k) => { if (typeof d[k] === 'string') $('#f-' + k).value = d[k]; });
      if (Array.isArray(d.lines) && d.lines.length) lines = d.lines.map((l) => ({ label: String(l.label || ''), amount: String(l.amount || '') }));
    } catch (e) {}
  }

  // ---------- validation ----------
  function errEl(input) { const f = input.closest('.field'); return f ? f.querySelector('.field-error') : null; }
  function setErr(input, msg) {
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    const e = errEl(input); if (e) e.textContent = msg || '';
  }
  function clearErr(input) { setErr(input, ''); $('#e-lines').textContent = ''; }
  function validate(d) {
    document.querySelectorAll('.c-form [aria-invalid]').forEach((el) => setErr(el, ''));
    $('#e-lines').textContent = '';
    let first = null;
    const bad = (input, msg) => { setErr(input, msg); if (!first) first = input; };
    if (!d.name.trim()) bad($('#f-name'), 'Enter the customer’s name.');
    if (!d.email.trim()) bad($('#f-email'), 'Enter an email address.');
    else if (!EMAIL_RE.test(d.email.trim())) bad($('#f-email'), 'That email address doesn’t look right.');
    const req = { style: 'Style', dimensions: 'Dimensions', design: 'Design', delivery: 'Delivery', setup: 'Setup' };
    Object.keys(req).forEach((k) => { if (!d[k].trim()) bad($('#f-' + k), req[k] + ' is required.'); });

    let anyValid = false;
    const rows = lineWrap.querySelectorAll('.line');
    d.lines.forEach((l, i) => {
      const lab = rows[i].querySelector('[data-k="label"]'), amt = rows[i].querySelector('[data-k="amount"]');
      const hasL = l.label.trim(), hasA = l.amount.trim();
      if (!hasL && !hasA) return;
      if (!hasL) bad(lab, 'Add a description.');
      if (!hasA) bad(amt, 'Add a price.');
      else if (isNaN(parseAmount(l.amount))) bad(amt, 'Use a number, e.g. 875 or 87.50.');
      if (hasL && hasA && !isNaN(parseAmount(l.amount))) anyValid = true;
    });
    if (!anyValid) {
      $('#e-lines').textContent = 'Add at least one price line (description and amount).';
      if (!first) first = lineWrap.querySelector('input');
    }
    return first;
  }

  // ---------- UI helpers ----------
  function status(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'c-status' + (kind ? ' ' + kind : '');
  }
  function setView(v) {
    $('#layout').dataset.view = v;
    document.querySelectorAll('.c-tabs button').forEach((b) => {
      const on = b.dataset.view === v;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (v === 'preview') renderPreview();
  }
  document.querySelectorAll('.c-tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  function check() {
    const d = collect();
    const bad = validate(d);
    if (bad) {
      setView('edit');
      bad.focus();
      bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      status('Please complete the highlighted fields.', 'error');
      return null;
    }
    return d;
  }

  // ---------- actions ----------
  async function send() {
    const d = check(); if (!d) return;
    if (!configured()) {
      $('#setupBox').open = true;
      setView('edit');
      $('#setupBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
      status('Sending isn’t set up yet — follow “Set up sending”, or use Copy for Gmail for now.', 'error');
      return;
    }
    const html = buildEmail(d);
    if (html.length > 45000) { status('This email is too large to send — shorten the text.', 'error'); return; }
    if (!window.confirm('Send this confirmation to ' + d.name.trim() + ' <' + d.email.trim() + '>?')) return;

    const btn = $('#btnSend');
    btn.disabled = true; btn.textContent = 'Sending…'; status('Sending…');
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS.serviceId, template_id: EMAILJS.templateId, user_id: EMAILJS.publicKey,
          template_params: { to_email: d.email.trim(), to_name: d.name.trim(), subject: SUBJECT, html_body: html, reply_to: 'cuccu771@gmail.com' }
        })
      });
      const body = await res.text();
      if (!res.ok) throw new Error(body || ('HTTP ' + res.status));
      status('Sent to ' + d.email.trim() + ' ✓', 'ok');
    } catch (err) {
      const offline = err instanceof TypeError;
      status(offline ? 'Couldn’t reach the email service — check your connection and try again.' : 'Couldn’t send: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send email';
    }
  }

  async function copyForGmail() {
    const d = check(); if (!d) return;
    const fragment = buildEmail(d, { fragment: true });
    const plain = new DOMParser().parseFromString(fragment, 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
    const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(d.email.trim()) + '&su=' + encodeURIComponent(SUBJECT);
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([fragment], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      })]);
      status('Copied ✓ Paste (Ctrl/⌘+V) into the Gmail message, then press Send.', 'ok');
      const w = window.open(gmail, '_blank', 'noopener');
      if (!w) status('Copied ✓ Allow pop-ups to open Gmail, or open Gmail and paste.', 'ok');
    } catch (err) {
      status('Your browser blocked copying — use Download .html instead.', 'error');
    }
  }

  function download() {
    const d = check(); if (!d) return;
    const blob = new Blob([buildEmail(d)], { type: 'text/html' });
    const a = document.createElement('a');
    const slug = d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';
    a.href = URL.createObjectURL(blob); a.download = 'order-confirmation-' + slug + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status('Downloaded ✓', 'ok');
  }

  // $('#btnSend').addEventListener('click', send);
  $('#btnCopy').addEventListener('click', copyForGmail);
  $('#btnDownload').addEventListener('click', download);
  $('#btnClear').addEventListener('click', () => {
    if (!window.confirm('Clear everything in this form?')) return;
    FIELDS.forEach((k) => { $('#f-' + k).value = ''; });
    lines = [{ label: '', amount: '' }, { label: '', amount: '' }];
    document.querySelectorAll('.c-form [aria-invalid]').forEach((el) => setErr(el, ''));
    renderLines(); update(); status('');
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  });
  FIELDS.forEach((k) => $('#f-' + k).addEventListener('input', (e) => { clearErr(e.target); update(); }));
  $('#composeForm').addEventListener('submit', (e) => e.preventDefault());

  // ---------- init ----------
  const pill = $('#sendState');
  if (configured()) { pill.textContent = 'Ready'; pill.classList.add('ready'); }
  loadDraft();
  renderLines();
  renderPreview();
})();
