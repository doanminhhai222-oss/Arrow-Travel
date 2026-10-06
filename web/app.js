import { buildItinerary, effectiveRules, filterPlaces, STYLE_TYPES, styleList, distanceKm, travelMinutes, toMin, toHHMM, daysBetween, addDays } from '../src/scheduler.js';
import { estimateCost, hotelsFor, defaultHotel, defaultFlight } from '../src/costing.js';
import { transportOptions } from '../src/transport.js';
import { placeDetailHtml, sceneSvg } from '../src/detail.js';

// <DATA>
const [DATA, RULES, OPTS, TRANSPORT] = await Promise.all(['da-nang', 'rules', 'travel-options', 'transport'].map((n) => fetch('../data/' + n + '.json').then((r) => r.json())));
// </DATA>

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const vnd = (n) => (n ? n.toLocaleString('vi-VN') + ' đ' : 'Miễn phí');
const money = (n) => n.toLocaleString('vi-VN') + ' đ';
const dur = (m) => (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '') : m + 'p');
const iso = (d) => d.toISOString().slice(0, 10);
const fmtDate = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
const fmtTime = (t) => new Date(t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

/* ---------- Lưu trữ trên thiết bị (không có tài khoản, không có máy chủ) ---------- */
const STORE_KEY = 'arrow-travel-v1';
function seedStore() {
  const now = Date.now();
  return { trips: [], prefs: {}, notifs: [
    { id: 'n1', title: 'Chào mừng đến Arrow Travel', body: 'Chọn Tạo mới để xếp lịch trình đầu tiên cho chuyến đi Đà Nẵng.', at: now, read: false },
    { id: 'n2', title: 'Dữ liệu đang là bản mẫu', body: 'Giá vé, giờ mở cửa, khách sạn và vé máy bay là số liệu mẫu. Hãy kiểm tra lại trước khi đặt thật.', at: now - 1, read: false },
  ] };
}
function loadStore() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.trips)) return { prefs: {}, notifs: [], ...s }; } catch (e) { /* bỏ qua, dùng bộ nhớ tạm */ }
  return seedStore();
}
let store = loadStore();
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* trình duyệt chặn lưu */ } }
function addNotif(title, body) { store.notifs.unshift({ id: 'n' + Date.now().toString(36), title, body, at: Date.now(), read: false }); persist(); updateBadge(); }
function updateBadge() {
  const n = store.notifs.filter((x) => !x.read).length;
  $('badge').hidden = n === 0; $('badge').textContent = n > 9 ? '9+' : String(n);
}

/* ---------- Trạng thái lịch trình đang soạn ---------- */
let aud = 'nhom_ban', plan = null, rule = null, pool = [], swapOpen = null, undoStack = [];
let finalized = false, originId = 'ho-chi-minh', flightId = null, hotelId = null, transportId = null, currentTripId = null, savedOk = false;
let armedTrip = null, armedClear = false;

/* ---------- Điều hướng ---------- */
const SCREENS = ['home', 'create', 'trips', 'notifs', 'account'];
function go(name) {
  armedTrip = null; armedClear = false;
  SCREENS.forEach((s) => { $('scr-' + s).hidden = s !== name; });
  document.querySelectorAll('.tab').forEach((t) => { if (t.dataset.go === name) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  if (name === 'home') renderHome();
  if (name === 'trips') renderTrips();
  if (name === 'account') renderAccount();
  if (name === 'notifs') { renderNotifs(); store.notifs.forEach((n) => { n.read = true; }); persist(); updateBadge(); }
  window.scrollTo(0, 0);
}

/* ---------- Form ---------- */
function setAud(v) { aud = v; $('aud').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v))); }
function setStyles(arr) { $('styles').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(arr.includes(x.dataset.v)))); }
function applyForm(p = {}) {
  const t = { audience: store.prefs.audience || 'nhom_ban', budget: store.prefs.budget || 'vua_phai', people: 2, hasKids: false, hasElderly: false, styles: ['thien_nhien'], days: 3, ...p };
  const start = t.startDate || addDays(iso(new Date()), 7);
  $('start').value = start; $('end').value = t.endDate || addDays(start, t.days - 1);
  $('people').value = t.people; $('budget').value = t.budget;
  $('kids').checked = !!t.hasKids || t.audience === 'gia_dinh'; $('elder').checked = !!t.hasElderly;
  setAud(t.audience); setStyles(t.styles);
}
function openCreate(p, runNow) { applyForm(p); go('create'); if (runNow) run(); }

