import { buildItinerary, effectiveRules, filterPlaces, STYLE_TYPES, styleList, distanceKm, travelMinutes, toMin, toHHMM, daysBetween, addDays } from '../src/scheduler.js';
import { estimateCost, hotelsFor } from '../src/costing.js';
import { searchFlights, sortFlights, cheapestFlight, searchHotels, sortHotels } from '../src/search.js';
import { hotelDetailHtml } from '../src/hoteldetail.js';
import { fetchPlaceReviews } from '../src/google.js';
import { vietQrPayload, transferContent, bookingCode, canCharge } from '../src/payment.js';
import { transportOptions } from '../src/transport.js';
import { placeDetailHtml, sceneSvg } from '../src/detail.js';

// <DATA>
const [DATA, RULES, OPTS, TRANSPORT, FLIGHTS, PAYMENT, GOOGLE] = await Promise.all(['da-nang', 'rules', 'travel-options', 'transport', 'flights', 'payment', 'google'].map((n) => fetch('../data/' + n + '.json').then((r) => r.json())));
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
  return { trips: [], bookings: [], prefs: {}, notifs: [
    { id: 'n1', title: 'Chào mừng đến Arrow Travel', body: 'Chọn Tạo mới để xếp lịch trình đầu tiên cho chuyến đi Đà Nẵng.', at: now, read: false },
    { id: 'n2', title: 'Dữ liệu đang là bản mẫu', body: 'Giá vé, giờ mở cửa, khách sạn và vé máy bay là số liệu mẫu. Hãy kiểm tra lại trước khi đặt thật.', at: now - 1, read: false },
  ] };
}
function loadStore() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.trips)) return { prefs: {}, notifs: [], bookings: [], ...s }; } catch (e) { /* bỏ qua, dùng bộ nhớ tạm */ }
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
let finalized = false, originId = 'ho-chi-minh', flightOut = null, flightBack = null, hotelId = null, transportId = null, ownTransport = false, currentTripId = null, savedOk = false;
let armedTrip = null, armedClear = false;
let airlineFilter = [], flightSort = 'price', hotelStars = [], hotelSort = 'price';
let roomByHotel = {}, googleCache = {}, detailHotel = null;
let needFlight = true, needHotel = true; // tắt khi khách đã tự lo vé máy bay hoặc chỗ ở

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
  swapOpen = null; undoStack = []; finalized = false; flightOut = null; flightBack = null; hotelId = null; airlineFilter = []; hotelStars = []; needFlight = true; needHotel = true; roomByHotel = {}; transportId = null; ownTransport = false; currentTripId = null; savedOk = false;
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

/* ---------- Bước 2: chốt lịch trình, tìm chuyến bay và khách sạn, chi phí, thanh toán ---------- */
const curOrigin = () => OPTS.origins.find((o) => o.id === originId) || null;
const BUDGET_NAME = { tiet_kiem: 'tiết kiệm', vua_phai: 'vừa phải', thoai_mai: 'thoải mái' };
const todayStr = () => iso(new Date());

function flightLists() {
  const t = plan.trip;
  if (!needFlight || !curOrigin()) return null;
  const mk = (direction, date) => searchFlights({ data: FLIGHTS, originId, date, direction, people: t.people, today: todayStr() });
  return { out: mk('out', t.startDate), back: mk('back', t.endDate) };
}
function hotelList() {
  const t = plan.trip;
  return searchHotels({ hotels: hotelsFor(OPTS.hotels, t), checkIn: t.startDate, checkOut: t.endDate, people: t.people, roomByHotel });
}
// Giữ lựa chọn hiện tại nếu còn hợp lệ, nếu không chọn mặc định (chuyến rẻ nhất, khách sạn hợp ngân sách)
function ensureChoices(fl, hl) {
  if (fl) {
    if (!(flightOut && fl.out.some((f) => f.id === flightOut.id && !f.soldOut))) flightOut = cheapestFlight(fl.out);
    if (!(flightBack && fl.back.some((f) => f.id === flightBack.id && !f.soldOut))) flightBack = cheapestFlight(fl.back);
  } else { flightOut = null; flightBack = null; }
  if (!hl.some((x) => x.id === hotelId && x.available)) {
    const ok = hl.filter((x) => x.available).sort((a, b) => a.total - b.total);
    const pick = ok.find((x) => x.tier === plan.trip.budget) || ok[0];
    hotelId = pick ? pick.id : null;
  }
}
function calc() {
  const t = plan.trip, nDays = daysBetween(t.startDate, t.endDate);
  const fl = flightLists(), hl = nDays > 1 && needHotel ? hotelList() : [];
  ensureChoices(fl, hl);
  const flight = flightOut && flightBack ? { priceRoundTrip: flightOut.priceOne + flightBack.priceOne } : null;
  const hotel = hl.find((x) => x.id === hotelId) || null;
  const tp = transportOptions({ trip: t, plan, hotel, flight, modes: TRANSPORT.modes, airport: TRANSPORT.airport, nDays });
  if (!tp.options.some((x) => x.id === transportId && x.suitable)) transportId = tp.defaultId;
  const selected = tp.options.find((x) => x.id === transportId) || null;
  const cost = estimateCost({ trip: t, plan, flight, hotel, transport: ownTransport ? { skip: true } : selected });
  const flightsTotal = flight ? flight.priceRoundTrip * t.people : 0, hotelTotal = hotel ? hotel.total : 0;
  return { tp, selected, cost, fl, hl, flight, hotel, flightsTotal, hotelTotal, payAmount: flightsTotal + hotelTotal };
}

