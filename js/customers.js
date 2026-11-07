// Customers page: list + search/filter + create/edit/delete (CRUD).
(function () {
  'use strict';

  const DEFAULT_CATS = ['Birthday Cake', 'Dessert Table', 'Florist', 'Wedding Cake'];
  const MAX_IMAGES = 10;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const el = {
    q: $('#q'), cat: $('#fCat'), date: $('#fDate'), sort: $('#fSort'), rows: $('#rows'),
    sum: $('#sumText'), hint: $('#hint'), empty: $('#empty'), toast: $('#toast'),
    drawer: $('#drawer'), form: $('#custForm'), title: $('#drawerTitle'), chips: $('#chips'), thumbs: $('#thumbs'),
    btnDelete: $('#btnDelete'), btnCompose: $('#btnCompose'), btnSave: $('#btnSave'),
    viewer: $('#viewer'), viewerImg: $('#viewerImg')
  };
  const F = { name: $('#f-name'), fb: $('#f-fb'), phone: $('#f-phone'), email: $('#f-email'), date: $('#f-date'), total: $('#f-total'), detail: $('#f-detail'), note: $('#f-note') };

  let all = [];
  let editing = null;      // record being edited (null = new)
  let selCats = new Set();
  let imgs = [];           // [{id,name,dataUrl,isNew}]
  let removed = [];        // ids of existing images to delete on save
  let baseline = '';

  // ---------- helpers ----------
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  el.hint.textContent = coarse ? 'Tap a customer to view or edit' : 'Double-click a row to view or edit';

  function money(n) {
    if (n == null) return '';
    const neg = n < 0, v = Math.abs(n);
    return (neg ? '-$' : '$') + v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function parseAmount(raw) {
    const t = String(raw).replace(/[$,\s]/g, '');
    if (t === '') return null;
    return /^-?\d+(\.\d{1,2})?$/.test(t) ? parseFloat(t) : NaN;
  }
  const pad = (n) => (n < 10 ? '0' : '') + n;
  function todayISO(offsetDays) {
    const d = new Date(); d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function normUrl(s) {
    s = s.trim();
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      if (!/^https?:$/.test(u.protocol) || u.hostname.indexOf('.') === -1) return null;
      return u.href;
    } catch (e) { return null; }
  }
  const shortUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

  let toastTimer;
  function toast(msg, isError) {
    el.toast.textContent = msg;
    el.toast.className = 'c-toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.className = 'c-toast'; }, 2600);
  }

  // ---------- categories ----------
  function usedCategories() {
    const set = new Set();
    all.forEach((c) => c.categories.forEach((x) => set.add(x)));
    return set;
  }
  function categoryList(extra) {
    const out = DEFAULT_CATS.slice();
    const more = new Set(usedCategories());
    (extra || []).forEach((x) => more.add(x));
    Array.from(more).filter((x) => out.indexOf(x) === -1).sort((a, b) => a.localeCompare(b)).forEach((x) => out.push(x));
    return out;
  }
  function refreshCategoryFilter() {
    const cur = el.cat.value || 'all';
    el.cat.innerHTML = '<option value="all">All categories</option>' + categoryList().map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
    el.cat.value = categoryList().indexOf(cur) !== -1 ? cur : 'all';
  }

  // ---------- category colors ----------
  const CAT_COLORS = { 'Birthday Cake': '#E56B8A', 'Dessert Table': '#E0A22E', 'Florist': '#5E9B6B', 'Wedding Cake': '#8A63B8' };
  const PALETTE = ['#3F8FC7', '#D9733B', '#2FA3A0', '#B5564B', '#7A8F2E', '#C45FA8', '#6B7BD6', '#9A7B4F'];
  const NEUTRAL = '#8a7c6d';
  function catColor(name) {
    if (CAT_COLORS[name]) return CAT_COLORS[name];
    let h = 0; const s = String(name).toLowerCase();
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function tint(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  const colorStyle = (name) => { const c = catColor(name); return '--c:' + c + ';--t:' + tint(c, 0.16); };
  // an order is drawn in the color of its first category (others show as small dots)
  const primaryColor = (c) => (c.categories.length ? catColor(c.categories[0]) : NEUTRAL);
  const orderStyle = (c) => { const k = primaryColor(c); return '--c:' + k + ';--t:' + tint(k, 0.16); };

  // ---------- calendar ----------
  const cal = { body: $('#calBody'), rows: $('#calRows'), label: $('#calLabel'), sum: $('#calSum'), legend: $('#calLegend'), agenda: $('#calAgenda'), nodate: $('#calNoDate'), root: $('#cal') };
  const now0 = new Date();
  let calY = now0.getFullYear(), calM = now0.getMonth();
  let calSel = todayISO(0);
  const iso = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
  const longDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };

  function calGo(dateISO) {
    const [y, m] = dateISO.split('-').map(Number);
    calY = y; calM = m - 1; calSel = dateISO;
  }

  function renderCalendar() {
    const byDate = {};
    all.filter((c) => c.deliveryDate && matchesBase(c)).forEach((c) => { (byDate[c.deliveryDate] = byDate[c.deliveryDate] || []).push(c); });
    Object.keys(byDate).forEach((k) => byDate[k].sort((a, b) => a.name.localeCompare(b.name)));

    cal.label.textContent = new Date(calY, calM, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const first = new Date(calY, calM, 1), daysInMonth = new Date(calY, calM + 1, 0).getDate();
    const lead = first.getDay(), weeks = Math.ceil((lead + daysInMonth) / 7);
    const today = todayISO(0);
    const MAX_PILLS = 3;
    let html = '', monthCount = 0, monthSum = 0;

    for (let w = 0; w < weeks; w++) {
      html += '<tr>';
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(calY, calM, 1 - lead + w * 7 + dow);
        const ds = iso(d.getFullYear(), d.getMonth(), d.getDate());
        const inMonth = d.getMonth() === calM;
        const evs = byDate[ds] || [];
        if (inMonth) evs.forEach((c) => { monthCount++; monthSum += c.total || 0; });
        const cls = (inMonth ? '' : 'out ') + (ds === today ? 'today ' : '') + (ds === calSel ? 'sel' : '');
        const pills = evs.slice(0, MAX_PILLS).map((c) =>
          '<button type="button" class="cal-ev" data-id="' + esc(c.id) + '" style="' + orderStyle(c) + '" title="' + esc(c.name + (c.categories.length ? ' — ' + c.categories.join(', ') : '')) + '"><span>' + esc(c.name) + '</span>' +
          c.categories.slice(1, 4).map((x) => '<i class="xd" style="--c:' + catColor(x) + '"></i>').join('') + '</button>').join('');
        const more = evs.length > MAX_PILLS ? '<button type="button" class="cal-more" data-day="' + ds + '">+' + (evs.length - MAX_PILLS) + ' more</button>' : '';
        const dots = evs.slice(0, 6).map((c) => '<i style="--c:' + primaryColor(c) + '"></i>').join('') + (evs.length > 6 ? '<b>+' + (evs.length - 6) + '</b>' : '');
        html += '<td class="' + cls.trim() + '" data-day="' + ds + '"><div class="cal-cell">' +
          '<button type="button" class="cal-num" data-day="' + ds + '" aria-label="' + esc(longDate(ds)) + ', ' + evs.length + (evs.length === 1 ? ' order' : ' orders') + '">' + d.getDate() + '</button>' +
          (evs.length ? '<div class="cal-evs">' + pills + more + '</div><div class="cal-dots">' + dots + '</div>' : '') +
          '</div></td>';
      }
      html += '</tr>';
    }
    cal.rows.innerHTML = html;
    cal.sum.textContent = monthCount + (monthCount === 1 ? ' order' : ' orders') + (monthSum ? ' · ' + money(monthSum) : '') + ' this month';

    // legend (also filters)
    cal.legend.innerHTML = categoryList().map((n) =>
      '<button type="button" class="lg' + (el.cat.value === n ? ' on' : '') + '" data-cat="' + esc(n) + '" style="' + colorStyle(n) + '" aria-pressed="' + (el.cat.value === n ? 'true' : 'false') + '"><i></i>' + esc(n) + '</button>').join('');

    // agenda for the selected day
    const dayEvs = byDate[calSel] || [];
    const dsum = dayEvs.reduce((a, c) => a + (c.total || 0), 0);
    cal.agenda.innerHTML =
      '<div class="ag-head"><strong>' + esc(longDate(calSel)) + '</strong><span>' + dayEvs.length + (dayEvs.length === 1 ? ' order' : ' orders') + (dsum ? ' · ' + esc(money(dsum)) : '') + '</span></div>' +
      (dayEvs.length ? dayEvs.map((c) =>
        '<button type="button" class="ag-item" data-id="' + esc(c.id) + '" style="' + orderStyle(c) + '"><span><span class="nm">' + esc(c.name) + '</span><span class="cs">' + (c.categories.length ? esc(c.categories.join(' · ')) : 'No category') + '</span></span>' +
        (c.total == null ? '' : '<span class="tt">' + esc(money(c.total)) + '</span>') + '</button>').join('') : '<p class="ag-empty">No orders on this day.</p>') +
      '<button type="button" class="c-link ag-add" data-add="' + calSel + '">+ Add an order on this day</button>';

    const noDate = all.filter((c) => !c.deliveryDate && matchesBase(c)).length;
    cal.nodate.hidden = !noDate;
    cal.nodate.innerHTML = noDate ? noDate + (noDate === 1 ? ' customer has' : ' customers have') + ' no delivery date and ' + (noDate === 1 ? 'isn’t' : 'aren’t') + ' on the calendar. <button type="button" class="c-link" id="calShowNoDate">Show in table</button>' : '';
  }

  cal.rows.addEventListener('click', (e) => {
    const ev = e.target.closest('.cal-ev');
    if (ev) { e.stopPropagation(); openEdit(ev.dataset.id); return; }
    const td = e.target.closest('td[data-day]');
    if (!td) return;
    calSel = td.dataset.day;
    const d = calSel.split('-').map(Number);
    if (d[1] - 1 !== calM || d[0] !== calY) { calY = d[0]; calM = d[1] - 1; }
    renderCalendar();
  });
  cal.agenda.addEventListener('click', (e) => {
    const item = e.target.closest('.ag-item'); if (item) { openEdit(item.dataset.id); return; }
    const add = e.target.closest('[data-add]'); if (add) openForm(null, { deliveryDate: add.dataset.add });
  });
  cal.legend.addEventListener('click', (e) => {
    const b = e.target.closest('.lg'); if (!b) return;
    el.cat.value = el.cat.value === b.dataset.cat ? 'all' : b.dataset.cat;
    render();
  });
  cal.nodate.addEventListener('click', (e) => {
    if (e.target.id !== 'calShowNoDate') return;
    el.date.value = 'none'; render();
    $('.a-tablewrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  function shiftMonth(n) { const d = new Date(calY, calM + n, 1); calY = d.getFullYear(); calM = d.getMonth(); renderCalendar(); }
  $('#calPrev').addEventListener('click', () => shiftMonth(-1));
  $('#calNext').addEventListener('click', () => shiftMonth(1));
  $('#calToday').addEventListener('click', () => { calGo(todayISO(0)); renderCalendar(); });
  const CAL_KEY = 'ts_cal_open';
  function setCalOpen(open) {
    cal.root.classList.toggle('collapsed', !open);
    $('#calToggle').textContent = open ? 'Hide' : 'Show';
    $('#calToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    try { localStorage.setItem(CAL_KEY, open ? '1' : '0'); } catch (e) {}
  }
  $('#calToggle').addEventListener('click', () => setCalOpen(cal.root.classList.contains('collapsed')));
  try { if (localStorage.getItem(CAL_KEY) === '0') setCalOpen(false); } catch (e) {}

  // ---------- list ----------
  // search + category (shared by the table and the calendar)
  function matchesBase(c) {
    const q = el.q.value.trim().toLowerCase();
    if (q) {
      const hay = [c.name, c.fbLink, c.phone, c.email, c.detail, c.note, c.categories.join(' '), fmtDate(c.deliveryDate), c.total == null ? '' : String(c.total)].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.indexOf(w) !== -1)) return false;
    }
    if (el.cat.value !== 'all' && c.categories.indexOf(el.cat.value) === -1) return false;
    return true;
  }
  function matches(c) {
    if (!matchesBase(c)) return false;
    const d = c.deliveryDate, today = todayISO(0);
    switch (el.date.value) {
      case 'upcoming': if (!d || d < today) return false; break;
      case 'week': if (!d || d < today || d > todayISO(6)) return false; break;
      case 'month': if (!d || d.slice(0, 7) !== today.slice(0, 7)) return false; break;
      case 'past': if (!d || d >= today) return false; break;
      case 'none': if (d) return false; break;
    }
    return true;
  }
  function sorter() {
    switch (el.sort.value) {
      case 'latest': return (a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || '');
      case 'name': return (a, b) => a.name.localeCompare(b.name);
      case 'total': return (a, b) => (b.total == null ? -Infinity : b.total) - (a.total == null ? -Infinity : a.total);
      case 'added': return (a, b) => b.createdAt.localeCompare(a.createdAt);
      default: return (a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999') || a.name.localeCompare(b.name);
    }
  }
  const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';

  function render() {
    renderCalendar();
    const rows = all.filter(matches).sort(sorter());
    const today = todayISO(0);
    el.rows.innerHTML = '';
    rows.forEach((c) => {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.dataset.id = c.id;
      tr.innerHTML =
        '<td class="c-name">' + esc(c.name) + '</td>' +
        '<td class="c-fb">' + (c.fbLink ? '<a href="' + esc(c.fbLink) + '" target="_blank" rel="noopener noreferrer" title="' + esc(c.fbLink) + '">' + esc(shortUrl(c.fbLink)) + '</a>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-cats">' + (c.categories.length ? c.categories.map((x) => '<span class="tag" style="' + colorStyle(x) + '">' + esc(x) + '</span>').join('') : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-date' + (c.deliveryDate && c.deliveryDate < today ? ' past' : '') + '">' + (c.deliveryDate ? esc(fmtDate(c.deliveryDate)) : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-total">' + (c.total == null ? '<span class="muted">—</span>' : esc(money(c.total))) + '</td>' +
        '<td class="c-del"><button type="button" class="a-del" aria-label="Delete ' + esc(c.name) + '" title="Delete">' + TRASH + '</button></td>';
      el.rows.appendChild(tr);
    });

    const sum = rows.reduce((a, c) => a + (c.total || 0), 0);
    el.sum.textContent = rows.length + (rows.length === 1 ? ' customer' : ' customers') + (rows.some((c) => c.total != null) ? ' · ' + money(sum) : '');

    if (!rows.length) {
      el.empty.hidden = false;
      if (!all.length) {
        el.empty.innerHTML = 'No customers yet.<br><button type="button" class="cta-btn" id="emptyNew">+ Add your first customer</button>';
        $('#emptyNew').addEventListener('click', () => openForm(null));
      } else {
        el.empty.innerHTML = 'No customers match your search or filters.';
      }
    } else {
      el.empty.hidden = true;
    }
  }

  function load() {
    return Store.list().then((list) => { all = list; refreshCategoryFilter(); render(); })
      .catch((err) => { el.empty.hidden = false; el.empty.textContent = 'Couldn’t open the customer database: ' + err.message; });
  }

  let qTimer;
  el.q.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(render, 120); });
  [el.cat, el.date, el.sort].forEach((s) => s.addEventListener('change', render));
  $('#btnReset').addEventListener('click', () => { el.q.value = ''; el.cat.value = 'all'; el.date.value = 'all'; el.sort.value = 'soonest'; render(); });

  // row interactions (delegated)
  function rowFrom(t) { const tr = t.closest('tr'); return tr && tr.dataset.id ? tr : null; }
  el.rows.addEventListener('dblclick', (e) => { const tr = rowFrom(e.target); if (tr && !e.target.closest('a,button')) openEdit(tr.dataset.id); });
  el.rows.addEventListener('click', (e) => {
    const del = e.target.closest('.a-del');
    if (del) { e.stopPropagation(); removeCustomer(rowFrom(del).dataset.id); return; }
    if (e.target.closest('a')) return;
    if (coarse) { const tr = rowFrom(e.target); if (tr) openEdit(tr.dataset.id); }
  });
  el.rows.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'TR') openEdit(e.target.dataset.id);
  });

  function removeCustomer(id) {
    const c = all.find((x) => x.id === id);
    if (!c) return Promise.resolve();
    if (!window.confirm('Delete ' + c.name + '?\nThis removes the customer and their pictures and can’t be undone.')) return Promise.resolve();
    return Store.remove(id).then(() => { toast('Deleted ' + c.name); return load(); })
      .catch((err) => toast('Couldn’t delete: ' + err.message, true));
  }

  // ---------- price breakdown (items chosen from the menu) ----------
  const MENU = window.MENU_DATA || [];
  const MENU_BY_NAME = {};
  MENU.forEach((g) => g.items.forEach((i) => { MENU_BY_NAME[i.name] = i; }));
  const CUSTOM = '__custom__';
  const round2 = (n) => Math.round(n * 100) / 100;
  const blankLine = () => ({ sel: '', custom: '', qty: '1', unit: '' });
  let lines = [blankLine()];

  const lineName = (l) => (l.sel === CUSTOM ? l.custom.trim() : l.sel);
  const parseQty = (s) => (/^\d+$/.test(String(s).trim()) && parseInt(s, 10) >= 1 ? parseInt(s, 10) : NaN);
  const touched = (l) => !!(l.sel || l.unit.trim());
  function lineAmount(l) {
    const q = parseQty(l.qty), u = parseAmount(l.unit);
    return (isNaN(q) || u === null || isNaN(u)) ? NaN : round2(q * u);
  }
  const lineValid = (l) => touched(l) && !!lineName(l) && !isNaN(lineAmount(l));
  const toLine = (it) => (MENU_BY_NAME[it.name]
    ? { sel: it.name, custom: '', qty: String(it.qty), unit: String(it.unit) }
    : { sel: CUSTOM, custom: it.name, qty: String(it.qty), unit: String(it.unit) });

  function itemOptions() {
    let out = '<option value="">Choose an item…</option>';
    MENU.forEach((g) => {
      out += '<optgroup label="' + esc(g.group) + '">' + g.items.map((i) =>
        '<option value="' + esc(i.name) + '">' + esc(i.name) + ' — ' + (i.price == null ? 'enter price' : (i.from ? 'from ' : '') + money(i.price) + ' each') + '</option>').join('') + '</optgroup>';
    });
    return out + '<option value="' + CUSTOM + '">Custom item…</option>';
  }
  const ITEM_OPTIONS = itemOptions();

  function refreshLine(row, l) {
    const amt = lineAmount(l);
    row.querySelector('.li-amt b').textContent = isNaN(amt) ? '—' : money(amt);
    const item = MENU_BY_NAME[l.sel], q = parseQty(l.qty), hint = row.querySelector('.li-hint');
    hint.className = 'li-hint';
    if (item && item.min && !isNaN(q) && q < item.min) { hint.textContent = 'Order at least a dozen (' + item.min + ' minimum).'; hint.classList.add('warn'); }
    else if (item && item.from) { hint.textContent = 'Starting price — adjust the price each if needed.'; }
    else if (item && item.price == null) { hint.textContent = 'Enter the price for this item.'; }
    else { hint.textContent = ''; }
    recomputeTotal();
  }

  function recomputeTotal() {
    const valid = lines.filter(lineValid);
    const hint = $('#totalHint');
    if (valid.length) {
      F.total.value = String(round2(valid.reduce((a, l) => a + lineAmount(l), 0)));
      F.total.readOnly = true;
      hint.textContent = 'Calculated from the items above.';
    } else {
      F.total.readOnly = false;
      hint.textContent = 'No items yet — you can type a total by hand.';
    }
  }

  function renderItems() {
    const wrap = $('#items');
    wrap.innerHTML = '';
    lines.forEach((l, i) => {
      const row = document.createElement('div');
      row.className = 'li';
      row.innerHTML =
        '<div class="li-item"><select aria-label="Item ' + (i + 1) + '">' + ITEM_OPTIONS + '</select>' +
        '<input class="li-custom" type="text" placeholder="Describe the item" aria-label="Custom item ' + (i + 1) + '" hidden></div>' +
        '<div class="li-qty"><label>Qty</label><input class="q" type="text" inputmode="numeric" aria-label="Quantity ' + (i + 1) + '"></div>' +
        '<div class="li-each"><label>Price each ($)</label><input class="u" type="text" inputmode="decimal" placeholder="0" aria-label="Price each ' + (i + 1) + '"></div>' +
        '<div class="li-amt"><span>Amount</span><b>—</b></div>' +
        '<button type="button" class="line-del" aria-label="Remove item ' + (i + 1) + '">×</button>' +
        '<p class="li-hint"></p><p class="field-error"></p>';
      const sel = row.querySelector('select'), cus = row.querySelector('.li-custom'), q = row.querySelector('.q'), u = row.querySelector('.u');
      sel.value = l.sel; cus.value = l.custom; q.value = l.qty; u.value = l.unit;
      cus.hidden = l.sel !== CUSTOM;

      sel.addEventListener('change', () => {
        l.sel = sel.value;
        const item = MENU_BY_NAME[l.sel];
        if (item) {
          l.unit = item.price == null ? '' : String(item.price);
          const cur = parseQty(l.qty);
          l.qty = String(item.min ? Math.max(isNaN(cur) ? 0 : cur, item.min) : (isNaN(cur) ? 1 : cur));
        }
        renderItems();
        if (l.sel === CUSTOM) { const c = $('#items').querySelectorAll('.li-custom')[i]; if (c) c.focus(); }
      });
      const live = (input, key) => input.addEventListener('input', () => {
        l[key] = input.value;
        input.setAttribute('aria-invalid', 'false'); row.querySelector('.field-error').textContent = ''; $('#e-items').textContent = '';
        refreshLine(row, l);
      });
      live(cus, 'custom'); live(q, 'qty'); live(u, 'unit');
      row.querySelector('.line-del').addEventListener('click', () => { lines.splice(i, 1); if (!lines.length) lines.push(blankLine()); renderItems(); });
      wrap.appendChild(row);
      refreshLine(row, l);
    });
  }
  $('#btnAddItem').addEventListener('click', () => {
    lines.push(blankLine()); renderItems();
    const sels = $('#items').querySelectorAll('select'); sels[sels.length - 1].focus();
  });

  function validateItems(bad) {
    const rows = $('#items').querySelectorAll('.li');
    lines.forEach((l, i) => {
      if (!touched(l)) return;
      const row = rows[i], err = row.querySelector('.field-error');
      const flag = (input, msg) => { input.setAttribute('aria-invalid', 'true'); err.textContent = err.textContent || msg; bad(input); };
      if (!l.sel) flag(row.querySelector('select'), 'Choose an item (or “Custom item…”).');
      else if (l.sel === CUSTOM && !l.custom.trim()) flag(row.querySelector('.li-custom'), 'Describe the custom item.');
      if (isNaN(parseQty(l.qty))) flag(row.querySelector('.q'), 'Quantity must be a whole number, 1 or more.');
      const u = parseAmount(l.unit);
      if (u === null || isNaN(u)) flag(row.querySelector('.u'), 'Enter the price each, e.g. 3.50.');
    });
  }

  // ---------- form ----------
  function snapshot() {
    return JSON.stringify([F.name.value, F.fb.value, F.phone.value, F.email.value, F.date.value, F.total.value, F.detail.value, F.note.value,
      Array.from(selCats).sort(), imgs.map((i) => i.id), removed, lines]);
  }
  const isDirty = () => snapshot() !== baseline;

  function clearErrors() {
    form_all('[aria-invalid]').forEach((e) => e.setAttribute('aria-invalid', 'false'));
    form_all('.field-error').forEach((e) => { e.textContent = ''; });
  }
  const form_all = (s) => Array.prototype.slice.call(el.form.querySelectorAll(s));
  function fieldErr(input, id, msg) {
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    $('#' + id).textContent = msg || '';
  }

  function renderChips() {
    const list = categoryList(Array.from(selCats));
    el.chips.innerHTML = '';
    list.forEach((name) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chipc' + (selCats.has(name) ? ' on' : '');
      b.setAttribute('aria-pressed', selCats.has(name) ? 'true' : 'false');
      b.textContent = name;
      b.style.setProperty('--c', catColor(name));
      b.addEventListener('click', () => { selCats.has(name) ? selCats.delete(name) : selCats.add(name); renderChips(); });
      el.chips.appendChild(b);
    });
  }
  function addCategory() {
    const input = $('#newCat');
    const v = input.value.trim().replace(/\s+/g, ' ');
    if (!v) return;
    const existing = categoryList(Array.from(selCats)).find((x) => x.toLowerCase() === v.toLowerCase());
    selCats.add(existing || v);
    input.value = '';
    renderChips();
  }
  $('#btnAddCat').addEventListener('click', addCategory);
  $('#newCat').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } });

  function renderThumbs() {
    el.thumbs.innerHTML = '';
    imgs.forEach((im, i) => {
      const d = document.createElement('div');
      d.className = 'thumb';
      const img = document.createElement('img');
      img.src = im.dataUrl; img.alt = im.name || 'Reference picture';
      img.addEventListener('click', () => { el.viewerImg.src = im.dataUrl; el.viewer.showModal(); });
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove picture');
      x.addEventListener('click', () => { if (!im.isNew) removed.push(im.id); imgs.splice(i, 1); renderThumbs(); });
      d.appendChild(img); d.appendChild(x);
      el.thumbs.appendChild(d);
    });
  }
  $('#viewerX').addEventListener('click', () => el.viewer.close());
  el.viewer.addEventListener('click', () => el.viewer.close());

  function compress(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read “' + file.name + '” as a picture.')); };
      img.src = url;
    });
  }
  $('#f-images').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    $('#e-images').textContent = '';
    for (const f of files) {
      if (imgs.length >= MAX_IMAGES) { $('#e-images').textContent = 'Up to ' + MAX_IMAGES + ' pictures per customer.'; break; }
      try { imgs.push({ id: Store.uid(), name: f.name, dataUrl: await compress(f), isNew: true }); }
      catch (err) { $('#e-images').textContent = err.message; }
    }
    renderThumbs();
  });

  function openForm(rec, preset) {
    editing = rec;
    clearErrors();
    el.title.textContent = rec ? 'Customer details' : 'New customer';
    F.name.value = rec ? rec.name : '';
    F.fb.value = rec ? rec.fbLink : '';
    F.phone.value = rec ? rec.phone : '';
    F.email.value = rec ? rec.email : '';
    F.date.value = rec ? rec.deliveryDate : ((preset && preset.deliveryDate) || '');
    F.total.value = rec && rec.total != null ? String(rec.total) : '';
    F.detail.value = rec ? rec.detail : '';
    F.note.value = rec ? rec.note : '';
    $('#newCat').value = '';
    selCats = new Set(rec ? rec.categories : []);
    lines = rec && rec.items && rec.items.length ? rec.items.map(toLine) : [blankLine()];
    imgs = []; removed = [];
    renderChips(); renderThumbs(); renderItems();
    el.btnDelete.hidden = !rec;
    el.btnCompose.hidden = !rec;
    baseline = snapshot();
    el.drawer.showModal();
    el.drawer.querySelector('.drawer-body').scrollTop = 0;
    if (!rec) F.name.focus();
    if (rec && rec.imageIds.length) {
      Store.getImages(rec.imageIds, rec.id).then((list) => {
        if (editing !== rec) return;
        imgs = list.map((i) => ({ id: i.id, name: i.name, dataUrl: i.dataUrl, isNew: false }));
        renderThumbs();
        baseline = snapshot();
      });
    }
  }
  function openEdit(id) {
    Store.get(id).then((rec) => { if (rec) openForm(rec); }).catch((err) => toast('Couldn’t open: ' + err.message, true));
  }
  $('#btnNew').addEventListener('click', () => openForm(null));

  function closeDrawer() { el.drawer.close(); editing = null; }
  function tryClose() {
    if (isDirty() && !window.confirm('Discard your unsaved changes?')) return;
    closeDrawer();
  }
  $('#btnX').addEventListener('click', tryClose);
  $('#btnCancel').addEventListener('click', tryClose);
  el.drawer.addEventListener('cancel', (e) => { e.preventDefault(); tryClose(); });
  el.drawer.addEventListener('click', (e) => { if (e.target === el.drawer) tryClose(); });

  function validate() {
    clearErrors();
    let first = null;
    const bad = (input, id, msg) => { fieldErr(input, id, msg); if (!first) first = input; };
    if (!F.name.value.trim()) bad(F.name, 'e-name', 'Enter the customer’s name.');
    if (F.fb.value.trim() && normUrl(F.fb.value) === null) bad(F.fb, 'e-fb', 'That doesn’t look like a link (try m.me/username).');
    if (F.phone.value.trim() && (!/^[0-9+()\-.\s]+$/.test(F.phone.value.trim()) || F.phone.value.replace(/\D/g, '').length < 7)) bad(F.phone, 'e-phone', 'Enter a valid phone number (at least 7 digits).');
    if (F.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email.value.trim())) bad(F.email, 'e-email', 'That email address doesn’t look right.');
    validateItems((input) => { if (!first) first = input; });
    if (!lines.some(lineValid) && isNaN(parseAmount(F.total.value))) bad(F.total, 'e-total', 'Use a number, e.g. 875 or 87.50.');
    return first;
  }

  function save() {
    const bad = validate();
    if (bad) { bad.focus(); return Promise.resolve(null); }
    const now = new Date().toISOString();
    const fb = F.fb.value.trim() ? normUrl(F.fb.value) : '';
    const itemsOut = lines.filter(lineValid).map((l) => ({ name: lineName(l), qty: parseQty(l.qty), unit: parseAmount(l.unit), amount: lineAmount(l) }));
    const rec = {
      id: editing ? editing.id : Store.uid(),
      name: F.name.value.trim(), fbLink: fb, phone: F.phone.value.trim(), email: F.email.value.trim(),
      deliveryDate: F.date.value, categories: Array.from(selCats), detail: F.detail.value.trim(), note: F.note.value.trim(),
      items: itemsOut, total: itemsOut.length ? round2(itemsOut.reduce((a, it) => a + it.amount, 0)) : parseAmount(F.total.value),
      imageIds: imgs.map((i) => i.id),
      createdAt: editing ? editing.createdAt : now, updatedAt: now
    };
    const wasNew = !editing;
    const add = imgs.filter((i) => i.isNew).map((i) => ({ id: i.id, customerId: rec.id, name: i.name, dataUrl: i.dataUrl }));
    el.btnSave.disabled = true; el.btnSave.textContent = 'Saving…';
    return Store.saveCustomer(rec, add, removed).then(() => {
      baseline = snapshot();
      closeDrawer();
      toast(wasNew ? 'Customer added ✓' : 'Changes saved ✓');
      if (rec.deliveryDate) calGo(rec.deliveryDate);
      return load().then(() => rec);
    }).catch((err) => {
      $('#e-form').textContent = 'Couldn’t save: ' + err.message;
      return null;
    }).finally(() => { el.btnSave.disabled = false; el.btnSave.textContent = 'Save'; });
  }
  el.form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  form_all('input, textarea').forEach((i) => i.addEventListener('input', () => {
    if (i.getAttribute('aria-invalid') === 'true') i.setAttribute('aria-invalid', 'false');
    const e = i.closest('.field') && i.closest('.field').querySelector('.field-error'); if (e) e.textContent = '';
  }));

  el.btnDelete.addEventListener('click', () => {
    if (!editing) return;
    const c = editing;
    if (!window.confirm('Delete ' + c.name + '?\nThis removes the customer and their pictures and can’t be undone.')) return;
    Store.remove(c.id).then(() => { closeDrawer(); toast('Deleted ' + c.name); return load(); })
      .catch((err) => { $('#e-form').textContent = 'Couldn’t delete: ' + err.message; });
  });
  el.btnCompose.addEventListener('click', () => {
    if (!editing) return;
    const id = editing.id;
    const go = () => { window.location.href = 'compose.html?customer=' + encodeURIComponent(id); };
    if (isDirty()) save().then((rec) => { if (rec) go(); }); else go();
  });

  // ---------- backup ----------
  $('#btnExport').addEventListener('click', () => {
    Store.exportAll().then((data) => {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'two-sisters-customers-' + todayISO(0) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Backup downloaded (' + data.customers.length + ' customers)');
    }).catch((err) => toast('Couldn’t export: ' + err.message, true));
  });
  $('#btnImport').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then((t) => Store.importAll(JSON.parse(t))).then((r) => {
      toast('Imported: ' + r.added + ' new, ' + r.updated + ' updated, ' + r.skipped + ' skipped');
      return load();
    }).catch((err) => toast('Couldn’t import: ' + err.message, true));
  });

  // Ask the browser not to clear this data when it's short on space.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- where the data lives ----------
  const note = $('#storageNote');
  if (Store.mode === 'cloud') {
    note.innerHTML = 'Saved in your <b>cloud database</b> — everyone signed in sees the same list, on any device. Backups are still a good idea.';

    // Offer to move anything saved in this browser before the cloud was switched on.
    const MIG_KEY = 'ts_local_migrated';
    let migrated = false; try { migrated = localStorage.getItem(MIG_KEY) === '1'; } catch (e) {}
    if (!migrated) {
      Store.localCount().then((n) => {
        if (!n) return;
        $('#migrateText').textContent = n + (n === 1 ? ' customer is' : ' customers are') + ' saved only in this browser. Upload ' + (n === 1 ? 'it' : 'them') + ' to the cloud?';
        $('#migrate').hidden = false;
      });
      const done = () => { try { localStorage.setItem(MIG_KEY, '1'); } catch (e) {} $('#migrate').hidden = true; };
      $('#btnMigrateSkip').addEventListener('click', done);
      $('#btnMigrate').addEventListener('click', () => {
        const b = $('#btnMigrate'); b.disabled = true; b.textContent = 'Uploading…';
        Store.migrateLocalToCloud().then((r) => { toast('Uploaded: ' + r.added + ' new, ' + r.updated + ' updated, ' + r.skipped + ' already there'); done(); return load(); })
          .catch((err) => { toast('Couldn’t upload: ' + err.message, true); b.disabled = false; b.textContent = 'Upload them'; });
      });
    }
  } else {
    note.innerHTML = 'Customer data is saved in <b>this browser only</b> (nothing is uploaded). Make regular backups, or connect the cloud database to share one list between devices.';
  }

  load();
})();