$('aud').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  setAud(b.dataset.v);
  if (aud === 'gia_dinh') $('kids').checked = true;
  run();
});
$('styles').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  run();
});
['kids', 'elder', 'budget'].forEach((id) => $(id).addEventListener('change', run));
$('form').addEventListener('submit', (e) => { e.preventDefault(); run(); });

function run() {
  const trip = { destination: 'Đà Nẵng', startDate: $('start').value, endDate: $('end').value, people: +$('people').value || 1,
    budget: $('budget').value, audience: aud, hasKids: $('kids').checked, hasElderly: $('elder').checked,
    styles: [...document.querySelectorAll('#styles [aria-pressed="true"]')].map((x) => x.dataset.v) };
  if (!trip.startDate || !trip.endDate || trip.endDate < trip.startDate) { $('out').innerHTML = '<div class="warn">Ngày về phải sau ngày đi.</div>'; return; }
  plan = buildItinerary(trip, DATA, RULES);
  rule = effectiveRules(RULES[aud], trip);
  pool = filterPlaces(DATA.places, trip).places;
  plan.days.forEach((d) => d.items.forEach((i) => { i.dur = i.duration; }));
  swapOpen = null; undoStack = []; finalized = false; flightId = null; hotelId = null; transportId = null; currentTripId = null; savedOk = false;
  render();
}

/* ---------- Tính lại giờ sau khi xoá / đổi điểm ---------- */
function retime(day) {
  let clock = toMin(rule.start), last = null, km = 0;
  for (const it of day.items) {
    let tr = null, start = clock;
    if (it.place && last) { const k = distanceKm(last, it.place); tr = { km: +k.toFixed(1), min: travelMinutes(k) }; start = clock + tr.min; km += tr.km; }
    if (it.place) {
      if (it.place.slot === 'evening') start = Math.max(start, 17 * 60);
      start = Math.max(start, toMin(it.place.open));
    }
    it.time = toHHMM(start); it.end = toHHMM(start + it.dur); it.travel = tr;
    it.late = !!it.place && (start + it.dur > toMin(it.place.close) || start + it.dur > toMin(rule.end));
    clock = start + it.dur;
    if (it.place) last = it.place;
  }
  day.totalKm = +km.toFixed(1);
  day.placeCount = day.items.filter((i) => i.place).length;
}
function used() { return new Set(plan.days.flatMap((d) => d.items.filter((i) => i.place).map((i) => i.place.id))); }
function suggestions(di, ii) {
  const day = plan.days[di], cur = day.items[ii], prev = day.items.slice(0, ii).reverse().find((i) => i.place);
  const taken = used(), isFood = cur.kind === 'meal';
  return pool.filter((p) => !taken.has(p.id) && (isFood ? p.type === 'food' && p.meal === cur.place.meal : !(p.type === 'food' && p.meal)))
    .map((p) => {
      const k = prev ? distanceKm(prev.place, p) : 0;
      let s = 0; const why = [];
      if (cur.place.type === p.type) { s += 3; why.push('cùng loại'); }
      if (cur.place.slot === p.slot) { s += 2; why.push('cùng khung giờ'); }
      if (styleList(plan.trip).some((st) => (STYLE_TYPES[st] || []).includes(p.type))) { s += 2; why.push('hợp phong cách'); }
      if (rule.preferTypes && rule.preferTypes.includes(p.type)) { s += 1; why.push('hợp ' + plan.audienceLabel.toLowerCase()); }
      if (prev) { s -= k / 5; why.push(k.toFixed(1) + ' km từ điểm trước'); }
      return { p, s, why: why.join(' · ') };
    }).sort((a, b) => b.s - a.s).slice(0, 4);
}
function snap() {
  undoStack.push({ msg: null, days: plan.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) })) });
  if (undoStack.length > 20) undoStack.shift();
}