function flightCard(f, act, selectedId, people) {
  const sel = f.id === selectedId;
  return '<button type="button" class="opt fl" data-act="' + act + '" data-id="' + f.id + '" aria-pressed="' + sel + '"' + (f.soldOut ? ' disabled aria-disabled="true"' : '') + '>' +
    '<b>' + esc(f.airline) + ' · ' + f.flightNo + '</b><span>' + f.depart + ' ' + f.from + ' → ' + f.arrive + (f.nextDay ? ' (+1)' : '') + ' ' + f.to + ' · ' + dur(f.durationMin) + '</span><span>' + esc(f.baggage) + '</span>' +
    (f.soldOut ? '<span class="late">Không đủ chỗ cho ' + people + ' khách</span>' : '<span class="pr">' + money(f.priceOne) + '/người' + (f.seatsLeft <= 4 ? ' · còn ' + f.seatsLeft + ' chỗ' : '') + '</span>') + '</button>';
}
function flightsHtml(c) {
  const t = plan.trip, o = curOrigin(), fl = c.fl;
  const carriers = FLIGHTS.carriers.filter((k) => fl.out.some((f) => f.carrierId === k.id));
  const keep = (f) => airlineFilter.length === 0 || airlineFilter.includes(f.carrierId);
  const out = sortFlights(fl.out.filter(keep), flightSort), back = sortFlights(fl.back.filter(keep), flightSort);
  let h = '<h3>Chuyến bay khứ hồi</h3><p class="hint">' + esc(o.name) + ' ⇄ Đà Nẵng · đi ' + fmtDate(t.startDate) + ' · về ' + fmtDate(t.endDate) + ' · ' + t.people + ' khách. Dữ liệu mẫu, chưa phải giá thật.</p>';
  h += '<div class="seg" role="group" aria-label="Hãng bay" style="margin:8px 0"><button type="button" data-act="airline" data-id="all" aria-pressed="' + (airlineFilter.length === 0) + '">Tất cả hãng</button>' +
    carriers.map((k) => '<button type="button" data-act="airline" data-id="' + k.id + '" aria-pressed="' + airlineFilter.includes(k.id) + '">' + esc(k.name) + '</button>').join('') + '</div>';
  h += '<label for="fsort">Sắp xếp</label><select id="fsort"><option value="price"' + (flightSort === 'price' ? ' selected' : '') + '>Giá thấp nhất</option><option value="time"' + (flightSort === 'time' ? ' selected' : '') + '>Giờ khởi hành sớm nhất</option></select>';
  const sel = (f) => f ? '<p class="hint">Đang chọn: ' + esc(f.airline) + ' ' + f.flightNo + ' lúc ' + f.depart + ' · ' + money(f.priceOne) + '/người</p>' : '';
  h += '<h4>Chiều đi · ' + fmtDate(t.startDate) + '</h4>' + sel(flightOut) + '<div class="opts">' + (out.map((f) => flightCard(f, 'fout', flightOut && flightOut.id, t.people)).join('') || '<p class="hint">Không có chuyến phù hợp bộ lọc.</p>') + '</div>';
  h += '<h4>Chiều về · ' + fmtDate(t.endDate) + '</h4>' + sel(flightBack) + '<div class="opts">' + (back.map((f) => flightCard(f, 'fback', flightBack && flightBack.id, t.people)).join('') || '<p class="hint">Không có chuyến phù hợp bộ lọc.</p>') + '</div>';
  return h;
}
function hotelsHtml(c) {
  const t = plan.trip;
  const keep = (x) => hotelStars.length === 0 || hotelStars.includes(x.stars);
  const list = sortHotels(c.hl.filter(keep), hotelSort);
  let h = '<h3>Khách sạn · ' + c.cost.nights + ' đêm</h3><p class="hint">Nhận phòng ' + fmtDate(t.startDate) + ' · trả phòng ' + fmtDate(t.endDate) + ' (theo ngày đã chọn). Phòng trống và giá là dữ liệu mẫu.</p>';
  h += '<div class="seg" role="group" aria-label="Hạng sao" style="margin:8px 0"><button type="button" data-act="hstar" data-id="all" aria-pressed="' + (hotelStars.length === 0) + '">Mọi hạng</button>' +
    [2, 3, 4, 5].map((s) => '<button type="button" data-act="hstar" data-id="' + s + '" aria-pressed="' + hotelStars.includes(s) + '">' + s + ' sao</button>').join('') + '</div>';
  h += '<label for="hsort">Sắp xếp</label><select id="hsort"><option value="price"' + (hotelSort === 'price' ? ' selected' : '') + '>Giá thấp nhất</option><option value="rating"' + (hotelSort === 'rating' ? ' selected' : '') + '>Đánh giá cao nhất</option></select>';
  h += '<div class="opts" style="margin-top:8px">' + (list.map((x) =>
    '<div class="opt-wrap"><button type="button" class="opt" data-act="hotel" data-id="' + x.id + '" aria-pressed="' + (x.id === hotelId) + '"' + (x.available ? '' : ' disabled aria-disabled="true"') + '><b>' + esc(x.name) + '</b>' +
    '<span>' + x.stars + ' sao · ' + esc(x.area) + ' · ' + x.rating.toFixed(1) + '/5 ★ (' + x.reviewCount + ')' + '</span><span>' + x.amenities.map(esc).join(' · ') + '</span>' +
    (x.available ? '<span>' + esc(x.room.name) + ' · ' + x.rooms + ' phòng × ' + x.nights + ' đêm · trung bình ' + money(x.avgNight) + '/phòng/đêm</span><span class="pr">' + money(x.total) + ' cả kỳ nghỉ</span>' : '<span class="late">' + esc(x.reason) + '</span>') + '</button><button type="button" class="btn" data-act="hoteldetail" data-id="' + x.id + '">Xem chi tiết, loại phòng, đánh giá</button></div>').join('') || '<p class="hint">Không có khách sạn phù hợp bộ lọc.</p>') + '</div>';
  return h;
}

