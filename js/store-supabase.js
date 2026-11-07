// Cloud backend for the customer data layer (Supabase, plain REST — no library).
// Used automatically when js/config.js has a Supabase URL + anon key.
// Same functions as the local backend in js/store.js.
(function (global) {
  'use strict';
  const BUCKET = 'customer-pictures';
  const SESSION_KEY = 'ts_sb_session';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cfg = () => global.TS_CONFIG || {};
  const base = () => String(cfg().supabaseUrl || '').replace(/\/+$/, '');

  class AuthError extends Error {}

  // ---------- session ----------
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  let session = loadSession();
  function saveSession(s) {
    session = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  const toSession = (j) => ({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
    email: (j.user && j.user.email) || ''
  });
  const tokenCall = (grant, body) => fetch(base() + '/auth/v1/token?grant_type=' + grant, {
    method: 'POST', headers: { apikey: cfg().supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  function friendly(j) {
    const raw = j.error_description || j.msg || j.message || '';
    const m = raw.toLowerCase();
    if (m.indexOf('invalid login') !== -1) return 'Wrong email or password.';
    if (m.indexOf('not confirmed') !== -1) return 'This account’s email isn’t confirmed. In Supabase, add the user with “Auto Confirm User” ticked.';
    if (m.indexOf('signups not allowed') !== -1) return 'No account with that email.';
    return raw || 'Couldn’t sign in.';
  }
  function signIn(email, password) {
    return tokenCall('password', { email: email, password: password })
      .then((r) => r.json().catch(() => ({})).then((j) => { if (!r.ok) throw new Error(friendly(j)); saveSession(toSession(j)); return session; }));
  }
  function signOut() {
    const t = session && session.access_token;
    saveSession(null);
    if (!t) return Promise.resolve();
    return fetch(base() + '/auth/v1/logout', { method: 'POST', headers: { apikey: cfg().supabaseAnonKey, Authorization: 'Bearer ' + t } }).catch(() => {}).then(() => {});
  }
  let refreshing = null;
  function refresh() {
    if (!session || !session.refresh_token) return Promise.reject(new AuthError('Please sign in.'));
    if (!refreshing) {
      refreshing = tokenCall('refresh_token', { refresh_token: session.refresh_token })
        .then((r) => r.json().catch(() => ({})).then((j) => {
          if (!r.ok) { saveSession(null); global.dispatchEvent(new Event('ts-auth-lost')); throw new AuthError('Your session expired — please sign in again.'); }
          saveSession(toSession(j)); return session;
        }))
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function token() {
    if (!session) throw new AuthError('Please sign in.');
    if (session.expires_at - Date.now() / 1000 < 60) await refresh();
    return session.access_token;
  }

  // ---------- request helper (adds auth, retries once after a 401) ----------
  async function api(path, opts) {
    opts = opts || {};
    for (let attempt = 0; attempt < 2; attempt++) {
      const t = await token();
      const headers = Object.assign({ apikey: cfg().supabaseAnonKey, Authorization: 'Bearer ' + t }, opts.headers || {});
      const r = await fetch(base() + path, { method: opts.method || 'GET', headers: headers, body: opts.body });
      if (r.status === 401 && attempt === 0) { await refresh(); continue; }
      if (!r.ok) {
        let msg = '';
        try { const j = await r.clone().json(); msg = j.message || j.error || j.msg || ''; } catch (e) {}
        throw new Error(msg || ('Request failed (' + r.status + ')'));
      }
      return r;
    }
    throw new AuthError('Please sign in.');
  }

  // ---------- row <-> record ----------
  const iso = (v) => (v ? new Date(v).toISOString() : '');
  const fromRow = (r) => ({
    id: r.id, name: r.name || '', fbLink: r.fb_link || '', phone: r.phone || '', email: r.email || '',
    deliveryDate: r.delivery_date || '', categories: r.categories || [], items: r.items || [], detail: r.detail || '', note: r.note || '',
    total: r.total == null ? null : Number(r.total), imageIds: r.image_ids || [], createdAt: iso(r.created_at), updatedAt: iso(r.updated_at)
  });
  const toRow = (c) => ({
    id: c.id, name: c.name, fb_link: c.fbLink || '', phone: c.phone || '', email: c.email || '',
    delivery_date: c.deliveryDate || null, categories: c.categories || [], items: c.items || [], detail: c.detail || '', note: c.note || '',
    total: c.total == null ? null : c.total, image_ids: c.imageIds || [], created_at: c.createdAt, updated_at: c.updatedAt
  });
  const toDataUrl = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsDataURL(blob); });
  const deleteObjects = (paths) => api('/storage/v1/object/' + BUCKET, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths })
  });

  const Cloud = {
    AuthError: AuthError,
    signIn: signIn,
    signOut: signOut,
    hasSession: () => !!session,
    user: () => (session && session.email) || '',

    async list() {
      let out = [], offset = 0;
      const page = 1000;
      for (;;) {
        const rows = await (await api('/rest/v1/customers?select=*&order=created_at.desc&limit=' + page + '&offset=' + offset)).json();
        out = out.concat(rows);
        if (rows.length < page) break;
        offset += page;
      }
      return out.map(fromRow);
    },

    async get(id) {
      if (!UUID_RE.test(String(id))) return undefined;
      const rows = await (await api('/rest/v1/customers?select=*&id=eq.' + encodeURIComponent(id))).json();
      return rows.length ? fromRow(rows[0]) : undefined;
    },

    async getImages(ids, customerId) {
      const out = await Promise.all((ids || []).map(async (id) => {
        try {
          const r = await api('/storage/v1/object/authenticated/' + BUCKET + '/' + customerId + '/' + id);
          return { id: id, customerId: customerId, name: '', dataUrl: await toDataUrl(await r.blob()) };
        } catch (e) { return null; }
      }));
      return out.filter(Boolean);
    },

    async saveCustomer(record, addImages, removeImageIds) {
      for (const im of (addImages || [])) {
        const blob = await (await fetch(im.dataUrl)).blob();
        await api('/storage/v1/object/' + BUCKET + '/' + record.id + '/' + im.id, {
          method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob
        });
      }
      await api('/rest/v1/customers?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(toRow(record))
      });
      if (removeImageIds && removeImageIds.length) {
        try { await deleteObjects(removeImageIds.map((id) => record.id + '/' + id)); } catch (e) { /* leftover files are harmless */ }
      }
      return record;
    },

    async remove(id) {
      const rec = await Cloud.get(id);
      await api('/rest/v1/customers?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      if (rec && rec.imageIds.length) {
        try { await deleteObjects(rec.imageIds.map((i) => id + '/' + i)); } catch (e) {}
      }
    }
  };

  global.TSCloud = Cloud;
})(window);