/* ---------- Vẽ lịch trình ---------- */
function render() {
  let h = '';
  if (plan.warnings.length) h += '<div class="warn">' + plan.warnings.map(esc).join('<br>') + '</div>';
  h += '<div class="sum"><span>' + esc(plan.audienceLabel) + '</span><span>' + plan.days.length + ' ngày</span><span>' + plan.trip.people + ' người</span></div>';
  if (undoStack.length) h += '<div class="undo"><span>' + esc(undoStack[undoStack.length - 1].msg || '') + '</span><button data-act="undo" type="button">Hoàn tác</button></div>';
  plan.days.forEach((d, di) => {
    h += '<section class="panel day"><h2>Ngày ' + d.dayIndex + ' · ' + d.date.split('-').reverse().join('/') + '</h2><div class="meta">' + d.placeCount + ' điểm · ' + d.totalKm + ' km</div>';
    if (!d.items.length) h += '<p class="hint">Ngày này đang trống.</p>';
    d.items.forEach((it, ii) => {
      const isOpen = swapOpen && swapOpen.d === di && swapOpen.i === ii;
      const at = ' data-d="' + di + '" data-i="' + ii + '"';
      if (it.travel) h += '<div class="drive">🚗 ' + it.travel.km + ' km · ' + it.travel.min + 'p</div>';
      const name = it.place ? '<button type="button" class="nm" data-act="detail" data-d="' + di + '" data-id="' + it.place.id + '">' + esc(it.place.name) + '</button>' : esc(it.note);
      const sub = it.place ? dur(it.dur) + ' · ' + vnd(it.place.price) + (it.kind === 'meal' ? ' · ' + esc(it.note) : '') : dur(it.dur);
      const acts = '<div class="acts">' + (it.place ? '<button type="button" data-act="swap"' + at + '>' + (isOpen ? 'Đóng gợi ý' : 'Đổi địa điểm') + '</button>' : '') + '<button type="button" class="del" data-act="del"' + at + '>Xoá</button></div>';
      h += '<div class="leg ' + it.kind + '"><div class="t">' + it.time + '</div><div><div class="n">' + name + '</div><div class="s">' + sub + '</div>' + (it.late ? '<div class="late">Có thể quá giờ đóng cửa hoặc giờ kết thúc ngày</div>' : '') + acts + '</div></div>';
      if (isOpen) {
        const sg = suggestions(di, ii);
        h += '<div class="sug"><h3>Đề xuất thay thế</h3>' + (sg.length ? sg.map((x, n) => '<button type="button" class="pick" data-act="pick"' + at + ' data-id="' + x.p.id + '">' + (n === 0 ? '<span class="star">TỐT NHẤT</span>' : '') + esc(x.p.name) + '<span class="why">' + dur(x.p.duration) + ' · ' + vnd(x.p.price) + ' · ' + esc(x.why) + '</span></button>').join('') : '<span class="hint">Không còn địa điểm phù hợp để thay.</span>') + '</div>';
      }
    });
    h += '</section>';
  });
  h += finalHtml();
  $('out').innerHTML = h;
}

