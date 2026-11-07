// Data layer for the customer records (used by customers.html and compose.html).
// Everything is stored in this browser's IndexedDB — no server. To move to a
// cloud database later (e.g. Supabase), re-implement these same functions and
// the pages keep working unchanged.
//
// Record: { id, name, fbLink, phone, email, deliveryDate:'YYYY-MM-DD',
//           categories:[], items:[{name,qty,unit,amount}], detail, note,
//           total:number|null, imageIds:[],
//           createdAt, updatedAt }
// Images live in their own store (so the list loads fast):
//           { id, customerId, name, dataUrl }
(function (global) {
  'use strict';
  const DB_NAME = 'twosisters-admin';
  const DB_VER = 1;
  let dbp = null;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        if (!global.indexedDB) { reject(new Error('This browser does not support local storage (IndexedDB).')); return; }
        const r = indexedDB.open(DB_NAME, DB_VER);
        r.onupgradeneeded = () => {
          const db = r.result;
          db.createObjectStore('customers', { keyPath: 'id' });
          db.createObjectStore('images', { keyPath: 'id' }).createIndex('customerId', 'customerId');
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error || new Error('Could not open the database.'));
      });
    }
    return dbp;
  }

  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = (t) => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Transaction aborted')); });

  function uid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = Math.random() * 16 | 0;
      return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
  const str = (v) => (typeof v === 'string' ? v : '');
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  function clean(c) {
    const total = (typeof c.total === 'number' && isFinite(c.total)) ? c.total : null;
    return {
      id: str(c.id) || uid(),
      name: str(c.name).trim(),
      fbLink: safeUrl(str(c.fbLink)),
      phone: str(c.phone).trim(),
      email: str(c.email).trim(),
      deliveryDate: /^\d{4}-\d{2}-\d{2}$/.test(str(c.deliveryDate)) ? c.deliveryDate : '',
      categories: Array.isArray(c.categories) ? c.categories.map(str).map((s) => s.trim()).filter(Boolean) : [],
      items: Array.isArray(c.items) ? c.items.map((it) => ({ name: str(it && it.name).trim(), qty: num(it && it.qty, 1), unit: num(it && it.unit, 0), amount: num(it && it.amount, 0) })).filter((it) => it.name) : [],
      detail: str(c.detail),
      note: str(c.note),
      total: total,
      imageIds: Array.isArray(c.imageIds) ? c.imageIds.map(str).filter(Boolean) : [],
      createdAt: str(c.createdAt) || new Date().toISOString(),
      updatedAt: str(c.updatedAt) || new Date().toISOString()
    };
  }

  const Local = {
    list() { return open().then((db) => req(db.transaction('customers').objectStore('customers').getAll())); },
    get(id) { return open().then((db) => req(db.transaction('customers').objectStore('customers').get(id))); },

    getImages(ids) {
      return open().then((db) => {
        const s = db.transaction('images').objectStore('images');
        return Promise.all((ids || []).map((id) => req(s.get(id)))).then((l) => l.filter(Boolean));
      });
    },

    // Save (create or update) a record plus any images added/removed, atomically.
    saveCustomer(record, addImages, removeImageIds) {
      return open().then((db) => {
        const t = db.transaction(['customers', 'images'], 'readwrite');
        const cs = t.objectStore('customers'), is = t.objectStore('images');
        (addImages || []).forEach((im) => is.put(im));
        (removeImageIds || []).forEach((id) => is.delete(id));
        cs.put(record);
        return done(t).then(() => record);
      });
    },

    // Delete a record and all its pictures.
    remove(id) {
      return open().then((db) => {
        const t = db.transaction(['customers', 'images'], 'readwrite');
        const is = t.objectStore('images');
        t.objectStore('customers').delete(id);
        const k = is.index('customerId').getAllKeys(IDBKeyRange.only(id));
        k.onsuccess = () => k.result.forEach((key) => is.delete(key));
        return done(t);
      });
    }
  };

  // ---------- backups (work on whichever backend is active) ----------
  function exportFrom(be) {
    return be.list().then((list) => Promise.all(list.map((c) => be.getImages(c.imageIds, c.id).then((imgs) => Object.assign({}, c, {
      images: imgs.map((i) => ({ id: i.id, name: i.name || '', dataUrl: i.dataUrl }))
    }))))).then((customers) => ({ app: 'two-sisters-customers', version: 1, exportedAt: new Date().toISOString(), customers: customers }));
  }

  // Merge a backup in: new ids are added, existing ids are replaced only if the
  // backup copy is newer. Returns { added, updated, skipped }.
  function importInto(be, data) {
    if (!data || !Array.isArray(data.customers)) return Promise.reject(new Error('That file isn’t a customer backup.'));
    const out = { added: 0, updated: 0, skipped: 0 };
    return data.customers.reduce((chain, raw) => chain.then(() => {
      const rec = clean(raw || {});
      if (!rec.name) { out.skipped++; return null; }
      const imgs = (Array.isArray(raw.images) ? raw.images : [])
        .filter((i) => i && typeof i.id === 'string' && typeof i.dataUrl === 'string' && i.dataUrl.indexOf('data:image/') === 0)
        .map((i) => ({ id: i.id, customerId: rec.id, name: str(i.name), dataUrl: i.dataUrl }));
      rec.imageIds = imgs.map((i) => i.id);
      return be.get(rec.id).then((existing) => {
        if (existing && existing.updatedAt >= rec.updatedAt) { out.skipped++; return null; }
        return be.saveCustomer(rec, imgs, existing ? existing.imageIds.filter((x) => rec.imageIds.indexOf(x) === -1) : [])
          .then(() => { existing ? out.updated++ : out.added++; });
      });
    }), Promise.resolve()).then(() => out);
  }

  // ---------- public API ----------
  const cfg = () => global.TS_CONFIG || {};
  const cloudOn = () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey && global.TSCloud);
  const impl = () => (cloudOn() ? global.TSCloud : Local);

  const Store = {
    uid: uid,
    get mode() { return cloudOn() ? 'cloud' : 'local'; },
    list: () => impl().list(),
    get: (id) => impl().get(id),
    getImages: (ids, customerId) => impl().getImages(ids, customerId),
    saveCustomer: (rec, add, rem) => impl().saveCustomer(rec, add, rem),
    remove: (id) => impl().remove(id),
    exportAll: () => exportFrom(impl()),
    importAll: (data) => importInto(impl(), data),

    // Moving data saved in this browser up to the cloud database.
    localCount: () => Local.list().then((l) => l.length).catch(() => 0),
    migrateLocalToCloud: () => exportFrom(Local).then((data) => importInto(global.TSCloud, data))
  };

  global.Store = Store;
})(window);
