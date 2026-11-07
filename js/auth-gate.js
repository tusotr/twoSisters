// Sign-in screen for the admin pages. Does nothing unless the cloud database is
// configured (js/config.js). Shows a full-screen login until there is a session,
// and adds a "Sign out" button to the header once signed in.
(function () {
  'use strict';
  const cfg = window.TS_CONFIG || {};
  if (!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.TSCloud)) return;

  const css = '#tsGate{position:fixed;inset:0;z-index:9999;background:#FAF3E6;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Manrope,Arial,sans-serif;color:#2E2620}' +
    '#tsGate form{width:100%;max-width:360px;background:#fff;border:1px solid rgba(46,38,32,.14);border-radius:20px;padding:26px 22px;display:grid;gap:12px;text-align:center}' +
    '#tsGate img{height:84px;width:auto;margin:0 auto}#tsGate h1{font:600 1.35rem Fraunces,Georgia,serif;color:#3E2A3B;margin:0}' +
    '#tsGate p{margin:0;font-size:.85rem;color:#8a7c6d}#tsGate label{display:grid;gap:5px;text-align:left;font-size:.8rem;font-weight:700;color:#3E2A3B}' +
    '#tsGate input{font:inherit;font-size:.95rem;padding:11px 13px;border:1px solid rgba(46,38,32,.14);border-radius:10px;width:100%;box-sizing:border-box}' +
    '#tsGate input:focus{outline:none;border-color:#4F5A38;box-shadow:0 0 0 3px rgba(79,90,56,.15)}' +
    '#tsGate button{font:700 .95rem Manrope,Arial,sans-serif;background:#4F5A38;color:#FAF3E6;border:0;border-radius:999px;padding:13px;cursor:pointer}' +
    '#tsGate button[disabled]{opacity:.6}#tsGate .err{color:#8A3A2E;font-weight:600;min-height:1.2em}' +
    '.tsout{background:none;border:0;cursor:pointer;font:inherit;font-size:.85rem;font-weight:600;color:#8a7c6d;padding:0}';

  function showGate(message) {
    if (document.getElementById('tsGate')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const g = document.createElement('div');
    g.id = 'tsGate';
    g.innerHTML = '<form novalidate><img src="images/logo.png" alt="Two Sisters Tampa"><h1>Staff sign in</h1><p>Customer records are private.</p>' +
      '<label>Email<input type="email" name="email" autocomplete="username" required></label>' +
      '<label>Password<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<p class="err" role="alert"></p><button type="submit">Sign in</button></form>';
    document.body.appendChild(g);
    document.documentElement.style.overflow = 'hidden';
    const f = g.querySelector('form'), err = g.querySelector('.err'), btn = g.querySelector('button');
    if (message) err.textContent = message;
    f.elements.email.focus();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = f.elements.email.value.trim(), pw = f.elements.password.value;
      if (!email || !pw) { err.textContent = 'Enter your email and password.'; return; }
      btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
      TSCloud.signIn(email, pw).then(() => location.reload())
        .catch((ex) => { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Sign in'; });
    });
  }

  function addSignOut() {
    const host = document.querySelector('.a-nav') || document.querySelector('.c-top');
    if (!host || host.querySelector('.tsout')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tsout'; b.textContent = 'Sign out'; b.title = 'Signed in as ' + TSCloud.user();
    b.addEventListener('click', () => TSCloud.signOut().then(() => location.reload()));
    if (!document.getElementById('tsGateCss')) { const st = document.createElement('style'); st.id = 'tsGateCss'; st.textContent = css; document.head.appendChild(st); }
    host.appendChild(b);
  }

  window.addEventListener('ts-auth-lost', () => showGate('Your session expired — please sign in again.'));
  document.addEventListener('DOMContentLoaded', () => { TSCloud.hasSession() ? addSignOut() : showGate(); });
})();