/* ---------- Bước 2: chốt lịch trình, vé máy bay, khách sạn, chi phí ---------- */
const curOrigin = () => OPTS.origins.find((o) => o.id === originId) || null;
function ensureChoices() {
  const o = curOrigin(), t = plan.trip;
  if (o && !o.flights.some((f) => f.id === flightId)) { const f = defaultFlight(o.flights, t); flightId = f ? f.id : null; }
  const hs = hotelsFor(OPTS.hotels, t);
  if (!hs.some((x) => x.id === hotelId)) hotelId = hs.length ? defaultHotel(hs, t).id : null;
}
function calc() {
  ensureChoices();
  const t = plan.trip, nDays = daysBetween(t.startDate, t.endDate), o = curOrigin(), hs = hotelsFor(OPTS.hotels, t);
  const flight = o ? o.flights.find((f) => f.id === flightId) || null : null;
  const hotel = hs.find((x) => x.id === hotelId) || null;
  const tp = transportOptions({ trip: t, plan, hotel: nDays > 1 ? hotel : null, flight, modes: TRANSPORT.modes, airport: TRANSPORT.airport, nDays });
  if (!tp.options.some((x) => x.id === transportId && x.suitable)) transportId = tp.defaultId;
  const selected = tp.options.find((x) => x.id === transportId) || null;
  return { tp, selected, cost: estimateCost({ trip: t, plan, flight, hotel, transport: selected }) };
}
function finalHtml() {
  if (!finalized) {
    return '<div class="panel final"><button class="go" type="button" data-act="final">Chốt lịch trình của tôi</button><p class="hint" style="margin-top:8px">Sau khi chốt, chọn nơi khởi hành, vé máy bay, khách sạn và xem tổng chi phí dự kiến. Bạn vẫn đổi hoặc xoá điểm ở trên được, chi phí tự cập nhật.</p></div>';
  }
  const { tp, cost } = calc();
  const t = plan.trip, o = curOrigin(), hs = hotelsFor(OPTS.hotels, t);
  let h = '<section class="panel final"><h2>Chuyến đi của tôi</h2><p class="hint">Giá bên dưới là giá mẫu để ước tính, chưa đặt chỗ.</p>';
  h += '<label for="origin" style="margin-top:12px">Khởi hành từ</label><select id="origin">' + OPTS.origins.map((x) => '<option value="' + x.id + '"' + (x.id === originId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '<option value="none"' + (originId === 'none' ? ' selected' : '') + '>Tự túc (đã ở Đà Nẵng hoặc đi đường bộ)</option></select>';
  if (o) {
    h += '<h3>Vé máy bay khứ hồi</h3><div class="opts">' + o.flights.map((f) =>
      '<button type="button" class="opt" data-act="flight" data-id="' + f.id + '" aria-pressed="' + (f.id === flightId) + '"><b>' + esc(f.label) + '</b><span>Đi ' + f.depart + ' · về ' + f.back + ' · ' + f.duration + '</span><span>' + esc(f.baggage) + '</span><span class="pr">' + money(f.priceRoundTrip) + '/người</span></button>').join('') + '</div>';
  }
  if (cost.nights > 0) {
    h += '<h3>Khách sạn · ' + cost.nights + ' đêm</h3><div class="opts">' + hs.map((x) => {
      const rooms = Math.ceil(t.people / x.capacity);
      return '<button type="button" class="opt" data-act="hotel" data-id="' + x.id + '" aria-pressed="' + (x.id === hotelId) + '"><b>' + esc(x.name) + '</b><span>' + x.stars + ' sao · ' + esc(x.area) + '</span><span>' + rooms + ' phòng, tối đa ' + x.capacity + ' người/phòng</span><span class="pr">' + money(x.pricePerRoom) + '/phòng/đêm</span></button>';
    }).join('') + '</div>';
  }
  h += '<h3>Phương tiện di chuyển</h3><p class="hint" style="margin-bottom:8px">Tính theo ' + tp.totalKm + ' km trên ' + tp.legs.length + ' chặng (giữa các điểm' + (cost.nights > 0 ? ', từ và về khách sạn' : '') + (originId !== 'none' ? ', sân bay' : '') + ').</p><div class="opts">' +
    tp.options.map((x) => '<button type="button" class="opt" data-act="transport" data-id="' + x.id + '" aria-pressed="' + (x.id === transportId) + '"' + (x.suitable ? '' : ' disabled aria-disabled="true"') + '>' +
      (x.tags.length ? '<span class="pill">' + x.tags.map(esc).join(' · ') + '</span>' : '') + '<b>' + esc(x.name) + '</b><span>' + esc(x.brand) + '</span><span>' + x.vehicles + ' xe' + (x.crowded && x.suitable ? ' (nhiều xe, nên chọn xe lớn)' : '') + ' · ' + esc(x.note) + '</span>' +
      (x.suitable ? '<span class="pr">' + money(x.total) + ' · ' + money(x.perPerson) + '/người</span>' : '<span class="late">' + esc(x.reason) + '</span>') + '</button>').join('') +
    '</div><p class="hint">Giá mẫu tính theo quãng đường, chưa gồm phụ thu giờ cao điểm, mưa, phí cầu đường. Mở app Grab hoặc Xanh SM để xem giá thật.</p>';
  h += '<h3>Tổng chi phí dự kiến</h3><div class="cost">' + cost.lines.map((l) => '<div class="cl"><span>' + esc(l.label) + '<small>' + esc(l.note) + '</small></span><b>' + money(l.amount) + '</b></div>').join('') +
    '<div class="cl tot"><span>Tổng cộng</span><b>' + money(cost.total) + '</b></div><div class="cl"><span>Bình quân mỗi người</span><b>' + money(cost.perPerson) + '</b></div></div>';
  h += '<p class="hint">Chưa gồm mua sắm, quà, chi phí phát sinh. Ăn uống tính theo mức ' + ({ tiet_kiem: 'tiết kiệm', vua_phai: 'vừa phải', thoai_mai: 'thoải mái' })[t.budget] + '.</p>';
  h += '<button class="go" type="button" data-act="save" style="margin-top:16px">' + (currentTripId ? 'Cập nhật lịch trình đã lưu' : 'Lưu vào Lịch trình của tôi') + '</button>';
  if (savedOk) h += '<p class="saved-ok">Đã lưu. Xem trong tab Lịch trình của tôi.</p>';
  return h + '</section>';
}

function saveTrip() {
  const t = plan.trip, { cost } = calc();
  const rec = { id: currentTripId || 't' + Date.now().toString(36), savedAt: Date.now(), trip: t, originId, flightId, hotelId, transportId, total: cost.total,
    days: plan.days.map((d) => ({ date: d.date, dayIndex: d.dayIndex, items: d.items.map((i) => ({ kind: i.kind, placeId: i.place ? i.place.id : null, note: i.note || '', dur: i.dur })) })) };
  const idx = store.trips.findIndex((x) => x.id === rec.id);
  if (idx >= 0) store.trips[idx] = rec;
  else { store.trips.unshift(rec); addNotif('Đã lưu lịch trình', t.destination + ' ' + daysBetween(t.startDate, t.endDate) + ' ngày (' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ') đã nằm trong Lịch trình của tôi.'); }
  currentTripId = rec.id; savedOk = true; persist();
}
function openTrip(id) {
  const s = store.trips.find((x) => x.id === id); if (!s) return;
  const t = s.trip;
  applyForm({ ...t, styles: styleList(t) });
  rule = effectiveRules(RULES[t.audience], t); pool = filterPlaces(DATA.places, t).places;
  plan = { trip: t, audienceLabel: RULES[t.audience].label, warnings: [], days: s.days.map((d) => ({ date: d.date, dayIndex: d.dayIndex,
    items: d.items.map((i) => ({ kind: i.kind, note: i.note, dur: i.dur, place: i.placeId ? DATA.places.find((p) => p.id === i.placeId) : null })).filter((i) => i.place || !i.kind || i.kind === 'break') })) };
  plan.days.forEach(retime);
  finalized = true; originId = s.originId; flightId = s.flightId; hotelId = s.hotelId; transportId = s.transportId || null; currentTripId = id; savedOk = true; swapOpen = null; undoStack = [];
  go('create'); render();
}

/* ---------- Thao tác trong màn Tạo mới ---------- */
$('out').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const act = b.dataset.act, di = +b.dataset.d, ii = +b.dataset.i;
  if (act === 'detail') { openDetail(di, b.dataset.id); return; }
  if (act === 'final') { finalized = true; render(); const f = document.querySelector('section.final'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (act === 'flight') { flightId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'hotel') { hotelId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'transport') { transportId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'save') { saveTrip(); render(); return; }
  if (act === 'swap') { swapOpen = swapOpen && swapOpen.d === di && swapOpen.i === ii ? null : { d: di, i: ii }; render(); return; }
  if (act === 'undo') { const s = undoStack.pop(); plan.days = s.days; swapOpen = null; savedOk = false; render(); return; }
  snap();
  const day = plan.days[di];
  if (act === 'del') {
    undoStack[undoStack.length - 1].msg = 'Đã xoá "' + (day.items[ii].place ? day.items[ii].place.name : day.items[ii].note) + '".';
    day.items.splice(ii, 1);
  }
  if (act === 'pick') {
    const p = pool.find((x) => x.id === b.dataset.id), old = day.items[ii];
    undoStack[undoStack.length - 1].msg = 'Đã đổi "' + old.place.name + '" sang "' + p.name + '".';
    day.items[ii] = { ...old, place: p, dur: old.kind === 'meal' && /trưa/.test(old.note || '') ? Math.max(p.duration, rule.lunchMin) : p.duration };
  }
  swapOpen = null; savedOk = false; retime(day); render();
});
$('out').addEventListener('change', (e) => {
  if (e.target.id !== 'origin') return;
  originId = e.target.value; flightId = null; savedOk = false; render();
  $('origin').focus();
});

/* ---------- Chi tiết địa điểm ---------- */
const sheet = $('sheet');
let lastFocus = null;
function closeSheet() { sheet.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function openDetail(di, id) {
  const dayPlaces = plan.days[di].items.filter((i) => i.place).map((i) => i.place);
  const place = dayPlaces.find((p) => p.id === id);
  if (!place) return;
  lastFocus = document.activeElement;
  $('sheetBody').innerHTML = placeDetailHtml(place, dayPlaces);
  sheet.hidden = false; $('sheetClose').focus();
}
$('sheetClose').addEventListener('click', closeSheet);
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

/* ---------- Màn hình Khám phá ---------- */
const DESTS = [{ name: 'Đà Nẵng', ok: true }, { name: 'Hội An' }, { name: 'Hà Nội' }, { name: 'Đà Lạt' }, { name: 'Nha Trang' }, { name: 'Phú Quốc' }];
const PRESETS = {
  plan: {},
  gia_dinh: { audience: 'gia_dinh', hasKids: true, people: 4, days: 2, budget: 'vua_phai', styles: ['thien_nhien', 'van_hoa'] },
  cap_doi: { audience: 'cap_doi', people: 2, days: 3, budget: 'thoai_mai', styles: ['thu_gian', 'am_thuc'] },
  nhom_ban: { audience: 'nhom_ban', people: 5, days: 2, budget: 'vua_phai', styles: ['check_in', 'am_thuc'] },
  mot_minh: { audience: 'mot_minh', people: 1, days: 2, budget: 'tiet_kiem', styles: ['van_hoa'] },
  am_thuc: { styles: ['am_thuc'] },
  van_hoa: { styles: ['van_hoa'] },
};
const SUGGESTED = [
  { key: 'gia_dinh', scene: 'beach', title: 'Đà Nẵng 2 ngày cho gia đình', sub: '4 người · có trẻ nhỏ · nghỉ trưa dài' },
  { key: 'cap_doi', scene: 'cafe', title: 'Đà Nẵng 3 ngày cho cặp đôi', sub: '2 người · hoàng hôn và quán yên tĩnh' },
  { key: 'nhom_ban', scene: 'wheel', title: 'Đà Nẵng 2 ngày cho nhóm bạn', sub: '5 người · check-in và ăn uống' },
];
function renderHome() {
  $('homeCards').innerHTML = SUGGESTED.map((s) => '<button type="button" class="pcard" data-preset="' + s.key + '">' + sceneSvg({ scene: s.scene, name: s.title }) + '<div><b>' + esc(s.title) + '</b><span>' + esc(s.sub) + '</span></div></button>').join('');
  const r = store.trips.slice(0, 5);
  $('homeRecent').innerHTML = r.length ? '<div class="sec-h"><h2>Đã lưu gần đây</h2><button type="button" data-go="trips">Tất cả</button></div><div class="cards" style="margin-top:12px">' +
    r.map((s) => '<button type="button" class="pcard" style="width:220px" data-trip="' + s.id + '"><div><b>' + esc(s.trip.destination) + ' · ' + daysBetween(s.trip.startDate, s.trip.endDate) + ' ngày</b><span>' + fmtDate(s.trip.startDate) + ' – ' + fmtDate(s.trip.endDate) + ' · ' + esc(RULES[s.trip.audience].label) + '</span><span style="display:block;color:var(--fg);font-weight:600">' + money(s.total) + '</span></div></button>').join('') + '</div>' : '';
}
const qIn = $('q'), qSug = $('qsug');
function showSug() {
  const q = fold(qIn.value.trim());
  const m = DESTS.filter((d) => fold(d.name).includes(q));
  qSug.hidden = false;
  qSug.innerHTML = m.length ? m.map((d) => '<button type="button"' + (d.ok ? ' data-dest="' + esc(d.name) + '"' : ' disabled') + '><span>' + esc(d.name) + '</span>' + (d.ok ? '' : '<span class="soon">Sắp có</span>') + '</button>').join('') : '<button type="button" disabled><span>Chưa có điểm đến này</span></button>';
}
qIn.addEventListener('input', showSug);
qIn.addEventListener('focus', showSug);
qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = qSug.querySelector('[data-dest]'); if (b) b.click(); } });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) qSug.hidden = true; });