function finalHtml() {
  if (!finalized) {
    return '<div class="panel final"><button class="go" type="button" data-act="final">Chốt lịch trình của tôi</button><p class="hint" style="margin-top:8px">Sau khi chốt, tìm chuyến bay và khách sạn theo ngày đã chọn, chọn phương tiện, xem tổng chi phí dự kiến và thanh toán. Bạn vẫn đổi hoặc xoá điểm ở trên được, chi phí tự cập nhật.</p></div>';
  }
  const c = calc(), { tp, cost } = c, t = plan.trip;
  let h = '<section class="panel final"><h2>Chuyến đi của tôi</h2><p class="hint">Giá bên dưới là giá mẫu để ước tính.</p>';
  h += '<div class="opts" style="margin-top:12px"><button type="button" class="opt" data-act="needflight" aria-pressed="' + needFlight + '"><b>Đặt vé máy bay</b><span>' + (needFlight ? 'Có đặt. Tìm và tính tiền vé khứ hồi.' : 'Tôi tự lo (đã có vé hoặc đi đường bộ). Bỏ qua vé máy bay.') + '</span></button>' +
    (cost.nights > 0 ? '<button type="button" class="opt" data-act="needhotel" aria-pressed="' + needHotel + '"><b>Đặt khách sạn</b><span>' + (needHotel ? 'Có đặt. Tìm phòng theo ngày đã chọn.' : 'Tôi tự lo (đã có chỗ ở hoặc ở nhà người quen). Bỏ qua khách sạn.') + '</span></button>' : '') + '</div>';
  if (needFlight) h += '<label for="origin" style="margin-top:12px">Khởi hành từ</label><select id="origin">' + OPTS.origins.map((x) => '<option value="' + x.id + '"' + (x.id === originId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>';
  if (c.fl) h += flightsHtml(c);
  if (cost.nights > 0 && needHotel) h += hotelsHtml(c);
  h += '<h3>Phương tiện di chuyển</h3><button type="button" class="opt" data-act="owntransport" aria-pressed="' + ownTransport + '" style="width:100%;margin-bottom:8px"><b>Tôi đã có phương tiện riêng</b><span>Xe cá nhân, người quen đưa đón hoặc xe của khách sạn. Bỏ qua, không tính phí di chuyển.</span></button>';
  if (ownTransport) {
    h += '<p class="hint">Đã bỏ qua phần di chuyển. Quãng đường của lịch trình là ' + tp.totalKm + ' km nếu bạn cần ước lượng xăng hoặc thời gian.</p>';
  } else {
    h += '<p class="hint" style="margin-bottom:8px">Tính theo ' + tp.totalKm + ' km trên ' + tp.legs.length + ' chặng (giữa các điểm' + (c.hotel ? ', từ và về khách sạn' : '') + (c.flight ? ', sân bay' : '') + ').</p><div class="opts">' +
      tp.options.map((x) => '<button type="button" class="opt" data-act="transport" data-id="' + x.id + '" aria-pressed="' + (x.id === transportId) + '"' + (x.suitable ? '' : ' disabled aria-disabled="true"') + '>' +
        (x.tags.length ? '<span class="pill">' + x.tags.map(esc).join(' · ') + '</span>' : '') + '<b>' + esc(x.name) + '</b><span>' + esc(x.brand) + '</span><span>' + x.vehicles + ' xe' + (x.crowded && x.suitable ? ' (nhiều xe, nên chọn xe lớn)' : '') + ' · ' + esc(x.note) + '</span>' +
        (x.suitable ? '<span class="pr">' + money(x.total) + ' · ' + money(x.perPerson) + '/người</span>' : '<span class="late">' + esc(x.reason) + '</span>') + '</button>').join('') +
      '</div><p class="hint">Giá mẫu tính theo quãng đường, chưa gồm phụ thu giờ cao điểm, mưa, phí cầu đường. Mở app Grab hoặc Xanh SM để xem giá thật.</p>';
  }
  h += '<h3>Tổng chi phí dự kiến</h3><div class="cost">' + cost.lines.map((l) => '<div class="cl"><span>' + esc(l.label) + '<small>' + esc(l.note) + '</small></span><b>' + money(l.amount) + '</b></div>').join('') +
    '<div class="cl tot"><span>Tổng cộng</span><b>' + money(cost.total) + '</b></div><div class="cl"><span>Bình quân mỗi người</span><b>' + money(cost.perPerson) + '</b></div></div>';
  h += '<p class="hint">Chưa gồm mua sắm, quà, chi phí phát sinh. Ăn uống tính theo mức ' + BUDGET_NAME[t.budget] + '.</p>';
  if (c.payAmount > 0) {
    h += '<div class="paybox"><h3 style="margin-top:0">Chốt chuyến bay và khách sạn</h3><div class="cost">' +
      (c.flightsTotal ? '<div class="cl"><span>Vé máy bay<small>' + esc(flightOut.flightNo) + ' + ' + esc(flightBack.flightNo) + ' · ' + t.people + ' khách</small></span><b>' + money(c.flightsTotal) + '</b></div>' : '') +
      (c.hotelTotal ? '<div class="cl"><span>Khách sạn<small>' + esc(c.hotel.name) + '</small></span><b>' + money(c.hotelTotal) + '</b></div>' : '') +
      '<div class="cl tot"><span>Cần thanh toán</span><b>' + money(c.payAmount) + '</b></div></div>' +
      '<p class="hint">Thanh toán chuyển khoản qua mã QR, chỉ gồm vé máy bay và khách sạn. Ăn uống, vé tham quan, di chuyển trả trực tiếp tại chỗ.</p>' +
      '<button class="go" type="button" data-act="book" style="margin-top:8px">Chốt và thanh toán ' + money(c.payAmount) + '</button></div>';
  }
  if (c.payAmount <= 0) h += '<p class="hint">Bạn tự lo ' + (!needFlight && !needHotel ? 'vé máy bay và khách sạn' : !needFlight ? 'vé máy bay' : 'khách sạn') + ' nên không cần thanh toán qua app.</p>';
  h += '<button class="go" type="button" data-act="save" style="margin-top:16px;background:var(--teal)">' + (currentTripId ? 'Cập nhật lịch trình đã lưu' : 'Lưu vào Lịch trình của tôi') + '</button>';
  if (savedOk) h += '<p class="saved-ok">Đã lưu. Xem trong tab Lịch trình của tôi.</p>';
  return h + '</section>';
}

function saveTrip() {
  const t = plan.trip, { cost } = calc();
  const rec = { id: currentTripId || 't' + Date.now().toString(36), savedAt: Date.now(), trip: t, originId, needFlight, needHotel, roomByHotel, flightOut, flightBack, hotelId, transportId, ownTransport, total: cost.total,
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
  finalized = true; originId = s.originId === 'none' ? 'ho-chi-minh' : s.originId; needFlight = s.needFlight !== false && s.originId !== 'none'; needHotel = s.needHotel !== false; roomByHotel = s.roomByHotel || {}; flightOut = s.flightOut || null; flightBack = s.flightBack || null; hotelId = s.hotelId; transportId = s.transportId || null; ownTransport = !!s.ownTransport;
  airlineFilter = []; hotelStars = []; currentTripId = id; savedOk = true; swapOpen = null; undoStack = [];
  go('create'); render();
}

/* ---------- Chi tiết khách sạn: loại phòng, ảnh, đánh giá (mẫu hoặc Google Maps) ---------- */
function renderHotelDetail() {
  const c = calc(), hotel = c.hl.find((x) => x.id === detailHotel); if (!hotel) return;
  const g = googleCache[detailHotel];
  $('sheetBody').innerHTML = hotelDetailHtml(hotel, { selected: hotel.id === hotelId, nights: hotel.nights,
    google: g && g.source === 'google' ? g : null, loading: g === 'loading', error: g && g.error ? g.error : '' });
}
function openHotelDetail(id) {
  detailHotel = id; lastFocus = document.activeElement;
  renderHotelDetail(); sheet.hidden = false; $('sheetClose').focus();
  const hotel = OPTS.hotels.find((x) => x.id === id);
  if (GOOGLE.apiKey && hotel && !googleCache[id]) {
    googleCache[id] = 'loading'; renderHotelDetail();
    fetchPlaceReviews({ apiKey: GOOGLE.apiKey, query: hotel.googleQuery, lat: hotel.lat, lng: hotel.lng })
      .then((r) => { googleCache[id] = r; })
      .catch(() => { googleCache[id] = { error: 'Không tải được đánh giá từ Google Maps, đang hiện đánh giá mẫu.' }; })
      .finally(() => { if (!sheet.hidden && detailHotel === id) renderHotelDetail(); });
  }
}

/* ---------- Đặt chỗ và thanh toán bằng mã QR chuyển khoản ---------- */
const BOOKING_STATUS = { chua_chuyen: 'Chờ chuyển khoản', cho_xac_nhan: 'Đã báo chuyển khoản, chờ xác nhận', thu: 'Đặt thử, không có thanh toán thật' };
const live = () => canCharge(PAYMENT, [FLIGHTS.sample, OPTS.sample]);
function qrSvg(payload) {
  if (typeof qrcode === 'undefined') return '';
  const q = qrcode(0, 'M'); q.addData(payload, 'Byte'); q.make();
  const n = q.getModuleCount(), m = 4; let d = '';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) d += 'M' + (k + m) + ' ' + (r + m) + 'h1v1h-1z';
  return '<svg class="qr" viewBox="0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m) + '" role="img" aria-label="Mã QR chuyển khoản" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
}
function startBooking() {
  const c = calc(); if (c.payAmount <= 0) return;
  saveTrip();
  let b = store.bookings.find((x) => x.tripId === currentTripId && x.status === 'chua_chuyen' && x.amount === c.payAmount);
  if (!b) {
    b = { code: bookingCode(), tripId: currentTripId, createdAt: Date.now(), amount: c.payAmount, status: 'chua_chuyen', people: plan.trip.people,
      flights: c.flight ? { out: flightOut, back: flightBack, total: c.flightsTotal } : null, hotel: c.hotel ? { id: c.hotel.id, name: c.hotel.name, total: c.hotelTotal, checkIn: plan.trip.startDate, checkOut: plan.trip.endDate } : null };
    store.bookings.unshift(b); persist();
  }
  renderPay(b); sheet.hidden = false; lastFocus = document.activeElement; $('sheetClose').focus();
}
function renderPay(b) {
  const isLive = live();
  const payload = vietQrPayload({ bin: PAYMENT.bankBin, account: PAYMENT.accountNumber, amount: b.amount, content: (PAYMENT.contentPrefix || 'ARROW') + ' ' + b.code });
  const content = transferContent((PAYMENT.contentPrefix || 'ARROW') + ' ' + b.code);
  const row = (k, v, copy) => '<div class="cl"><span>' + k + '</span><b>' + esc(v) + (copy ? ' <button type="button" class="btn quiet" style="min-height:36px;padding:0 10px" data-copy="' + esc(copy) + '">Chép</button>' : '') + '</b></div>';
  let h = '<div class="pay"><h2>Thanh toán chuyến bay và khách sạn</h2>';
  h += isLive ? '' : '<div class="warn" style="margin:8px 0">CHẾ ĐỘ THỬ. Chuyến bay, khách sạn và giá đều là dữ liệu mẫu nên mã QR bị phủ chữ MẪU và không dùng để chuyển tiền.</div>';
  h += '<div class="cost">' + (b.flights ? '<div class="cl"><span>Vé máy bay<small>' + esc(b.flights.out.flightNo) + ' + ' + esc(b.flights.back.flightNo) + ' · ' + b.people + ' khách</small></span><b>' + money(b.flights.total) + '</b></div>' : '') +
    (b.hotel ? '<div class="cl"><span>Khách sạn<small>' + esc(b.hotel.name) + '</small></span><b>' + money(b.hotel.total) + '</b></div>' : '') + '<div class="cl tot"><span>Cần thanh toán</span><b>' + money(b.amount) + '</b></div></div>';
  h += '<div class="qrbox">' + (qrSvg(payload) || '<p class="hint">Không tải được thư viện mã QR, hãy chuyển khoản theo thông tin bên dưới.</p>') + (isLive ? '' : '<div class="qr-wm" aria-hidden="true">MẪU</div>') + '</div>';
  h += '<div class="cost">' + row('Ngân hàng', PAYMENT.bankName) + row('Số tài khoản', PAYMENT.accountNumber, PAYMENT.accountNumber) + (PAYMENT.accountName ? row('Chủ tài khoản', PAYMENT.accountName) : '') +
    row('Số tiền', money(b.amount), String(b.amount)) + row('Nội dung', content, content) + '</div>';
  h += '<ol class="steps"><li>Mở app ngân hàng, quét mã QR (hoặc nhập thông tin ở trên).</li><li>Kiểm tra số tiền và nội dung chuyển khoản đúng như trên.</li><li>Chuyển xong, bấm nút bên dưới để báo cho chúng tôi.</li></ol>';
  if (b.status === 'chua_chuyen') h += '<button class="go" type="button" data-act="paid" data-code="' + b.code + '">' + (isLive ? 'Tôi đã chuyển khoản' : 'Ghi nhận đặt thử') + '</button>';
  else h += '<p class="saved-ok">' + esc(BOOKING_STATUS[b.status]) + '. Mã đặt chỗ ' + b.code + '.</p>';
  h += '<p class="hint" style="margin-top:8px">Hệ thống không tự xác nhận. Vé và phòng chỉ được xác nhận sau khi đối chiếu giao dịch với mã ' + b.code + '.</p><p class="hint" id="copyMsg" aria-live="polite"></p></div>';
  $('sheetBody').innerHTML = h;
}
$('sheetBody').addEventListener('click', (e) => {
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    const done = (ok) => { const m = $('copyMsg'); if (m) m.textContent = ok ? 'Đã chép.' : 'Không chép được, hãy chép thủ công.'; };
    try { navigator.clipboard.writeText(cp.dataset.copy).then(() => done(true), () => done(false)); } catch (err) { done(false); }
    return;
  }
  const rm = e.target.closest('[data-room]');
  if (rm && detailHotel) { roomByHotel[detailHotel] = rm.dataset.room; savedOk = false; renderHotelDetail(); render(); return; }
  const hp = e.target.closest('[data-hotelpick]');
  if (hp) { hotelId = hp.dataset.hotelpick; savedOk = false; closeSheet(); render(); return; }
  const pd = e.target.closest('[data-act=paid]'); if (!pd) return;
  const b = store.bookings.find((x) => x.code === pd.dataset.code); if (!b) return;
  b.status = live() ? 'cho_xac_nhan' : 'thu'; persist();
  addNotif(live() ? 'Đã ghi nhận chuyển khoản' : 'Đã ghi nhận đặt thử', live() ? 'Mã ' + b.code + ' · ' + money(b.amount) + '. Chúng tôi sẽ đối chiếu giao dịch rồi xác nhận vé và phòng.' : 'Mã ' + b.code + '. Đây là bản thử, chưa có thanh toán thật và chưa đặt chỗ thật.');
  renderPay(b); renderTrips();
});

/* ---------- Thao tác trong màn Tạo mới ---------- */
$('out').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const act = b.dataset.act, di = +b.dataset.d, ii = +b.dataset.i;
  if (act === 'detail') { openDetail(di, b.dataset.id); return; }
  if (act === 'final') { finalized = true; render(); const f = document.querySelector('section.final'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (act === 'fout') { flightOut = flightLists().out.find((f) => f.id === b.dataset.id) || flightOut; savedOk = false; render(); return; }
  if (act === 'fback') { flightBack = flightLists().back.find((f) => f.id === b.dataset.id) || flightBack; savedOk = false; render(); return; }
  if (act === 'hotel') { hotelId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'airline') { const id = b.dataset.id; airlineFilter = id === 'all' ? [] : airlineFilter.includes(id) ? airlineFilter.filter((x) => x !== id) : [...airlineFilter, id]; render(); return; }
  if (act === 'hstar') { const id = b.dataset.id, n = +id; hotelStars = id === 'all' ? [] : hotelStars.includes(n) ? hotelStars.filter((x) => x !== n) : [...hotelStars, n]; render(); return; }
  if (act === 'hoteldetail') { openHotelDetail(b.dataset.id); return; }
  if (act === 'needflight') { needFlight = !needFlight; savedOk = false; render(); return; }
  if (act === 'needhotel') { needHotel = !needHotel; savedOk = false; render(); return; }
  if (act === 'book') { startBooking(); return; }
  if (act === 'transport') { transportId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'owntransport') { ownTransport = !ownTransport; savedOk = false; render(); return; }
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
  const id = e.target.id;
  if (id === 'origin') { originId = e.target.value; flightOut = null; flightBack = null; airlineFilter = []; savedOk = false; render(); $('origin').focus(); }
  if (id === 'fsort') { flightSort = e.target.value; render(); $('fsort').focus(); }
  if (id === 'hsort') { hotelSort = e.target.value; render(); $('hsort').focus(); }
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
function bookingLine(tripId) {
  const b = store.bookings.find((x) => x.tripId === tripId); if (!b) return '';
  return '<div class="sub" style="margin-top:4px"><span class="tag-status ' + b.status + '">' + esc(BOOKING_STATUS[b.status]) + '</span> Mã ' + b.code + ' · ' + money(b.amount) + '</div>';
}
function renderTrips() {
  const el = $('tripsList');
  if (!store.trips.length) { el.innerHTML = '<div class="panel empty"><b>Chưa có lịch trình nào</b>Tạo lịch trình và bấm Lưu để xem lại ở đây.<button class="go" type="button" data-go="create">Tạo lịch trình mới</button></div>'; return; }
  el.innerHTML = store.trips.map((s) => {
    const t = s.trip, armed = armedTrip === s.id;
    return '<div class="panel trip"><h3>' + esc(t.destination) + ' · ' + daysBetween(t.startDate, t.endDate) + ' ngày</h3><div class="sub">' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ' · ' + esc(RULES[t.audience].label) + ' · ' + t.people + ' người</div><div class="tot">Dự kiến ' + money(s.total) + '</div>' + bookingLine(s.id) +
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
    store.trips = store.trips.filter((x) => x.id !== d.deltrip); store.bookings = store.bookings.filter((x) => x.tripId !== d.deltrip || x.status !== 'chua_chuyen'); armedTrip = null; persist(); renderTrips(); return;
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