/* ---------- Lịch trình của tôi ---------- */
function renderTrips() {
  const el = $('tripsList');
  if (!store.trips.length) { el.innerHTML = '<div class="panel empty"><b>Chưa có lịch trình nào</b>Tạo lịch trình và bấm Lưu để xem lại ở đây.<button class="go" type="button" data-go="create">Tạo lịch trình mới</button></div>'; return; }
  el.innerHTML = store.trips.map((s) => {
    const t = s.trip, armed = armedTrip === s.id;
    return '<div class="panel trip"><h3>' + esc(t.destination) + ' · ' + daysBetween(t.startDate, t.endDate) + ' ngày</h3><div class="sub">' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ' · ' + esc(RULES[t.audience].label) + ' · ' + t.people + ' người</div><div class="tot">Dự kiến ' + money(s.total) + '</div>' +
      '<div class="acts"><button type="button" data-trip="' + s.id + '">Mở</button><button type="button" class="' + (armed ? 'btn danger' : 'del') + '" data-deltrip="' + s.id + '">' + (armed ? 'Bấm lại để xoá' : 'Xoá') + '</button></div></div>';
  }).join('');
}

/* ---------- Thông báo ---------- */
function renderNotifs() {
  const el = $('notifList');
  if (!store.notifs.length) { el.innerHTML = '<div class="panel empty"><b>Chưa có thông báo</b>Thông báo về lịch trình sẽ hiện ở đây.</div>'; return; }
  el.innerHTML = store.notifs.map((n) => '<div class="panel note' + (n.read ? '' : ' unread') + '"><span class="bar"></span><div><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><small>' + fmtTime(n.at) + '</small></div></div>').join('') +
    '<button class="btn quiet" type="button" data-clearnotifs>Xoá tất cả thông báo</button>';
}

/* ---------- Tài khoản ---------- */
const opt = (v, label, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>';
function renderAccount() {
  const p = store.prefs;
  $('accountBody').innerHTML =
    '<div class="panel me"><div class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/></svg></div><div><b>Khách</b><span>Chưa đăng nhập</span></div></div>' +
    '<div class="panel setting"><b>Mặc định khi tạo lịch trình</b><div><label for="prefAud">Đi cùng</label><select id="prefAud">' +
      opt('nhom_ban', 'Nhóm bạn trẻ', p.audience || 'nhom_ban') + opt('mot_minh', 'Một mình', p.audience) + opt('cap_doi', 'Cặp đôi', p.audience) + opt('gia_dinh', 'Gia đình', p.audience) +
    '</select></div><div><label for="prefBud">Ngân sách</label><select id="prefBud">' + opt('tiet_kiem', 'Tiết kiệm', p.budget) + opt('vua_phai', 'Vừa phải', p.budget || 'vua_phai') + opt('thoai_mai', 'Thoải mái', p.budget) + '</select></div></div>' +
    '<div class="panel"><b>Dữ liệu của bạn</b><p class="hint" style="margin:6px 0 12px">Bản đầu chưa cần đăng nhập. Lịch trình và thông báo chỉ lưu trên thiết bị này, không lưu mật khẩu hay thông tin thanh toán. Đăng nhập để đồng bộ nhiều thiết bị sẽ có ở bản sau.</p>' +
    '<button class="btn danger" type="button" data-clearall>' + (armedClear ? 'Bấm lại để xoá hết' : 'Xoá dữ liệu trên thiết bị này') + '</button></div>' +
    '<p class="foot">Arrow Travel · bản thử nghiệm 0.1 · dữ liệu Đà Nẵng là mẫu</p>';
}
$('accountBody').addEventListener('change', (e) => {
  if (e.target.id === 'prefAud') store.prefs.audience = e.target.value;
  if (e.target.id === 'prefBud') store.prefs.budget = e.target.value;
  persist();
});

/* ---------- Bắt sự kiện chung: tab, lối tắt, danh sách ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-preset],[data-dest],[data-trip],[data-deltrip],[data-clearnotifs],[data-clearall]'); if (!t) return;
  const d = t.dataset;
  if (d.go) { if (d.go === 'create' && !plan) openCreate({}, true); else go(d.go); return; }
  if (d.preset) { openCreate(PRESETS[d.preset] || {}, true); return; }
  if (d.dest) { qSug.hidden = true; openCreate({}, true); return; }
  if (d.trip) { openTrip(d.trip); return; }
  if (d.deltrip) {
    if (armedTrip !== d.deltrip) { armedTrip = d.deltrip; renderTrips(); return; }
    store.trips = store.trips.filter((x) => x.id !== d.deltrip); armedTrip = null; persist(); renderTrips(); return;
  }
  if (d.clearnotifs !== undefined) { store.notifs = []; persist(); updateBadge(); renderNotifs(); return; }
  if (d.clearall !== undefined) {
    if (!armedClear) { armedClear = true; renderAccount(); return; }
    store = seedStore(); armedClear = false; plan = null; currentTripId = null; persist(); updateBadge(); renderAccount();
  }
});

applyForm({});
updateBadge();
renderHome();
