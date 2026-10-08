import { buildItinerary, effectiveRules, filterPlaces, STYLE_TYPES, styleList, BUDGET_CAP, distanceKm, travelMinutes, toMin, toHHMM, daysBetween, addDays } from '../src/scheduler.js';
import { estimateCost, hotelsFor } from '../src/costing.js';
import { searchFlights, sortFlights, cheapestFlight, searchHotels, sortHotels } from '../src/search.js';
import { hotelDetailHtml } from '../src/hoteldetail.js';
import { fetchPlaceReviews } from '../src/google.js';
import { vietQrPayload, transferContent, bookingCode, canCharge } from '../src/payment.js';
import { transportOptions } from '../src/transport.js';
import { straightKm, fmtDist, reachedStop, catalogNearby, fetchOverpass, mapsSearchUrl, mapsDirectionsUrl, mapsPlaceUrl, NEARBY_CATS } from '../src/nearby.js';
import { trackMapSvg } from '../src/trackmap.js';
import { parseMapsInput, mapsSearchLink } from '../src/gmaps.js';
import { placeDetailHtml, sceneSvg, TYPE_LABEL } from '../src/detail.js';
import { money, moneyVnd, vnd, setCurrency, getCurrency, CURRENCIES } from '../src/format.js';
import { tr, setLang, getLang } from '../src/i18n.js';
import { EN } from '../src/i18n-en.js';
import { searchPromos, findByCode, applyPromo, isValid, daysLeft } from '../src/promos.js';
import { EARN, CATALOG, newPoints, award, redeem, voucherCheck } from '../src/loyalty.js';
import { matchTravelers } from '../src/friends.js';
import { planReel, TRACKS } from '../src/reel.js';
import { verifyLicense, proStatus, startTrial, limitsFor } from '../src/pro.js';
import { optimizeDayOrder, routeKm } from '../src/optimize.js';
import { loadReelImages, createReelPlayer, exportReel, reelMime } from './reel.js';
import { addPhoto, listPhotos, listPhotosByPrefix, deletePhoto, movePhotos, deleteTripPhotos, clearAllPhotos, resizeImage } from './photos.js';

// <DATA>
const [DATA, RULES, OPTS, TRANSPORT, FLIGHTS, PAYMENT, GOOGLE, PROMOS, TRAVELERS, LEGAL, APP, FEATURED, PRO] = await Promise.all(['da-nang', 'rules', 'travel-options', 'transport', 'flights', 'payment', 'google', 'promos', 'travelers', 'legal', 'app', 'featured', 'pro'].map((n) => fetch('../data/' + n + '.json').then((r) => r.json())));
// </DATA>

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const dur = (m) => (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '') : m + 'p');
const iso = (d) => d.toISOString().slice(0, 10);
const fmtDate = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
const fmtTime = (t) => new Date(t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

/* ---------- Lưu trữ trên thiết bị (không có tài khoản, không có máy chủ) ---------- */
const STORE_KEY = 'arrow-travel-v1';
const baseStore = () => ({ settings: { theme: 'light', lang: 'vi', currency: 'VND' }, favorites: [], moments: {}, track: null, points: newPoints(), vouchers: [], friends: [], review: null, customPlaces: [], pro: { license: null, trialUsed: false, trialUntil: null } });
function seedStore() {
  const now = Date.now();
  return { ...baseStore(), trips: [], bookings: [], prefs: {}, notifs: [
    { id: 'n1', title: 'Chào mừng đến Arrow Travel', body: 'Chọn Tạo mới để xếp lịch trình đầu tiên cho chuyến đi Đà Nẵng.', at: now, read: false },
    { id: 'n2', title: 'Dữ liệu đang là bản mẫu', body: 'Giá vé, giờ mở cửa, khách sạn và vé máy bay là số liệu mẫu. Hãy kiểm tra lại trước khi đặt thật.', at: now - 1, read: false },
  ] };
}
function loadStore() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && Array.isArray(s.trips)) return { ...baseStore(), prefs: {}, notifs: [], bookings: [], ...s, settings: { ...baseStore().settings, ...s.settings } }; } catch (e) { /* bỏ qua, dùng bộ nhớ tạm */ }
  return seedStore();
}
let store = loadStore();
// Địa điểm người dùng tự thêm từ Google Maps: lưu trên thiết bị, gộp vào danh sách để mở lại lịch đã lưu, xem chi tiết, khoảnh khắc
(store.customPlaces || []).forEach((p) => { if (!DATA.places.some((x) => x.id === p.id)) DATA.places.push(p); });
// ArrowPro: trạng thái gói, giới hạn bản miễn phí
const proNow = () => proStatus(store.pro);
const isPro = () => proNow().active;
const lim = () => limitsFor(isPro());
function needPro(what) { toast(what + ' là tính năng ArrowPro'); openPage('pro'); }
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
let payBooking = null;
let airlineFilter = [], flightSort = 'price', hotelStars = [], hotelSort = 'price';
let roomByHotel = {}, googleCache = {}, detailHotel = null;
let needFlight = true, needHotel = true; // tắt khi khách đã tự lo vé máy bay hoặc chỗ ở

/* ---------- Điều hướng ---------- */
const SCREENS = ['home', 'create', 'moments', 'track', 'trips', 'notifs', 'account'];
const TAB_OF = { create: 'home', notifs: '' }; // thông báo mở bằng chuông nên không tô sáng tab nào
let notifFrom = 'home'; // màn tạo lịch trình không có tab riêng, tô sáng tab Khám phá
function go(name) {
  if (name === 'notifs' && currentScreen !== 'notifs') notifFrom = currentScreen === 'page' ? pageFrom : currentScreen;
  stopReel(); armedTrip = null; armedClear = false; currentScreen = name; pageName = null; $('scr-page').hidden = true;
  SCREENS.forEach((s) => { $('scr-' + s).hidden = s !== name; });
  document.querySelectorAll('.tab').forEach((t) => { if (t.dataset.go === (TAB_OF[name] || name)) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  if (name === 'home') renderHome();
  if (name === 'moments') renderMoments();
  if (name === 'track') { renderTrack(); if (store.track && !nearbyFrom && !nearbyLoading) refreshNearby(); }
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
  $('people').value = t.people; setBudget(t.budget);
  $('kids').checked = !!t.hasKids || t.audience === 'gia_dinh'; $('elder').checked = !!t.hasElderly;
  setAud(t.audience); setStyles(t.styles); updateNights();
}
function openCreate(p, runNow, collapse = true) { applyForm(p); go('create'); if (runNow) run(collapse); }

function setBudget(v) { $('budget').value = v; $('budgetSeg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v))); }
function updateNights() {
  const a = $('start').value, b = $('end').value, n = a && b && b >= a ? daysBetween(a, b) : 0;
  $('nights').textContent = n ? n + ' ngày ' + (n - 1) + ' đêm' : '';
}
let formOpen = true, dirtyEdits = false, formTimer = null, dayTab = 'all';
let bookTab = null; // thẻ đang mở trong 'Chuyến đi của tôi': flights | hotel | transport
function setFormOpen(open) {
  formOpen = open; $('form').hidden = !open;
  const fs = $('formSummary'); fs.hidden = open || !plan;
  if (!open && plan) {
    const t = plan.trip;
    fs.innerHTML = '<div><b>' + esc(t.destination) + ' · ' + daysBetween(t.startDate, t.endDate) + ' ngày</b><span>' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ' · ' + t.people + ' người · ' + esc(plan.audienceLabel) + '</span></div><button type="button" class="btn" data-editform>Sửa</button>';
  }
}
// Đổi form: tự xếp lại lịch, trừ khi đã chỉnh tay hoặc đã chốt thì hỏi trước để không mất chỉnh sửa
function formChanged() {
  updateNights();
  if (plan && (dirtyEdits || finalized)) { $('applyHint').hidden = false; return; }
  clearTimeout(formTimer); formTimer = setTimeout(() => run(false), 250);
}
$('aud').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  setAud(b.dataset.v);
  if (aud === 'gia_dinh') $('kids').checked = true;
  formChanged();
});
$('styles').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  formChanged();
});
$('budgetSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; setBudget(b.dataset.v); formChanged(); });
document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
  $('people').value = Math.min(30, Math.max(1, (+$('people').value || 1) + +b.dataset.step)); formChanged();
}));
['kids', 'elder', 'start', 'end', 'people'].forEach((id) => $(id).addEventListener('change', formChanged));
$('form').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(formTimer); run(true); });

function resetPlanState() {
  swapOpen = null; undoStack = []; dirtyEdits = false; dayTab = 'all'; bookTab = null; $('applyHint').hidden = true; finalized = false; flightOut = null; flightBack = null; hotelId = null; airlineFilter = []; hotelStars = []; needFlight = true; needHotel = true; roomByHotel = {}; transportId = null; ownTransport = false; currentTripId = null; savedOk = false;
}
function run(collapse = false) {
  const trip = { destination: 'Đà Nẵng', startDate: $('start').value, endDate: $('end').value, people: +$('people').value || 1,
    budget: $('budget').value, audience: aud, hasKids: $('kids').checked, hasElderly: $('elder').checked,
    styles: [...document.querySelectorAll('#styles [aria-pressed="true"]')].map((x) => x.dataset.v) };
  if (!trip.startDate || !trip.endDate || trip.endDate < trip.startDate) { $('out').innerHTML = '<div class="warn">Ngày về phải sau ngày đi.</div>'; $('dayTabs').hidden = true; setFormOpen(true); return; }
  plan = buildItinerary(trip, DATA, RULES);
  rule = effectiveRules(RULES[aud], trip);
  pool = filterPlaces(DATA.places, trip).places;
  plan.days.forEach((d) => d.items.forEach((i) => { i.dur = i.duration; }));
  resetPlanState();
  render(); setFormOpen(!collapse);
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
function renderDayTabs() {
  const tabs = $('dayTabs');
  if (dayTab !== 'all' && !plan.days[dayTab]) dayTab = 'all';
  const stops = plan.days.reduce((x, d) => x + d.placeCount, 0), km = Math.round(plan.days.reduce((x, d) => x + d.totalKm, 0) * 10) / 10;
  tabs.hidden = false;
  tabs.innerHTML = '<div class="dt-row" role="tablist" aria-label="Chọn ngày"><button type="button" role="tab" data-daytab="all" aria-selected="' + (dayTab === 'all') + '">Tất cả</button>' +
    plan.days.map((d, i) => '<button type="button" role="tab" data-daytab="' + i + '" aria-selected="' + (dayTab === i) + '">Ngày ' + d.dayIndex + '<small>' + fmtDate(d.date) + '</small></button>').join('') + '</div>' +
    '<div class="dt-stat">' + plan.days.length + ' ngày · ' + stops + ' điểm · ' + km + ' km · ' + esc(plan.audienceLabel) + '</div>';
}
function render() {
  let h = '';
  if (plan.warnings.length) h += '<div class="warn">' + plan.warnings.map(esc).join('<br>') + '</div>';
  if (undoStack.length) h += '<div class="undo"><span>' + esc(undoStack[undoStack.length - 1].msg || '') + '</span><button data-act="undo" type="button">Hoàn tác</button></div>';
  renderDayTabs();
  plan.days.forEach((d, di) => {
    if (dayTab !== 'all' && dayTab !== di) return;
    h += '<section class="panel day" data-day="' + di + '"><h2>Ngày ' + d.dayIndex + ' · ' + d.date.split('-').reverse().join('/') + '</h2><div class="meta">' + d.placeCount + ' điểm · ' + d.totalKm + ' km</div>';
    if (!d.items.length) h += '<p class="hint">Ngày này đang trống.</p>';
    d.items.forEach((it, ii) => {
      const isOpen = swapOpen && swapOpen.d === di && swapOpen.i === ii;
      const at = ' data-d="' + di + '" data-i="' + ii + '"';
      if (it.travel) h += '<div class="drive">🚗 ' + it.travel.km + ' km · ' + it.travel.min + 'p</div>';
      const name = it.place ? '<button type="button" class="nm" data-act="detail" data-d="' + di + '" data-id="' + it.place.id + '">' + esc(it.place.name) + '</button>' : esc(it.note);
      const sub = it.place ? dur(it.dur) + ' · ' + vnd(it.place.price) + (it.kind === 'meal' ? ' · ' + esc(it.note) : '') : dur(it.dur);
      const tools = '<div class="tools">' + (it.place ? '<button type="button" class="ib" data-act="swap"' + at + ' aria-label="Đổi địa điểm" aria-expanded="' + !!isOpen + '"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></button>' : '') +
        '<button type="button" class="ib" data-act="del"' + at + ' aria-label="Xoá"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></div>';
      h += '<div class="leg ' + it.kind + '"' + at + '><button type="button" class="grip" data-grip' + at + ' aria-label="Kéo để đổi thứ tự (hoặc dùng phím mũi tên lên, xuống)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></button><div class="t">' + it.time + '</div><div><div class="n">' + name + '</div><div class="s">' + sub + '</div>' + (it.late ? '<div class="late">Có thể quá giờ đóng cửa hoặc giờ kết thúc ngày</div>' : '') + '</div>' + tools + '</div>';
      if (isOpen) {
        const sg = suggestions(di, ii);
        h += '<div class="sug"><h3>Đề xuất thay thế</h3>' + (sg.length ? sg.map((x, n) => '<button type="button" class="pick" data-act="pick"' + at + ' data-id="' + x.p.id + '">' + (n === 0 ? '<span class="star">TỐT NHẤT</span>' : '') + esc(x.p.name) + '<span class="why">' + dur(x.p.duration) + ' · ' + vnd(x.p.price) + ' · ' + esc(x.why) + '</span></button>').join('') : '<span class="hint">Không còn địa điểm phù hợp để thay.</span>') + '</div>';
      }
    });
    h += '<div class="dayacts"><button type="button" class="addbtn" data-act="addplace" data-d="' + di + '">+ Thêm địa điểm</button>' +
      (d.items.filter((x) => x.kind === 'visit').length > 1 ? '<button type="button" class="addbtn opt-btn" data-act="optimize" data-d="' + di + '">⚡ Tối ưu lộ trình' + (isPro() ? '' : ' <span class="pro-tag">Pro</span>') + '</button>' : '') + '</div></section>';
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
    '<b>' + esc(f.airline) + ' · ' + f.flightNo + (flightPromo(f.carrierId) ? ' <span class="pill">Có mã giảm</span>' : '') + '</b><span>' + f.depart + ' ' + f.from + ' → ' + f.arrive + (f.nextDay ? ' (+1)' : '') + ' ' + f.to + ' · ' + dur(f.durationMin) + '</span><span>' + esc(f.baggage) + '</span>' +
    (f.soldOut ? '<span class="late">Không đủ chỗ cho ' + people + ' khách</span>' : '<span class="pr">' + money(f.priceOne) + '/người' + (f.seatsLeft <= 4 ? ' · còn ' + f.seatsLeft + ' chỗ' : '') + '</span>') + '</button>';
}
const liveFlightUrl = (f) => 'https://www.flightradar24.com/data/flights/' + encodeURIComponent(String(f.flightNo).replace(/\s+/g, '').toLowerCase());
function liveFlightHtml() {
  if (!flightOut || !flightBack) return '';
  if (!isPro()) return '<button type="button" class="btn quiet pro-lock" data-propage>📡 Theo dõi chuyến bay trực tiếp <span class="pro-tag">Pro</span></button>';
  return '<div class="live-fl"><b>📡 Theo dõi trực tiếp</b>' + [flightOut, flightBack].map((f) => '<a class="btn" href="' + liveFlightUrl(f) + '" target="_blank" rel="noopener">' + esc(f.flightNo) + ' · ' + esc(f.depart || '') + '</a>').join('') + '<p class="hint">Mở Flightradar24: giờ cất, hạ cánh, trễ chuyến. Số hiệu chuyến đang là dữ liệu mẫu.</p></div>';
}
function flightsHtml(c) {
  const t = plan.trip, o = curOrigin(), fl = c.fl;
  const carriers = FLIGHTS.carriers.filter((k) => fl.out.some((f) => f.carrierId === k.id));
  const keep = (f) => airlineFilter.length === 0 || airlineFilter.includes(f.carrierId);
  const out = sortFlights(fl.out.filter(keep), flightSort), back = sortFlights(fl.back.filter(keep), flightSort);
  let h = '<p class="hint">' + esc(o.name) + ' ⇄ Đà Nẵng · đi ' + fmtDate(t.startDate) + ' · về ' + fmtDate(t.endDate) + ' · ' + t.people + ' khách. Dữ liệu mẫu, chưa phải giá thật.</p>';
  h += '<div class="seg" role="group" aria-label="Hãng bay" style="margin:8px 0"><button type="button" data-act="airline" data-id="all" aria-pressed="' + (airlineFilter.length === 0) + '">Tất cả hãng</button>' +
    carriers.map((k) => '<button type="button" data-act="airline" data-id="' + k.id + '" aria-pressed="' + airlineFilter.includes(k.id) + '">' + esc(k.name) + '</button>').join('') + '</div>';
  h += '<label for="fsort">Sắp xếp</label><select id="fsort"><option value="price"' + (flightSort === 'price' ? ' selected' : '') + '>Giá thấp nhất</option><option value="time"' + (flightSort === 'time' ? ' selected' : '') + '>Giờ khởi hành sớm nhất</option></select>';
  const sel = (f) => f ? '<p class="hint">Đang chọn: ' + esc(f.airline) + ' ' + f.flightNo + ' lúc ' + f.depart + ' · ' + money(f.priceOne) + '/người</p>' : '';
  h += '<h4>Chiều đi · ' + fmtDate(t.startDate) + '</h4>' + sel(flightOut) + '<div class="opts">' + (out.map((f) => flightCard(f, 'fout', flightOut && flightOut.id, t.people)).join('') || '<p class="hint">Không có chuyến phù hợp bộ lọc.</p>') + '</div>';
  h += '<h4>Chiều về · ' + fmtDate(t.endDate) + '</h4>' + sel(flightBack) + '<div class="opts">' + (back.map((f) => flightCard(f, 'fback', flightBack && flightBack.id, t.people)).join('') || '<p class="hint">Không có chuyến phù hợp bộ lọc.</p>') + '</div>';
  h += liveFlightHtml();
  return h;
}
function hotelsHtml(c) {
  const t = plan.trip;
  const keep = (x) => hotelStars.length === 0 || hotelStars.includes(x.stars);
  const list = sortHotels(c.hl.filter(keep), hotelSort);
  let h = '<p class="hint">Nhận phòng ' + fmtDate(t.startDate) + ' · trả phòng ' + fmtDate(t.endDate) + ' (theo ngày đã chọn). Phòng trống và giá là dữ liệu mẫu.</p>';
  h += '<div class="seg" role="group" aria-label="Hạng sao" style="margin:8px 0"><button type="button" data-act="hstar" data-id="all" aria-pressed="' + (hotelStars.length === 0) + '">Mọi hạng</button>' +
    [2, 3, 4, 5].map((s) => '<button type="button" data-act="hstar" data-id="' + s + '" aria-pressed="' + hotelStars.includes(s) + '">' + s + ' sao</button>').join('') + '</div>';
  h += '<label for="hsort">Sắp xếp</label><select id="hsort"><option value="price"' + (hotelSort === 'price' ? ' selected' : '') + '>Giá thấp nhất</option><option value="rating"' + (hotelSort === 'rating' ? ' selected' : '') + '>Đánh giá cao nhất</option></select>';
  h += '<div class="opts" style="margin-top:8px">' + (list.map((x) =>
    '<div class="opt-wrap"><button type="button" class="opt" data-act="hotel" data-id="' + x.id + '" aria-pressed="' + (x.id === hotelId) + '"' + (x.available ? '' : ' disabled aria-disabled="true"') + '><b>' + esc(x.name) + (hotelPromo(x.stars) ? ' <span class="pill">Khuyến mãi</span>' : '') + '</b>' +
    '<span>' + x.stars + ' sao · ' + esc(x.area) + ' · ' + x.rating.toFixed(1) + '/5 ★ (' + x.reviewCount + ')' + '</span><span>' + x.amenities.map(esc).join(' · ') + '</span>' +
    (x.available ? '<span>' + esc(x.room.name) + ' · ' + x.rooms + ' phòng × ' + x.nights + ' đêm · trung bình ' + money(x.avgNight) + '/phòng/đêm</span><span class="pr">' + money(x.total) + ' cả kỳ nghỉ</span>' : '<span class="late">' + esc(x.reason) + '</span>') + '</button><button type="button" class="btn" data-act="hoteldetail" data-id="' + x.id + '">Xem chi tiết, loại phòng, đánh giá</button></div>').join('') || '<p class="hint">Không có khách sạn phù hợp bộ lọc.</p>') + '</div>';
  return h;
}

// Ba mục vé máy bay / khách sạn / phương tiện gom thành các thẻ; bấm thẻ nào thì mở nội dung thẻ đó bên dưới, bấm lại để đóng.
// nút bật/tắt đặt vé máy bay, khách sạn dùng chung ảnh nền với thẻ tương ứng
const optImgCls = (id) => (APP.bookingImages?.[id] ? ' opt-img' : '');
const optImg = (id) => (APP.bookingImages?.[id] ? '<img class="btab-img" src="' + esc(APP.bookingImages[id].image) + '" alt="">' : '');
function bookTabsHtml(tabs) {
  if (!tabs.length) return '';
  const cur = tabs.find((t) => t.id === bookTab);
  return '<div class="btabs" role="tablist" aria-label="Vé máy bay, khách sạn, phương tiện">' + tabs.map((t) =>
    '<button type="button" role="tab" class="btab' + (APP.bookingImages?.[t.id] ? ' has-img' : '') + '" id="bt-' + t.id + '" data-act="booktab" data-id="' + t.id + '" aria-selected="' + (t === cur) + '" aria-controls="bp-' + t.id + '">' + (APP.bookingImages?.[t.id] ? '<img class="btab-img" src="' + esc(APP.bookingImages[t.id].image) + '" alt="">' : '') + '<b>' + t.title + '</b><small>' + t.summary + '</small></button>').join('') + '</div>' +
    (cur ? '<div class="bpanel" role="tabpanel" id="bp-' + cur.id + '" aria-labelledby="bt-' + cur.id + '">' + cur.body + '</div>' : '<p class="hint btab-hint">Bấm vào một thẻ để xem và chọn.</p>');
}

function finalHtml() {
  if (!finalized) {
    return '<div class="panel final"><button class="go" type="button" data-act="final">Chốt lịch trình của tôi</button><p class="hint" style="margin-top:8px">Sau khi chốt, tìm chuyến bay và khách sạn theo ngày đã chọn, chọn phương tiện, xem tổng chi phí dự kiến và thanh toán. Bạn vẫn đổi hoặc xoá điểm ở trên được, chi phí tự cập nhật.</p></div>';
  }
  const c = calc(), { tp, cost } = c, t = plan.trip;
  let h = '<section class="panel final"><h2>Chuyến đi của tôi</h2><p class="hint">Giá bên dưới là giá mẫu để ước tính.</p>';
  h += '<div class="opts" style="margin-top:12px"><button type="button" class="opt' + optImgCls('flights') + '" data-act="needflight" aria-pressed="' + needFlight + '">' + optImg('flights') + '<b>Đặt vé máy bay</b><span>' + (needFlight ? 'Có đặt. Tìm và tính tiền vé khứ hồi.' : 'Tôi tự lo (đã có vé hoặc đi đường bộ). Bỏ qua vé máy bay.') + '</span></button>' +
    (cost.nights > 0 ? '<button type="button" class="opt' + optImgCls('hotel') + '" data-act="needhotel" aria-pressed="' + needHotel + '">' + optImg('hotel') + '<b>Đặt khách sạn</b><span>' + (needHotel ? 'Có đặt. Tìm phòng theo ngày đã chọn.' : 'Tôi tự lo (đã có chỗ ở hoặc ở nhà người quen). Bỏ qua khách sạn.') + '</span></button>' : '') + '</div>';
  if (needFlight) h += '<label for="origin" style="margin-top:12px">Khởi hành từ</label><select id="origin">' + OPTS.origins.map((x) => '<option value="' + x.id + '"' + (x.id === originId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>';
  const tabs = [];
  if (c.fl) tabs.push({ id: 'flights', title: 'Vé máy bay', summary: flightOut && flightBack ? esc(flightOut.flightNo) + ' + ' + esc(flightBack.flightNo) + ' · ' + money(c.flightsTotal) : 'Chưa chọn', body: flightsHtml(c) });
  if (cost.nights > 0 && needHotel) tabs.push({ id: 'hotel', title: 'Khách sạn', summary: c.hotel ? esc(c.hotel.name) + ' · ' + money(c.hotelTotal) : 'Chưa chọn · ' + cost.nights + ' đêm', body: hotelsHtml(c) });
  let tb = '<button type="button" class="opt" data-act="owntransport" aria-pressed="' + ownTransport + '" style="width:100%;margin-bottom:8px"><b>Tôi đã có phương tiện riêng</b><span>Xe cá nhân, người quen đưa đón hoặc xe của khách sạn. Bỏ qua, không tính phí di chuyển.</span></button>';
  if (ownTransport) {
    tb += '<p class="hint">Đã bỏ qua phần di chuyển. Quãng đường của lịch trình là ' + tp.totalKm + ' km nếu bạn cần ước lượng xăng hoặc thời gian.</p>';
  } else {
    tb += '<p class="hint" style="margin-bottom:8px">Tính theo ' + tp.totalKm + ' km trên ' + tp.legs.length + ' chặng (giữa các điểm' + (c.hotel ? ', từ và về khách sạn' : '') + (c.flight ? ', sân bay' : '') + ').</p><div class="opts">' +
      tp.options.map((x) => '<button type="button" class="opt" data-act="transport" data-id="' + x.id + '" aria-pressed="' + (x.id === transportId) + '"' + (x.suitable ? '' : ' disabled aria-disabled="true"') + '>' +
        (x.tags.length ? '<span class="pill">' + x.tags.map(esc).join(' · ') + '</span>' : '') + '<b>' + esc(x.name) + '</b><span>' + esc(x.brand) + '</span><span>' + x.vehicles + ' xe' + (x.crowded && x.suitable ? ' (nhiều xe, nên chọn xe lớn)' : '') + ' · ' + esc(x.note) + '</span>' +
        (x.suitable ? '<span class="pr">' + money(x.total) + ' · ' + money(x.perPerson) + '/người</span>' : '<span class="late">' + esc(x.reason) + '</span>') + '</button>').join('') +
      '</div><p class="hint">Giá mẫu tính theo quãng đường, chưa gồm phụ thu giờ cao điểm, mưa, phí cầu đường. Mở app Grab hoặc Xanh SM để xem giá thật.</p>';
  }
  tabs.push({ id: 'transport', title: 'Phương tiện', summary: ownTransport ? 'Đã có phương tiện riêng' : c.selected ? esc(c.selected.name) + ' · ' + money(c.selected.total) : 'Chưa chọn', body: tb });
  h += bookTabsHtml(tabs);
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
  else { store.trips.unshift(rec); givePoints('save', { tripId: rec.id }); movePhotos('draft:', rec.id + ':').catch(() => {}); if (store.moments.draft) { store.moments[rec.id] = store.moments.draft; delete store.moments.draft; } if (momTrip === 'draft') momTrip = rec.id; addNotif('Đã lưu lịch trình', t.destination + ' ' + daysBetween(t.startDate, t.endDate) + ' ngày (' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ') đã nằm trong Lịch trình của tôi.'); }
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
  dirtyEdits = false; dayTab = 'all'; bookTab = null; $('applyHint').hidden = true;
  go('create'); render(); setFormOpen(false);
}

/* ---------- Thêm địa điểm vào lịch ---------- */
let addCtx = null;
const ADD_CATS = [['all', 'Tất cả'], ['sight', 'Tham quan'], ['food', 'Ăn uống']];
function whyNot(p) {
  const t = plan.trip, r = [];
  if (!p.audiences.includes(t.audience)) r.push('Không dành cho ' + plan.audienceLabel.toLowerCase());
  if (t.hasKids && !p.kids) r.push('Không hợp trẻ nhỏ');
  if (t.hasElderly && !p.elderly) r.push('Không hợp người lớn tuổi');
  if (p.price > (BUDGET_CAP[t.budget] ?? Infinity)) r.push('Vượt ngân sách');
  return r;
}
function placeItem(p) {
  const food = p.type === 'food' && p.meal;
  return { kind: food ? 'meal' : 'visit', place: p, note: food ? (p.meal === 'dinner' ? 'Ăn tối' : 'Ăn trưa') : '', dur: p.duration };
}
// Thử chèn vào lịch để biết có kịp giờ mở cửa không và phải đi bao xa
function simulateAdd(di, pos, p) {
  const clone = { items: plan.days[di].items.map((i) => ({ ...i })) }, it = placeItem(p);
  clone.items.splice(pos, 0, it); retime(clone);
  return { late: !!it.late, time: it.time, travel: it.travel };
}
function addCandidates() {
  const { d, pos, q, cat, all } = addCtx, taken = used(), k = fold(q.trim());
  return (all ? DATA.places.filter((p) => p.status !== 'closed') : pool)
    .filter((p) => !taken.has(p.id) && (cat === 'all' || (cat === 'food' ? p.type === 'food' : p.type !== 'food')) && (!k || fold(p.name + ' ' + (TYPE_LABEL[p.type] || '')).includes(k)))
    .map((p) => ({ p, sim: simulateAdd(d, pos, p), why: whyNot(p) }))
    .sort((a, b) => (a.sim.late - b.sim.late) || (a.why.length - b.why.length) || ((a.sim.travel ? a.sim.travel.km : 0) - (b.sim.travel ? b.sim.travel.km : 0)));
}
function addListHtml() {
  const list = addCandidates();
  return list.length ? list.map((x) => '<div class="panel addc"><div class="grow"><b>' + esc(x.p.name) + '</b><div class="hint">' + esc(TYPE_LABEL[x.p.type] || '') + ' · ' + dur(x.p.duration) + ' · ' + vnd(x.p.price) +
    (x.sim.travel ? ' · ' + x.sim.travel.km + ' km từ điểm trước' : '') + '</div><div class="chips" style="margin-top:6px">' +
    (x.sim.late ? '<span class="tag-status chua_chuyen">Có thể quá giờ đóng cửa</span>' : '<span class="tag-status">Kịp giờ · khoảng ' + x.sim.time + '</span>') +
    x.why.map((w) => '<span class="tag-status chua_chuyen">' + esc(w) + '</span>').join('') + '</div></div><button type="button" class="btn" data-add="pick" data-id="' + x.p.id + '">Thêm</button></div>').join('')
    : '<div class="panel empty"><b>Không có địa điểm phù hợp</b>Thử bỏ bộ lọc hoặc bật hiện cả địa điểm ít phù hợp.</div>';
}
function renderAdd() {
  const day = plan.days[addCtx.d], n = day.items.length;
  const opts = [[n, 'Cuối ngày'], [0, 'Đầu ngày']];
  day.items.forEach((it, i) => { if (i + 1 < n) opts.push([i + 1, 'Sau ' + (it.place ? it.place.name : it.note)]); });
  const modes = '<div class="seg addmode" role="group" aria-label="Nguồn địa điểm">' + [['list', 'Gợi ý của app'], ['maps', 'Bất kỳ trên Google Maps']].map(([v, l]) => '<button type="button" data-add="mode" data-v="' + v + '" aria-pressed="' + (addCtx.mode === v) + '">' + l + '</button>').join('') + '</div>';
  const posSel = '<label for="addPos" style="margin-top:12px">Thêm vào</label><select id="addPos">' + opts.map(([v, l]) => '<option value="' + v + '"' + (v === addCtx.pos ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
  $('sheetBody').innerHTML = '<div class="pd"><h2>Thêm địa điểm · Ngày ' + day.dayIndex + '</h2>' + modes + posSel +
    (addCtx.mode === 'maps' ? customFormHtml() :
    '<div class="search" style="margin:12px 0 8px"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/></svg><input id="addQ" type="search" value="' + esc(addCtx.q) + '" placeholder="Tìm địa điểm" aria-label="Tìm địa điểm" autocomplete="off"></div>' +
    '<div class="chips" role="group" aria-label="Loại">' + ADD_CATS.map(([v, l]) => '<button type="button" data-add="cat" data-v="' + v + '" aria-pressed="' + (addCtx.cat === v) + '">' + esc(l) + '</button>').join('') + '</div>' +
    '<label class="check"><input type="checkbox" id="addAll"' + (addCtx.all ? ' checked' : '') + '> Hiện cả địa điểm ít phù hợp với nhóm này</label>' +
    '<div id="addList" class="list">' + addListHtml() + '</div>' +
    '<button type="button" class="btn quiet" data-add="mode" data-v="maps" style="margin-top:12px;width:100%">Không thấy địa điểm? Thêm từ Google Maps</button>') + '</div>';
}
function openAddPlace(di) {
  detailPlace = null; detailHotel = null; lastFocus = document.activeElement;
  addCtx = { d: di, pos: plan.days[di].items.length, q: '', cat: 'all', all: false, mode: 'list', cp: { link: '', name: '', type: 'checkin', dur: 60, price: 0 } };
  renderAdd(); sheet.hidden = false; $('sheetClose').focus();
}
function addPlace(id) {
  const p = DATA.places.find((x) => x.id === id); if (!p || !addCtx) return;
  const di = addCtx.d, day = plan.days[di];
  snap(); dirtyEdits = true; savedOk = false;
  undoStack[undoStack.length - 1].msg = 'Đã thêm "' + p.name + '" vào ngày ' + day.dayIndex + '.';
  day.items.splice(addCtx.pos, 0, placeItem(p)); retime(day);
  closeSheet(); render(); toast('Đã thêm ' + p.name);
}
$('sheetBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]'); if (!b || !addCtx) return;
  if (b.dataset.add === 'cat') { addCtx.cat = b.dataset.v; renderAdd(); }
  if (b.dataset.add === 'mode') { addCtx.mode = b.dataset.v; renderAdd(); const f = $(addCtx.mode === 'maps' ? 'cpLink' : 'addQ'); if (f) f.focus(); }
  if (b.dataset.add === 'custom') addCustomPlace();
  if (b.dataset.add === 'pick') addPlace(b.dataset.id);
});
$('sheetBody').addEventListener('input', (e) => {
  if (!addCtx) return;
  if (e.target.id === 'addQ') { addCtx.q = e.target.value; $('addList').innerHTML = addListHtml(); }
  const cpKey = { cpLink: 'link', cpName: 'name', cpDur: 'dur', cpPrice: 'price', cpType: 'type' }[e.target.id];
  if (cpKey) {
    addCtx.cp[cpKey] = e.target.value;
    if (cpKey === 'link') {
      $('cpStatus').innerHTML = cpStatusHtml();
      const r = parseMapsInput(e.target.value);
      if (r.ok && r.name && !addCtx.cp.name) { addCtx.cp.name = r.name; $('cpName').value = r.name; }
    }
  }
});
$('sheetBody').addEventListener('change', (e) => {
  if (!addCtx) return;
  if (e.target.id === 'addPos') { addCtx.pos = +e.target.value; if ($('addList')) $('addList').innerHTML = addListHtml(); }
  if (e.target.id === 'addAll') { addCtx.all = e.target.checked; $('addList').innerHTML = addListHtml(); }
  if (e.target.id === 'cpType') addCtx.cp.type = e.target.value;
});


function optimizeDay(di) {
  if (!isPro()) { needPro('Tối ưu lộ trình'); return; }
  const day = plan.days[di], before = routeKm(day.items, distanceKm), next = optimizeDayOrder(day.items, distanceKm), after = routeKm(next, distanceKm);
  if (after >= before - 0.05) { toast('Lộ trình ngày ' + day.dayIndex + ' đã ngắn nhất rồi'); return; }
  snap(); dirtyEdits = true; savedOk = false; swapOpen = null;
  undoStack[undoStack.length - 1].msg = 'Đã tối ưu ngày ' + day.dayIndex + ': bớt ' + (before - after).toFixed(1) + ' km.';
  day.items = next; retime(day); render(); toast('Bớt ' + (before - after).toFixed(1) + ' km đường đi');
}
/* ---------- Kéo thả đổi thứ tự địa điểm trong ngày (chuột, cảm ứng, bàn phím) ---------- */
function moveItem(di, from, to) {
  const day = plan.days[di];
  if (to < 0 || to >= day.items.length || to === from) return false;
  snap(); dirtyEdits = true; savedOk = false; swapOpen = null;
  const [it] = day.items.splice(from, 1); day.items.splice(to, 0, it);
  undoStack[undoStack.length - 1].msg = 'Đã chuyển "' + (it.place ? it.place.name : it.note) + '" lên vị trí ' + (to + 1) + '.';
  retime(day); render(); return true;
}
let drag = null;
$('out').addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-grip]'); if (!g || e.button > 0) return;
  const leg = g.closest('.leg'), sec = leg.closest('section.day');
  e.preventDefault(); g.setPointerCapture(e.pointerId);
  sec.classList.add('sorting'); leg.classList.add('dragging');
  drag = { di: +g.dataset.d, from: +g.dataset.i, leg, sec, startY: e.clientY, moved: false };
});
$('out').addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
  const legs = [...drag.sec.querySelectorAll('.leg')].filter((x) => x !== drag.leg);
  const before = legs.find((x) => { const r = x.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  const add = drag.sec.querySelector('.addbtn');
  if (before) { if (before.previousElementSibling !== drag.leg) drag.sec.insertBefore(drag.leg, before); }
  else if (add && add.previousElementSibling !== drag.leg) drag.sec.insertBefore(drag.leg, add);
});
function endDrag(cancel) {
  if (!drag) return;
  const d = drag; drag = null;
  d.sec.classList.remove('sorting'); d.leg.classList.remove('dragging');
  const to = [...d.sec.querySelectorAll('.leg')].indexOf(d.leg);
  if (cancel || !d.moved || !moveItem(d.di, d.from, to)) render();
  else { const g = document.querySelector('[data-grip][data-d="' + d.di + '"][data-i="' + to + '"]'); if (g) g.focus(); toast('Đã đổi thứ tự, giờ giấc tự tính lại'); }
}
$('out').addEventListener('pointerup', () => endDrag(false));
$('out').addEventListener('pointercancel', () => endDrag(true));
$('out').addEventListener('keydown', (e) => {
  const g = e.target.closest && e.target.closest('[data-grip]'); if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const di = +g.dataset.d, i = +g.dataset.i, to = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (moveItem(di, i, to)) { const n = document.querySelector('[data-grip][data-d="' + di + '"][data-i="' + to + '"]'); if (n) n.focus(); }
});

/* ---------- Thêm địa điểm bất kỳ từ Google Maps (dán link hoặc toạ độ) ---------- */
const CUSTOM_TYPES = [['checkin', 'Tham quan, check-in'], ['food', 'Quán ăn'], ['cafe', 'Cà phê, trà sữa']];
const CP_REASON = {
  empty: 'Dán link Google Maps hoặc toạ độ, ví dụ 16.0612, 108.2271.',
  short: 'Link rút gọn (maps.app.goo.gl) không đọc được toạ độ. Mở link đó, rồi chép link đầy đủ trên thanh địa chỉ, hoặc nhấn giữ trên bản đồ để chép toạ độ.',
  nocoords: 'Chưa thấy toạ độ trong nội dung này. Dán link đầy đủ của địa điểm hoặc toạ độ dạng 16.0612, 108.2271.',
  range: 'Toạ độ không hợp lệ.',
};
function customFormHtml() {
  const c = addCtx.cp;
  return '<div class="panel cpform"><p class="hint" style="margin-top:0">Địa điểm không có trong gợi ý? Tìm trên Google Maps, chép link (hoặc nhấn giữ trên bản đồ để lấy toạ độ) rồi dán vào đây.</p>' +
    '<a class="btn" id="cpOpen" href="' + esc(mapsSearchLink((addCtx.q || '') + ' ' + plan.trip.destination)) + '" target="_blank" rel="noopener">Mở Google Maps để tìm</a>' +
    '<label for="cpLink">Link Google Maps hoặc toạ độ</label><input id="cpLink" type="text" inputmode="url" autocomplete="off" value="' + esc(c.link) + '" placeholder="https://www.google.com/maps/place/… hoặc 16.0612, 108.2271">' +
    '<p id="cpStatus" class="hint" aria-live="polite">' + cpStatusHtml() + '</p>' +
    '<label for="cpName">Tên địa điểm</label><input id="cpName" type="text" autocomplete="off" value="' + esc(c.name) + '" placeholder="Ví dụ: Quán bún mắm cô Vân">' +
    '<label for="cpType">Loại</label><select id="cpType">' + CUSTOM_TYPES.map(([v, l]) => '<option value="' + v + '"' + (v === c.type ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' +
    '<div class="cprow"><div><label for="cpDur">Ở lại (phút)</label><input id="cpDur" type="number" min="15" max="480" step="15" value="' + c.dur + '"></div>' +
    '<div><label for="cpPrice">Chi phí mỗi người (đ)</label><input id="cpPrice" type="number" min="0" step="1000" value="' + c.price + '"></div></div>' +
    '<button type="button" class="go" data-add="custom" style="margin-top:12px">Thêm vào lịch</button></div>';
}
function cpStatusHtml() {
  const r = parseMapsInput(addCtx.cp.link);
  if (!r.ok) return esc(CP_REASON[r.reason]);
  const ref = DATA.places.find((p) => !p.custom) || r, km = straightKm(ref, r);
  return '✓ Đã đọc toạ độ ' + r.lat.toFixed(5) + ', ' + r.lng.toFixed(5) + (km > 80 ? ' · <span style="color:var(--orange)">cách ' + esc(plan.trip.destination) + ' khoảng ' + Math.round(km) + ' km, kiểm tra lại</span>' : '');
}
function addCustomPlace() {
  const c = addCtx.cp, r = parseMapsInput(c.link);
  if (!r.ok) { $('cpStatus').textContent = CP_REASON[r.reason]; $('cpLink').focus(); return; }
  const name = (c.name || r.name).trim();
  if (!name) { toast('Nhập tên địa điểm'); $('cpName').focus(); return; }
  const isUrl = /^https?:\/\//i.test(c.link.trim());
  const p = { id: 'u-' + Date.now().toString(36), name, type: c.type, lat: r.lat, lng: r.lng, duration: Math.min(480, Math.max(15, +c.dur || 60)), open: '00:00', close: '23:59',
    price: Math.max(0, +c.price || 0), walking: 0, slot: 'afternoon', audiences: [], kids: true, elderly: true, status: 'open', freshness: 'fresh', custom: true,
    scene: c.type === 'food' ? 'food' : c.type === 'cafe' ? 'cafe' : 'mountain', mapsUrl: isUrl ? c.link.trim() : '',
    highlights: ['Địa điểm bạn tự thêm từ Google Maps. Giờ mở cửa và chi phí là do bạn nhập hoặc chưa rõ, xem lại trên Google Maps.'] };
  store.customPlaces = [...(store.customPlaces || []), p]; DATA.places.push(p); persist();
  addPlace(p.id);
}

/* ---------- Chi tiết khách sạn: loại phòng, ảnh, đánh giá (mẫu hoặc Google Maps) ---------- */
function renderHotelDetail() {
  const c = calc(), hotel = c.hl.find((x) => x.id === detailHotel); if (!hotel) return;
  const g = googleCache[detailHotel];
  $('sheetBody').innerHTML = hotelDetailHtml(hotel, { selected: hotel.id === hotelId, nights: hotel.nights,
    google: g && g.source === 'google' ? g : null, loading: g === 'loading', error: g && g.error ? g.error : '' }) +
    placePromosHtml(PROMOS.promos.filter((p) => p.target.type === 'hotel' && hotel.stars >= (p.target.minStars || 0)));
}
function openHotelDetail(id) {
  detailHotel = id; detailPlace = null; lastFocus = document.activeElement;
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
  detailPlace = null;
  let b = store.bookings.find((x) => x.tripId === currentTripId && x.status === 'chua_chuyen' && (x.base ?? x.amount) === c.payAmount);
  if (!b) {
    b = { code: bookingCode(), tripId: currentTripId, createdAt: Date.now(), base: c.payAmount, amount: c.payAmount, discount: null, status: 'chua_chuyen', people: plan.trip.people,
      flights: c.flight ? { out: flightOut, back: flightBack, total: c.flightsTotal } : null, hotel: c.hotel ? { id: c.hotel.id, name: c.hotel.name, stars: c.hotel.stars, total: c.hotelTotal, checkIn: plan.trip.startDate, checkOut: plan.trip.endDate } : null };
    store.bookings.unshift(b); persist();
  }
  renderPay(b); sheet.hidden = false; lastFocus = document.activeElement; $('sheetClose').focus();
}
function renderPay(b) {
  payBooking = b;
  const isLive = live();
  const payload = vietQrPayload({ bin: PAYMENT.bankBin, account: PAYMENT.accountNumber, amount: b.amount, content: (PAYMENT.contentPrefix || 'ARROW') + ' ' + b.code });
  const content = transferContent((PAYMENT.contentPrefix || 'ARROW') + ' ' + b.code);
  const row = (k, v, copy) => '<div class="cl"><span>' + k + '</span><b>' + esc(v) + (copy ? ' <button type="button" class="btn quiet" style="min-height:36px;padding:0 10px" data-copy="' + esc(copy) + '">Chép</button>' : '') + '</b></div>';
  let h = '<div class="pay"><h2>Thanh toán chuyến bay và khách sạn</h2>';
  h += isLive ? '' : '<div class="warn" style="margin:8px 0">CHẾ ĐỘ THỬ. Chuyến bay, khách sạn và giá đều là dữ liệu mẫu nên mã QR bị phủ chữ MẪU và không dùng để chuyển tiền.</div>';
  h += '<div class="cost">' + (b.flights ? '<div class="cl"><span>Vé máy bay<small>' + esc(b.flights.out.flightNo) + ' + ' + esc(b.flights.back.flightNo) + ' · ' + b.people + ' khách</small></span><b>' + moneyVnd(b.flights.total) + '</b></div>' : '') +
    (b.hotel ? '<div class="cl"><span>Khách sạn<small>' + esc(b.hotel.name) + '</small></span><b>' + moneyVnd(b.hotel.total) + '</b></div>' : '') + (b.discount ? '<div class="cl"><span>Giảm giá<small>' + esc(b.discount.label) + '</small></span><b>−' + moneyVnd(b.discount.amount) + '</b></div>' : '') + '<div class="cl tot"><span>Cần thanh toán</span><b>' + moneyVnd(b.amount) + '</b></div></div>';
  h += promoBoxHtml(b);
  h += '<div class="qrbox">' + (qrSvg(payload) || '<p class="hint">Không tải được thư viện mã QR, hãy chuyển khoản theo thông tin bên dưới.</p>') + (isLive ? '' : '<div class="qr-wm" aria-hidden="true">MẪU</div>') + '</div>';
  h += '<div class="cost">' + row('Ngân hàng', PAYMENT.bankName) + row('Số tài khoản', PAYMENT.accountNumber, PAYMENT.accountNumber) + (PAYMENT.accountName ? row('Chủ tài khoản', PAYMENT.accountName) : '') +
    row('Số tiền', moneyVnd(b.amount), String(b.amount)) + row('Nội dung', content, content) + '</div>';
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
  b.status = live() ? 'cho_xac_nhan' : 'thu';
  if (live() && b.discount && b.discount.kind === 'voucher') { const v = store.vouchers.find((x) => x.code === b.discount.code); if (v) v.used = true; }
  persist();
  addNotif(live() ? 'Đã ghi nhận chuyển khoản' : 'Đã ghi nhận đặt thử', live() ? 'Mã ' + b.code + ' · ' + money(b.amount) + '. Chúng tôi sẽ đối chiếu giao dịch rồi xác nhận vé và phòng.' : 'Mã ' + b.code + '. Đây là bản thử, chưa có thanh toán thật và chưa đặt chỗ thật.');
  renderPay(b); renderTrips();
});

/* ---------- Thao tác trong màn Tạo mới ---------- */
$('out').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const act = b.dataset.act, di = +b.dataset.d, ii = +b.dataset.i;
  if (act === 'detail') { openDetail(di, b.dataset.id); return; }
  if (act === 'booktab') { bookTab = bookTab === b.dataset.id ? null : b.dataset.id; render(); const t = document.getElementById('bt-' + b.dataset.id); if (t) t.focus(); return; }
  if (act === 'final') { finalized = true; render(); const f = document.querySelector('section.final'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (act === 'fout') { flightOut = flightLists().out.find((f) => f.id === b.dataset.id) || flightOut; savedOk = false; render(); return; }
  if (act === 'fback') { flightBack = flightLists().back.find((f) => f.id === b.dataset.id) || flightBack; savedOk = false; render(); return; }
  if (act === 'hotel') { hotelId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'airline') { const id = b.dataset.id; airlineFilter = id === 'all' ? [] : airlineFilter.includes(id) ? airlineFilter.filter((x) => x !== id) : [...airlineFilter, id]; render(); return; }
  if (act === 'hstar') { const id = b.dataset.id, n = +id; hotelStars = id === 'all' ? [] : hotelStars.includes(n) ? hotelStars.filter((x) => x !== n) : [...hotelStars, n]; render(); return; }
  if (act === 'addplace') { openAddPlace(di); return; }
  if (act === 'optimize') { optimizeDay(di); return; }
  if (act === 'hoteldetail') { openHotelDetail(b.dataset.id); return; }
  if (act === 'needflight') { needFlight = !needFlight; savedOk = false; render(); return; }
  if (act === 'needhotel') { needHotel = !needHotel; savedOk = false; render(); return; }
  if (act === 'book') { startBooking(); return; }
  if (act === 'transport') { transportId = b.dataset.id; savedOk = false; render(); return; }
  if (act === 'owntransport') { ownTransport = !ownTransport; savedOk = false; render(); return; }
  if (act === 'save') { saveTrip(); render(); return; }
  if (act === 'swap') { swapOpen = swapOpen && swapOpen.d === di && swapOpen.i === ii ? null : { d: di, i: ii }; render(); return; }
  if (act === 'undo') { const s = undoStack.pop(); plan.days = s.days; swapOpen = null; savedOk = false; render(); return; }
  snap(); dirtyEdits = true;
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
function closeSheet() { sheet.hidden = true; addCtx = null; attTrip = null; attUrls.forEach((u) => URL.revokeObjectURL(u)); attUrls = []; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function openDetail(di, id) {
  const dayPlaces = plan.days[di].items.filter((i) => i.place).map((i) => i.place);
  const place = dayPlaces.find((p) => p.id === id);
  if (!place) return;
  lastFocus = document.activeElement;
  detailPlace = place.id; detailHotel = null;
  $('sheetBody').innerHTML = placeDetailHtml(place, dayPlaces) + placeExtrasHtml(place);
  sheet.hidden = false; $('sheetClose').focus(); renderMyPhotos();
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
  thien_nhien: { styles: ['thien_nhien'] },
  check_in: { styles: ['check_in'] },
  thu_gian: { styles: ['thu_gian'] },
};
/* ---------- Theo dõi lịch trình: bắt đầu chuyến, vị trí hiện tại, điểm đã đi qua, gợi ý gần đó ---------- */
let trackPos = null, trackWatch = null, trackStatus = 'off', trackErr = '';
let trackCat = 'checkin', nearbyItems = [], nearbyLoading = false, nearbyErr = '', nearbyToken = 0, nearbyFrom = null, nearbySrc = '', trackArmedEnd = false;

function trackTrip() { return store.track ? store.trips.find((x) => x.id === store.track.tripId) || null : null; }
function trackDayIdx(s) {
  const t = store.track;
  if (t.day != null && s.days[t.day]) return t.day;
  const i = s.days.findIndex((d) => d.date === todayStr());
  return i >= 0 ? i : 0;
}
function trackStops(s, di) {
  const seen = new Set(), v = store.track.visited;
  return s.days[di].items.filter((i) => i.placeId && placeById(i.placeId)).filter((i) => !seen.has(i.placeId) && seen.add(i.placeId))
    .map((i) => ({ place: placeById(i.placeId), visited: !!v[i.placeId], at: v[i.placeId] || null }));
}
const nextStop = (stops) => stops.find((x) => !x.visited) || null;
const trackCenter = (stops) => (trackPos ? { lat: trackPos.lat, lng: trackPos.lng, label: 'vị trí của bạn' } : (nextStop(stops) || stops[0]) ? { lat: (nextStop(stops) || stops[0]).place.lat, lng: (nextStop(stops) || stops[0]).place.lng, label: 'điểm tiếp theo' } : null);
const hhmm = (ts) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function markVisited(pid, ts = Date.now()) {
  const t = store.track; if (!t || t.visited[pid]) return false;
  t.visited[pid] = ts; persist(); return true;
}
function startTrack(id) {
  const s = store.trips.find((x) => x.id === id); if (!s) return;
  store.track = { tripId: id, startedAt: Date.now(), visited: {}, day: null };
  store.track.day = Math.max(0, s.days.findIndex((d) => d.date === todayStr()));
  persist(); nearbyItems = []; nearbyFrom = null; trackArmedEnd = false;
  addNotif('Đã bắt đầu chuyến đi', s.trip.destination + ' ' + fmtDate(s.trip.startDate) + ' – ' + fmtDate(s.trip.endDate) + '. Bật vị trí để app đánh dấu những nơi bạn đã đến.');
  go('track');
}
function endTrack() {
  const s = trackTrip(), t = store.track; if (!t) return;
  const all = s ? [...new Set(s.days.flatMap((d) => d.items.map((i) => i.placeId).filter(Boolean)))] : [], done = all.filter((id) => t.visited[id]).length;
  stopGps(); store.track = null; persist(); trackArmedEnd = false; trackPos = null; nearbyItems = [];
  addNotif('Chuyến đi đã kết thúc', 'Bạn đã đi qua ' + done + '/' + all.length + ' địa điểm. Vào Khoảnh khắc để thêm ảnh và nhận xét cho album kỷ niệm.');
  if (s) { momTrip = s.id; momChosen = true; }
  toast('Đã kết thúc chuyến đi. Ghi lại khoảnh khắc nhé!'); go('moments');
}

/* Định vị: dùng vị trí của thiết bị qua trình duyệt. Không đăng nhập Google, không lưu và không gửi vị trí đi đâu. */
function stopGps(render = true) {
  if (trackWatch != null && navigator.geolocation) navigator.geolocation.clearWatch(trackWatch);
  trackWatch = null; if (trackStatus !== 'off') trackStatus = 'off'; if (render && currentScreen === 'track') renderTrack();
}
function startGps() {
  if (!('geolocation' in navigator)) { trackErr = 'Thiết bị hoặc trình duyệt này không hỗ trợ định vị. Hãy chọn vị trí thủ công.'; renderTrack(); return; }
  trackErr = ''; trackStatus = 'asking'; renderTrack();
  trackWatch = navigator.geolocation.watchPosition((p) => {
    trackPos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, src: 'gps', at: Date.now() };
    trackStatus = 'on'; trackErr = ''; onPos();
  }, (err) => {
    trackWatch = null; trackStatus = 'off';
    trackErr = err.code === 1 ? 'Chưa cho phép vị trí. Bản xem trước trong claude.ai chặn định vị, hãy mở bản web GitHub Pages hoặc chọn vị trí thủ công.' : err.code === 2 ? 'Không xác định được vị trí lúc này. Thử ra chỗ thoáng hơn hoặc chọn vị trí thủ công.' : 'Chờ vị trí quá lâu. Thử lại hoặc chọn vị trí thủ công.';
    renderTrack();
  }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
}
function onPos() {
  const s = trackTrip(); if (!s || !store.track) return;
  const stops = trackStops(s, trackDayIdx(s));
  stops.filter((x) => !x.visited && reachedStop(trackPos, x.place)).forEach((x) => {
    if (markVisited(x.place.id)) { toast('Bạn đã đến ' + x.place.name); addNotif('Đã đến ' + x.place.name, 'Đánh dấu lúc ' + hhmm(Date.now()) + '. Nhớ chụp ảnh lưu lại khoảnh khắc nhé.'); }
  });
  const c = trackCenter(stops);
  if (!nearbyFrom || (c && straightKm(nearbyFrom, c) > 0.3)) refreshNearby(); else renderTrack();
}

/* Gợi ý gần đó: danh mục của app + dữ liệu mở OpenStreetMap (khi gọi được mạng) */
async function refreshNearby() {
  const s = trackTrip(); if (!s) return;
  const stops = trackStops(s, trackDayIdx(s)), c = trackCenter(stops); if (!c) return;
  const token = ++nearbyToken; nearbyFrom = { lat: c.lat, lng: c.lng }; nearbyLoading = true; nearbyErr = '';
  const exclude = stops.map((x) => x.place.id);
  let items = catalogNearby(trackCat, c, DATA.places, { exclude }); nearbySrc = items.length ? 'catalog' : '';
  nearbyItems = items; renderTrack();
  try {
    const osm = await fetchOverpass({ cat: trackCat, lat: c.lat, lng: c.lng, radiusM: 2000 });
    if (token !== nearbyToken) return;
    items = [...items, ...osm].sort((a, b) => a.km - b.km).slice(0, 14); nearbySrc = osm.length ? (items.some((x) => x.source === 'catalog') ? 'both' : 'osm') : nearbySrc;
    if (!osm.length) nearbyErr = 'Dữ liệu bản đồ mở chưa có địa điểm loại này quanh đây.';
  } catch (e) {
    if (token !== nearbyToken) return;
    nearbyErr = 'Không tải được dữ liệu bản đồ mở (mạng hoặc trình duyệt chặn).';
  }
  nearbyItems = items; nearbyLoading = false; renderTrack();
}

function renderTrack() {
  const box = $('trackBody'); if (!box) return;
  const s = trackTrip();
  if (store.track && !s) { store.track = null; persist(); }
  if (!store.track) {
    box.innerHTML = '<div class="panel"><b>Bắt đầu chuyến đi</b><p class="hint" style="margin:6px 0 0">Chọn một lịch trình đã lưu. Khi bắt đầu, app đánh dấu những nơi bạn đã đến, hiện vị trí của bạn trên bản đồ và gợi ý điểm check-in, quán ăn, cây xăng, ATM ở gần.</p></div>' +
      (store.trips.length ? store.trips.map((x) => '<div class="panel trip"><h3>' + esc(x.trip.destination) + ' · ' + daysBetween(x.trip.startDate, x.trip.endDate) + ' ngày</h3><div class="sub">' + fmtDate(x.trip.startDate) + ' – ' + fmtDate(x.trip.endDate) + ' · ' + esc(RULES[x.trip.audience].label) + '</div><div class="acts"><button type="button" class="go" style="width:auto;padding:0 20px" data-trackstart="' + x.id + '">Bắt đầu chuyến này</button></div></div>').join('')
        : '<div class="panel empty"><b>Chưa có lịch trình đã lưu</b>Tạo và lưu một lịch trình để bắt đầu theo dõi.<button class="go" type="button" data-go="create">Lên lịch trình</button></div>') +
      (plan && !currentTripId ? '<p class="hint">Bạn đang soạn một lịch trình chưa lưu. Hãy lưu lịch trình trước khi bắt đầu.</p>' : '');
    return;
  }
  const di = trackDayIdx(s), stops = trackStops(s, di), nxt = nextStop(stops), done = stops.filter((x) => x.visited).length;
  const c = trackCenter(stops), pct = stops.length ? Math.round((done / stops.length) * 100) : 0;
  const poiShown = nearbyItems.slice(0, 8);
  let h = '<div class="panel"><div class="trip-top"><div><b>' + esc(s.trip.destination) + ' · ' + fmtDate(s.trip.startDate) + ' – ' + fmtDate(s.trip.endDate) + '</b><div class="hint">Bắt đầu lúc ' + hhmm(store.track.startedAt) + ' · ' + fmtDate(iso(new Date(store.track.startedAt))) + '</div></div></div>' +
    '<div class="chips" style="margin-top:10px" role="group" aria-label="Chọn ngày">' + s.days.map((d, i) => '<button type="button" data-trk="day" data-v="' + i + '" aria-pressed="' + (i === di) + '">Ngày ' + d.dayIndex + ' · ' + fmtDate(d.date) + '</button>').join('') + '</div>' +
    '<div style="margin-top:12px"><b>' + done + '/' + stops.length + ' điểm đã qua</b><div class="bar trkbar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ"><i style="width:' + pct + '%"></i></div></div></div>';
  // vị trí
  const gpsOn = trackStatus === 'on' || trackStatus === 'asking';
  h += '<div class="panel"><b>Vị trí của bạn</b>' +
    '<p class="hint" style="margin:4px 0 8px">' + (trackStatus === 'on' && trackPos ? (trackPos.src === 'gps' ? 'Đang theo dõi bằng định vị thiết bị, sai số khoảng ' + Math.round(trackPos.acc) + ' m.' : 'Vị trí do bạn chọn tại ' + esc(trackPos.name || '') + '.') : trackStatus === 'asking' ? 'Đang chờ bạn cho phép vị trí…' : trackPos && trackPos.src === 'manual' ? 'Vị trí do bạn chọn tại ' + esc(trackPos.name || '') + '.' : 'Chưa bật vị trí.') + '</p>' +
    (trackErr ? '<div class="warn" style="margin-bottom:8px">' + esc(trackErr) + '</div>' : '') +
    '<div class="acts" style="margin-top:0"><button type="button" class="' + (gpsOn ? 'btn danger' : 'go') + '" style="' + (gpsOn ? '' : 'width:auto;padding:0 20px;') + '" data-trk="' + (gpsOn ? 'gpsoff' : 'gps') + '">' + (gpsOn ? 'Tắt định vị' : 'Bật vị trí hiện tại') + '</button>' +
    (trackPos ? '<a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="' + mapsPlaceUrl(trackPos.lat, trackPos.lng) + '" target="_blank" rel="noopener">Mở trên Google Maps</a>' : '') + '</div>' +
    '<label for="trkAt" style="margin-top:12px">Hoặc chọn nơi bạn đang đứng</label><div class="row" style="grid-template-columns:1fr auto;gap:8px"><select id="trkAt">' + stops.map((x) => '<option value="' + x.place.id + '">' + esc(x.place.name) + '</option>').join('') + '</select><button type="button" class="btn" data-trk="here">Tôi ở đây</button></div>' +
    '<p class="hint" style="margin-top:8px">App dùng vị trí do thiết bị cung cấp (trên Android là dịch vụ vị trí của Google). Không cần đăng nhập Google, vị trí không được lưu và không gửi đi đâu.</p></div>';
  // bản đồ
  h += '<div class="panel" style="padding:12px">' + trackMapSvg({ stops: stops.map((x) => ({ place: x.place, visited: x.visited, next: nxt && nxt.place.id === x.place.id })), current: trackPos, pois: poiShown }) +
    '<div class="legend" style="margin-top:8px"><span><i style="background:#2563eb;border-radius:50%"></i>Bạn</span><span><i style="background:#15803d;border-radius:50%"></i>Đã đến</span><span><i style="background:#D9480F;border-radius:50%"></i>Tiếp theo</span><span><i style="background:#7c3aed"></i>Gợi ý gần đó</span></div></div>';
  // tiếp theo
  if (nxt) {
    h += '<div class="panel"><div class="hint">Điểm tiếp theo</div><b style="font-size:18px">' + esc(nxt.place.name) + '</b>' + (trackPos ? '<div class="hint">Cách bạn khoảng ' + fmtDist(straightKm(trackPos, nxt.place)) + ' (đường chim bay)</div>' : '') +
      '<div class="acts"><a class="go" style="width:auto;padding:0 20px;display:inline-flex;align-items:center;text-decoration:none" href="' + mapsDirectionsUrl(nxt.place.lat, nxt.place.lng) + '" target="_blank" rel="noopener">Chỉ đường</a><button type="button" class="btn" data-trk="arrive" data-v="' + nxt.place.id + '">Đã đến</button></div></div>';
  } else if (stops.length) h += '<div class="panel"><b>Bạn đã đi hết các điểm của ngày này</b><p class="hint">Chọn ngày khác hoặc kết thúc chuyến đi để ghi lại khoảnh khắc.</p></div>';
  // danh sách điểm
  h += '<div class="panel"><b>Các điểm trong ngày</b>' + stops.map((x, i) => '<div class="rule trkrow"><span><span class="trkn' + (x.visited ? ' ok' : nxt && nxt.place.id === x.place.id ? ' nx' : '') + '">' + (x.visited ? '✓' : i + 1) + '</span> ' + esc(x.place.name) +
    '<small style="display:block;color:var(--muted)">' + (x.visited ? 'Đã đến lúc ' + hhmm(x.at) : trackPos ? 'Cách ' + fmtDist(straightKm(trackPos, x.place)) : 'Chưa đến') + '</small></span>' +
    '<button type="button" class="btn quiet" data-trk="' + (x.visited ? 'unvisit' : 'arrive') + '" data-v="' + x.place.id + '">' + (x.visited ? 'Bỏ đánh dấu' : 'Đã đến') + '</button></div>').join('') + '</div>';
  // gợi ý gần đó
  const cat = NEARBY_CATS[trackCat];
  h += '<div class="panel"><b>Gợi ý gần ' + (c ? esc(c.label) : '') + '</b><div class="chips" style="margin:8px 0" role="group" aria-label="Loại gợi ý">' + Object.entries(NEARBY_CATS).map(([k, v]) => '<button type="button" data-trk="cat" data-v="' + k + '" aria-pressed="' + (k === trackCat) + '">' + esc(v.label) + '</button>').join('') + '</div>' +
    (nearbyLoading ? '<p class="hint">Đang tìm…</p>' : '') +
    (nearbyItems.length ? nearbyItems.map((x) => '<div class="rule trkrow"><span><span class="dot" style="background:' + cat.color + '"></span> <b>' + esc(x.name) + '</b><small style="display:block;color:var(--muted)">' + fmtDist(x.km) + (x.open ? ' · ' + esc(x.open) : '') + (x.note ? ' · ' + esc(x.note.slice(0, 70)) : '') + (x.source === 'osm' ? ' · OpenStreetMap' : '') + '</small></span><a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="' + mapsDirectionsUrl(x.lat, x.lng) + '" target="_blank" rel="noopener">Chỉ đường</a></div>').join('')
      : (nearbyLoading ? '' : '<p class="hint">Bấm tải để xem gợi ý quanh ' + (c ? esc(c.label) : 'bạn') + '.</p>')) +
    (nearbyErr ? '<p class="hint late">' + esc(nearbyErr) + '</p>' : '') +
    '<div class="acts"><button type="button" class="btn" data-trk="reload">Tải lại gợi ý</button>' + (c ? '<a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="' + mapsSearchUrl(trackCat, c.lat, c.lng) + '" target="_blank" rel="noopener">Tìm ' + esc(cat.label.toLowerCase()) + ' trên Google Maps</a>' : '') + '</div>' +
    '<p class="hint" style="margin-top:8px">Check-in và quán ăn lấy từ danh mục của app (mẫu). Cây xăng, ATM, nhà thuốc lấy từ OpenStreetMap khi có mạng, © OpenStreetMap contributors. Giờ mở cửa và vị trí chỉ để tham khảo.</p></div>';
  h += '<button type="button" class="btn ' + (trackArmedEnd ? 'danger' : 'quiet') + '" data-trk="end" style="min-height:48px">' + (trackArmedEnd ? 'Bấm lại để kết thúc chuyến đi' : 'Kết thúc chuyến đi') + '</button>';
  box.innerHTML = h;
}

$('trackBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-trk]'); if (!b) return;
  const a = b.dataset.trk, v = b.dataset.v, s = trackTrip();
  if (a !== 'end') trackArmedEnd = false;
  if (a === 'gps') { startGps(); return; }
  if (a === 'gpsoff') { stopGps(false); trackStatus = 'off'; renderTrack(); return; }
  if (a === 'day' && s) { store.track.day = +v; persist(); nearbyFrom = null; refreshNearby(); return; }
  if (a === 'arrive') { const p = placeById(v); if (markVisited(v) && p) { toast('Đã đánh dấu: ' + p.name); } nearbyFrom = null; refreshNearby(); return; }
  if (a === 'unvisit') { delete store.track.visited[v]; persist(); nearbyFrom = null; refreshNearby(); return; }
  if (a === 'cat') { trackCat = v; nearbyItems = []; nearbyFrom = null; refreshNearby(); return; }
  if (a === 'reload') { nearbyFrom = null; refreshNearby(); return; }
  if (a === 'here') {
    const p = placeById($('trkAt').value); if (!p) return;
    trackPos = { lat: p.lat, lng: p.lng, acc: 30, src: 'manual', name: p.name, at: Date.now() };
    if (trackStatus !== 'asking') trackStatus = trackWatch != null ? 'on' : 'off';
    if (markVisited(p.id)) toast('Đã đánh dấu: ' + p.name);
    nearbyFrom = null; refreshNearby(); return;
  }
  if (a === 'end') { if (!trackArmedEnd) { trackArmedEnd = true; renderTrack(); return; } endTrack(); }
});

/* ---------- Khoảnh khắc của tôi: ảnh, sao, nhận xét theo từng địa điểm đã đi, gom thành album ---------- */
let momTrip = null, momChosen = false, momQ = '', momToken = 0, momUrls = [], albumUrls = [], momCounts = {};
const momOpen = new Set();
const momData = (key, pid) => (store.moments[key] || {})[pid] || { rating: 0, text: '' };
const starsText = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);
const momLine = (rating, count) => (rating ? starsText(rating) : 'Chưa đánh giá') + ' · ' + (count ? count + ' ảnh' : 'chưa có ảnh của bạn');
function setMom(key, pid, patch) {
  const before = momData(key, pid), first = !before.rating && patch.rating > 0;
  store.moments[key] = store.moments[key] || {};
  store.moments[key][pid] = { ...before, ...patch, at: Date.now() };
  persist();
  if (first) givePoints('moment');
}
function placeById(id) { return DATA.places.find((p) => p.id === id); }

// Các chuyến có thể ghi lại khoảnh khắc: chuyến đã lưu, lịch đang soạn chưa lưu, hoặc chọn địa điểm bất kỳ
function momTrips() {
  const list = store.trips.map((s) => ({ key: s.id, label: s.trip.destination + ' ' + fmtDate(s.trip.startDate) + '–' + fmtDate(s.trip.endDate) }));
  if (plan && !currentTripId) list.unshift({ key: 'draft', label: 'Lịch đang soạn' });
  list.push({ key: 'free', label: 'Chọn địa điểm khác' });
  return list;
}
// Danh sách địa điểm theo ngày của một chuyến
function momInfo(key) {
  const seen = new Set(), groups = [];
  const take = (label, ids) => { const places = ids.filter((id) => !seen.has(id) && placeById(id)).map((id) => { seen.add(id); return placeById(id); }); if (places.length) groups.push({ label, places }); };
  if (key === 'free') {
    const k = fold(momQ.trim());
    take('Tất cả địa điểm', DATA.places.filter((p) => p.status !== 'closed' && (!k || fold(p.name).includes(k))).map((p) => p.id));
    return { title: 'Album của tôi', sub: 'Các địa điểm bạn chọn', groups };
  }
  if (key === 'draft') {
    plan.days.forEach((d) => take('Ngày ' + d.dayIndex + ' · ' + fmtDate(d.date), d.items.filter((i) => i.place).map((i) => i.place.id)));
    return { title: plan.trip.destination + ' ' + fmtDate(plan.trip.startDate) + ' – ' + fmtDate(plan.trip.endDate), sub: 'Lịch đang soạn', groups };
  }
  const s = store.trips.find((x) => x.id === key);
  if (!s) return { title: '', sub: '', groups };
  s.days.forEach((d) => take('Ngày ' + d.dayIndex + ' · ' + fmtDate(d.date), d.items.filter((i) => i.placeId).map((i) => i.placeId)));
  return { title: s.trip.destination + ' ' + fmtDate(s.trip.startDate) + ' – ' + fmtDate(s.trip.endDate), sub: daysBetween(s.trip.startDate, s.trip.endDate) + ' ngày · ' + RULES[s.trip.audience].label, groups };
}
function momStats(info, key) {
  const places = info.groups.flatMap((g) => g.places);
  let photos = 0, rated = 0, sum = 0, touched = 0;
  places.forEach((p) => {
    const d = momData(key, p.id), c = momCounts[p.id] || 0;
    photos += c; if (d.rating) { rated++; sum += d.rating; } if (c || d.rating || d.text) touched++;
  });
  return { places: places.length, photos, rated, touched, avg: rated ? Math.round((sum / rated) * 10) / 10 : 0 };
}
function momStatsHtml(info, key) {
  const st = momStats(info, key);
  return '<div><b>' + st.photos + ' ảnh · ' + st.touched + '/' + st.places + ' nơi có khoảnh khắc</b>' + (momPending(key) ? '<span class="pending">Có ' + momPending(key) + ' khoảnh khắc chưa đăng, mở thẻ và bấm Đăng</span>' : '') + '<span>' + (st.rated ? 'Điểm trung bình ' + st.avg.toFixed(1) + ' ★ trên ' + st.rated + ' nơi' : 'Chưa chấm sao nơi nào') + '</span></div>' +
    '<button type="button" class="go" data-album' + (st.touched ? '' : ' disabled') + '>Xem album kỷ niệm</button>' +
    '<button type="button" class="btn reel-btn" data-reel' + (st.photos ? '' : ' disabled') + '>▶ Tạo video kỷ niệm có nhạc</button>' + (st.photos ? '' : '<span class="hint">Đăng ít nhất một ảnh để tạo video.</span>');
}

// Bản nháp theo từng địa điểm: ảnh, sao, nhận xét chỉ được lưu khi bấm "Đăng khoảnh khắc"
const momDraft = {};
const getDraft = (key, pid) => (momDraft[key + ':' + pid] = momDraft[key + ':' + pid] || { files: [], rating: null, text: null });
function momEff(key, pid) {
  const saved = momData(key, pid), dr = momDraft[key + ':' + pid];
  const rating = dr && dr.rating != null ? dr.rating : saved.rating, text = dr && dr.text != null ? dr.text : saved.text, files = dr ? dr.files : [];
  const dirty = !!(files.length || (dr && dr.rating != null && dr.rating !== saved.rating) || (dr && dr.text != null && dr.text !== saved.text));
  return { saved, rating, text, files, dirty };
}
const momPending = (key) => Object.keys(momDraft).filter((k) => k.startsWith(key + ':') && momEff(key, k.slice(key.length + 1)).dirty).length;
function dropDraft(key, pid) { const dr = momDraft[key + ':' + pid]; if (dr) dr.files.forEach((f) => URL.revokeObjectURL(f.url)); delete momDraft[key + ':' + pid]; }
function momActionsHtml(pid) {
  const e = momEff(momTrip, pid), has = e.saved.rating || e.saved.text || (momCounts[pid] || 0);
  if (e.dirty) return '<button type="button" class="go" data-mompost="' + pid + '">Đăng khoảnh khắc</button><button type="button" class="btn quiet" data-momcancel="' + pid + '" style="margin-top:8px;width:100%">Huỷ thay đổi</button>';
  return has ? '<p class="saved-ok">Đã đăng ✓</p>' : '<p class="hint">Thêm ảnh, chấm sao hoặc viết cảm nhận rồi bấm Đăng khoảnh khắc.</p>';
}
async function renderMomBody() {
  const token = ++momToken, keys = momTrips();
  // Chưa tự chọn chuyến thì luôn theo chuyến mới nhất, tự cập nhật khi vừa tạo hoặc lưu lịch trình
  if (!momChosen || !momTrip || !keys.some((k) => k.key === momTrip)) { momChosen = false; momTrip = currentTripId || (store.trips[0] && store.trips[0].id) || (plan ? 'draft' : 'free'); }
  const hadFocus = document.activeElement && document.activeElement.id === 'momQ';
  let photos = [], err = '';
  try { photos = await listPhotosByPrefix(momTrip + ':'); } catch (e) { err = e.message; }
  if (token !== momToken) return;
  momUrls.forEach((u) => URL.revokeObjectURL(u)); momUrls = [];
  const byPlace = {}; momCounts = {};
  photos.forEach((p) => { const pid = p.key.slice(momTrip.length + 1); (byPlace[pid] = byPlace[pid] || []).push(p); momCounts[pid] = (momCounts[pid] || 0) + 1; });
  const info = momInfo(momTrip);
  let h = '<div class="chips" role="group" aria-label="Chọn chuyến">' + keys.map((k) => '<button type="button" data-momtrip="' + esc(k.key) + '" aria-pressed="' + (k.key === momTrip) + '">' + esc(k.label) + '</button>').join('') + '</div>';
  if (!store.trips.length && !plan) h += '<div class="panel hint-card"><b>Bắt đầu từ một chuyến đi</b><p class="hint">Tạo và lưu một lịch trình để ghi lại khoảnh khắc ở từng nơi, hoặc chọn "Chọn địa điểm khác" để ghi lại một nơi bất kỳ.</p><button type="button" class="btn" data-go="create">Lên lịch trình</button></div>';
  if (err) h += '<div class="warn">' + esc(err) + '. Không lưu được ảnh trên trình duyệt này.</div>';
  h += '<div class="panel mstats" id="momStats">' + momStatsHtml(info, momTrip) + '</div>';
  if (momTrip === 'free') h += '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/></svg><input id="momQ" type="search" value="' + esc(momQ) + '" placeholder="Tìm địa điểm" aria-label="Tìm địa điểm" autocomplete="off"></div>';
  if (!info.groups.length) h += '<div class="panel empty"><b>Chưa có địa điểm nào</b>Chuyến này chưa có điểm đến. Hãy chọn chuyến khác.</div>';
  h += info.groups.map((g) => '<h3 class="mgroup">' + esc(g.label) + '</h3>' + g.places.map((p) => {
    const e = momEff(momTrip, p.id), ph = byPlace[p.id] || [], urls = ph.map((x) => { const u = URL.createObjectURL(x.blob); momUrls.push(u); return { id: x.id, u }; });
    // ảnh bên phải thẻ: ảnh bạn đã đăng / vừa chọn, nếu chưa có thì ảnh của địa điểm, không có thì hình minh hoạ
    const bg = urls[0] ? urls[0].u : e.files[0] ? e.files[0].url : p.image || '';
    const thumb = '<span class="mthumb">' + (bg ? '<img src="' + esc(bg) + '" alt="">' : sceneSvg({ scene: p.scene || 'mountain', name: p.name })) + '</span>';
    return '<details class="mom" data-mom="' + p.id + '"' + (momOpen.has(p.id) ? ' open' : '') + '><summary>' +
      '<span class="mt"><b>' + esc(p.name) + '</b><small data-line class="' + (e.dirty ? 'pending' : '') + '">' + momLine(e.rating, ph.length + e.files.length) + (e.dirty ? ' · chưa đăng' : '') + '</small></span>' + thumb + '<span class="chev">›</span></summary><div class="mbody">' +
      '<div class="stars" data-momstars="' + p.id + '" role="group" aria-label="Chấm sao">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" data-momstar="' + n + '" aria-label="' + n + ' sao" aria-pressed="' + (n <= e.rating) + '">★</button>').join('') + '</div>' +
      '<label for="mt-' + p.id + '">Cảm nhận của bạn</label><textarea id="mt-' + p.id + '" data-momtext="' + p.id + '" placeholder="Bạn nhớ gì nhất ở đây?">' + esc(e.text) + '</textarea>' +
      (urls.length ? '<div class="hint" style="margin-top:8px">Ảnh đã đăng</div><div class="myph">' + urls.map((x) => '<figure><img src="' + x.u + '" alt="Ảnh kỷ niệm"><button type="button" data-momdel="' + x.id + '" aria-label="Xoá ảnh đã đăng">×</button></figure>').join('') + '</div>' : '') +
      (e.files.length ? '<div class="hint" style="margin-top:8px">Ảnh chờ đăng</div><div class="myph">' + e.files.map((f, i) => '<figure class="pend"><img src="' + f.url + '" alt="Ảnh chờ đăng"><span class="pendtag">Chưa đăng</span><button type="button" data-momunstage="' + i + '" data-p="' + p.id + '" aria-label="Bỏ ảnh này">×</button></figure>').join('') + '</div>' : '') +
      '<button type="button" class="btn" data-momadd="' + p.id + '" style="margin-top:8px">Thêm ảnh</button>' +
      '<div class="mactions" data-momactions="' + p.id + '">' + momActionsHtml(p.id) + '</div></div></details>';
  }).join('')).join('');
  h += '<input id="momFile" class="sr-only" type="file" accept="image/*" multiple aria-label="Chọn ảnh">';
  $('momBody').innerHTML = h;
  if (hadFocus && $('momQ')) { const q = $('momQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}
const renderMoments = renderMomBody;

function paintMomCard(pid) {
  const e = momEff(momTrip, pid), n = (momCounts[pid] || 0) + e.files.length;
  document.querySelectorAll('[data-momstars="' + pid + '"] button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.momstar <= e.rating)));
  const line = document.querySelector('details[data-mom="' + pid + '"] [data-line]');
  if (line) { line.textContent = momLine(e.rating, n) + (e.dirty ? ' · chưa đăng' : ''); line.className = e.dirty ? 'pending' : ''; }
  const act = document.querySelector('[data-momactions="' + pid + '"]'); if (act) act.innerHTML = momActionsHtml(pid);
  const st = $('momStats'); if (st) st.innerHTML = momStatsHtml(momInfo(momTrip), momTrip);
}
async function postMoment(pid) {
  const key = momTrip + ':' + pid, e = momEff(momTrip, pid); if (!e.dirty) return;
  try {
    for (const f of e.files) { await addPhoto(key, f.blob); givePoints('photo'); }
  } catch (err) { toast('Không lưu được ảnh: ' + err.message); return; }
  const patch = {}; if (e.rating !== e.saved.rating) patch.rating = e.rating; if (e.text !== e.saved.text) patch.text = e.text;
  if (Object.keys(patch).length) setMom(momTrip, pid, patch);
  dropDraft(momTrip, pid); momOpen.add(pid); toast('Đã đăng khoảnh khắc'); renderMomBody();
}
$('momBody').addEventListener('click', (e) => {
  const t = e.target.closest('[data-momtrip],[data-momstar],[data-momadd],[data-momdel],[data-mompost],[data-momcancel],[data-momunstage],[data-album],[data-reel]'); if (!t) return;
  if (t.dataset.momtrip) { momTrip = t.dataset.momtrip; momChosen = true; renderMomBody(); return; }
  if (t.dataset.momstar) {
    const pid = t.closest('[data-momstars]').dataset.momstars, v = +t.dataset.momstar, cur = momEff(momTrip, pid).rating;
    getDraft(momTrip, pid).rating = cur === v ? 0 : v; paintMomCard(pid); return;
  }
  if (t.dataset.momadd) { const f = $('momFile'); f.dataset.place = t.dataset.momadd; f.click(); return; }
  if (t.dataset.momdel) { deletePhoto(+t.dataset.momdel).then(renderMomBody).catch(() => toast('Không xoá được ảnh')); return; }
  if (t.dataset.mompost) { postMoment(t.dataset.mompost); return; }
  if (t.dataset.momcancel) { dropDraft(momTrip, t.dataset.momcancel); renderMomBody(); return; }
  if (t.dataset.momunstage !== undefined) { const dr = getDraft(momTrip, t.dataset.p); const [f] = dr.files.splice(+t.dataset.momunstage, 1); if (f) URL.revokeObjectURL(f.url); renderMomBody(); return; }
  if (t.hasAttribute('data-album')) openPage('album');
  if (t.hasAttribute('data-reel')) openPage('reel');
});
$('momBody').addEventListener('change', async (e) => {
  if (e.target.id !== 'momFile') return;
  const pid = e.target.dataset.place, dr = pid && getDraft(momTrip, pid); if (!pid) return;
  const cap = lim().photosPerPlace, room = cap === Infinity ? Infinity : Math.max(0, cap - (momCounts[pid] || 0) - dr.files.length);
  if (room <= 0) { needPro('Thêm hơn ' + cap + ' ảnh mỗi nơi'); e.target.value = ''; return; }
  const files = [...e.target.files].slice(0, room); e.target.value = '';
  momOpen.add(pid);
  try { for (const f of files) { const blob = await resizeImage(f); dr.files.push({ blob, url: URL.createObjectURL(blob) }); } } catch (err) { toast('Không xử lý được ảnh: ' + err.message); }
  renderMomBody();
});
$('momBody').addEventListener('input', (e) => {
  if (e.target.dataset.momtext) { getDraft(momTrip, e.target.dataset.momtext).text = e.target.value; paintMomCard(e.target.dataset.momtext); }
  if (e.target.id === 'momQ') { momQ = e.target.value; renderMomBody(); }
});
$('momBody').addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches && d.matches('details[data-mom]')) { if (d.open) momOpen.add(d.dataset.mom); else momOpen.delete(d.dataset.mom); }
}, true);

/* Album kỷ niệm */
function mosaic(urls) {
  const n = urls.length, show = urls.slice(0, 4);
  return '<div class="mos m' + Math.min(n, 4) + '">' + show.map((u, i) => '<div class="mc"><img src="' + u + '" alt="Ảnh kỷ niệm">' + (i === 3 && n > 4 ? '<span class="more">+' + (n - 4) + '</span>' : '') + '</div>').join('') + '</div>';
}
async function fillAlbum() {
  const box = $('albumBody'); if (!box) return;
  albumUrls.forEach((u) => URL.revokeObjectURL(u)); albumUrls = [];
  let photos = [];
  try { photos = await listPhotosByPrefix(momTrip + ':'); } catch (e) { box.innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; return; }
  const by = {}; photos.forEach((p) => { const pid = p.key.slice(momTrip.length + 1); const u = URL.createObjectURL(p.blob); albumUrls.push(u); (by[pid] = by[pid] || []).push(u); });
  const info = momInfo(momTrip);
  const entries = info.groups.map((g) => ({ label: g.label, items: g.places.map((p) => ({ p, d: momData(momTrip, p.id), urls: by[p.id] || [] })).filter((x) => x.urls.length || x.d.rating || x.d.text) })).filter((g) => g.items.length);
  if (!entries.length) { box.innerHTML = '<div class="panel empty"><b>Chưa có khoảnh khắc nào</b>Thêm ảnh, chấm sao hoặc viết cảm nhận cho một địa điểm để album xuất hiện.</div>'; return; }
  const all = entries.flatMap((g) => g.items);
  const best = [...all].filter((x) => x.urls.length).sort((a, b) => b.d.rating - a.d.rating)[0];
  const photoN = all.reduce((n, x) => n + x.urls.length, 0), rated = all.filter((x) => x.d.rating);
  const avg = rated.length ? Math.round((rated.reduce((n, x) => n + x.d.rating, 0) / rated.length) * 10) / 10 : 0;
  let h = '<div class="album"><div class="cover">' + (best ? '<img src="' + best.urls[0] + '" alt="Ảnh bìa album">' : sceneSvg({ scene: 'beach', name: info.title })) + '<div class="cover-shade"></div><div class="cover-in"><small>Album kỷ niệm</small><h2>' + esc(info.title) + '</h2><p>' + esc(info.sub) + '</p></div></div>' +
    '<div class="a-stats"><span><b>' + photoN + '</b> ảnh</span><span><b>' + all.length + '</b> nơi đã ghé</span><span><b>' + (avg ? avg.toFixed(1) + ' ★' : '–') + '</b> trung bình</span></div>';
  entries.forEach((g) => {
    h += '<h3 class="a-day">' + esc(g.label) + '</h3>';
    g.items.forEach((x) => {
      h += '<article class="a-page">' + (x.urls.length ? mosaic(x.urls) : '') + '<h4>' + esc(x.p.name) + '</h4>' + (x.d.rating ? '<div class="a-stars" aria-label="' + x.d.rating + ' sao">' + starsText(x.d.rating) + '</div>' : '') + (x.d.text ? '<blockquote>' + esc(x.d.text) + '</blockquote>' : '') + '</article>';
    });
  });
  box.innerHTML = h + '<p class="hint" style="text-align:center">Album lưu trên thiết bị này. Chia sẻ album cho người khác cần máy chủ, sẽ có ở bản sau.</p></div>';
}
function pageAlbum() { return '<div id="albumBody"><p class="hint">Đang tạo album…</p></div>'; }



/* ---------- ArrowPro: trang gói, mua bằng QR, mã kích hoạt, dùng thử, ngoại tuyến ---------- */
let proPlan = 'year', proBuy = false, proMsg = '';
const PRO_REASON = { format: 'Mã không đúng dạng. Mã có dạng AP1.xxxx.yyyy, hãy dán nguyên văn.', signature: 'Mã không hợp lệ (sai chữ ký). Kiểm tra lại hoặc liên hệ Arrow Travel.', unsupported: 'Trình duyệt này không kiểm tra được mã. Hãy mở app trên Chrome, Safari hoặc Edge mới.' };
function proCardHtml() {
  const s = proNow();
  return '<button type="button" class="pro-card" data-page="pro"><span class="pro-logo">ArrowPro</span><span><b>' +
    (s.active ? (s.kind === 'trial' ? 'Đang dùng thử, còn ' + s.daysLeft + ' ngày' : 'Đang dùng ArrowPro') : 'Nâng cấp ArrowPro') + '</b><small>' +
    (s.active ? 'Hiệu lực đến ' + s.until.split('-').reverse().join('/') : 'Tối ưu lộ trình, dùng ngoại tuyến, ưu đãi riêng… từ ' + moneyVnd(PRO.plans[0].price) + '/tháng') + '</small></span><span class="chev">›</span></button>';
}
function pagePro() {
  const s = proNow(), plan = PRO.plans.find((x) => x.id === proPlan) || PRO.plans[0];
  let h = '<div class="pro-hero"><span class="pro-logo">ArrowPro</span><h2>Đi nhiều hơn, lo ít hơn</h2><p>' +
    (s.active ? (s.kind === 'trial' ? 'Bạn đang dùng thử, còn ' + s.daysLeft + ' ngày (đến ' + s.until.split('-').reverse().join('/') + ').' : 'Gói của bạn còn hiệu lực đến ' + s.until.split('-').reverse().join('/') + '.') :
      s.kind === 'expired' ? 'Gói ArrowPro của bạn đã hết hạn.' : s.kind === 'trial_over' ? 'Thời gian dùng thử đã hết.' : 'Mở khoá các tính năng dành cho người đi nhiều.') + '</p></div>';
  h += '<div class="panel"><b>Đặc quyền</b><ul class="perks">' + PRO.perks.map((x) => '<li class="pk-' + x.status + '"><span class="pk-i">' + (x.status === 'live' ? '✓' : '…') + '</span><span><b>' + esc(x.title) + (x.status === 'soon' ? ' <em class="pk-badge">Sắp có</em>' : '') + '</b><small>' + esc(x.desc) + '</small></span></li>').join('') + '</ul>' +
    '<p class="hint">Mục "Sắp có" chưa nằm trong gói, giá hiện tại chỉ tính các đặc quyền đã có.</p></div>';
  if (s.kind === 'free' || (!s.active && !store.pro.trialUsed)) h += '<button type="button" class="go" data-pg="protrial">Dùng thử miễn phí 7 ngày</button>';
  h += '<div class="panel"><b>' + (s.kind === 'license' ? 'Gia hạn' : 'Mua gói') + '</b><div class="seg" role="group" aria-label="Chọn gói" style="margin-top:8px">' + PRO.plans.map((x) => '<button type="button" data-pg="proplan" data-v="' + x.id + '" aria-pressed="' + (x.id === proPlan) + '">' + esc(x.label) + ' · ' + moneyVnd(x.price) + (x.note ? '<small style="display:block;font-weight:400">' + esc(x.note) + '</small>' : '') + '</button>').join('') + '</div>' +
    (proBuy ? proPayHtml(plan) : '<button type="button" class="go" data-pg="probuy" style="margin-top:12px">Thanh toán ' + moneyVnd(plan.price) + ' qua QR</button>') + '</div>';
  h += '<div class="panel"><b>Nhập mã kích hoạt</b><p class="hint" style="margin:4px 0 8px">Sau khi chuyển khoản, Arrow Travel gửi mã kích hoạt cho bạn (thường trong 24 giờ).</p><textarea id="proCode" rows="3" placeholder="AP1.…" autocomplete="off" spellcheck="false"></textarea><button type="button" class="btn" data-pg="proactivate" style="margin-top:8px;width:100%">Kích hoạt</button><p class="hint" id="proMsg" aria-live="polite">' + esc(proMsg) + '</p></div>';
  h += offlineHtml();
  h += '<p class="hint">Gói gắn với thiết bị này và lưu trên máy; xoá dữ liệu app vẫn giữ gói. Bản này chưa có tài khoản nên chưa dùng chung một gói trên nhiều máy.</p>';
  return h;
}
function proPayHtml(plan) {
  const isLive = PAYMENT.mode === 'live', code = 'PRO' + Date.now().toString(36).slice(-6).toUpperCase();
  const content = transferContent((PAYMENT.contentPrefix || 'ARROW') + ' ' + code);
  const payload = vietQrPayload({ bin: PAYMENT.bankBin, account: PAYMENT.accountNumber, amount: plan.price, content });
  return '<div class="pay" style="margin-top:12px">' + (isLive ? '' : '<div class="warn" style="margin-bottom:8px">CHẾ ĐỘ THỬ. Chủ app chưa bật thanh toán thật (data/payment.json) nên mã QR bị phủ chữ MẪU, đừng chuyển tiền. Dùng thử 7 ngày để trải nghiệm.</div>') +
    '<div class="qrbox">' + (qrSvg(payload) || '') + (isLive ? '' : '<div class="qr-wm" aria-hidden="true">MẪU</div>') + '</div>' +
    '<div class="cost"><div class="cl"><span>Gói</span><b>ArrowPro ' + esc(plan.label) + '</b></div><div class="cl"><span>Số tiền</span><b>' + moneyVnd(plan.price) + '</b></div><div class="cl"><span>Nội dung</span><b>' + esc(content) + '</b></div><div class="cl"><span>Tài khoản</span><b>' + esc(PAYMENT.bankName) + ' · ' + esc(PAYMENT.accountNumber) + '</b></div></div>' +
    '<p class="hint">Ghi đúng nội dung để được đối chiếu. Chuyển xong, gửi ảnh giao dịch cho Arrow Travel để nhận mã kích hoạt, rồi dán mã ở ô bên dưới.</p></div>';
}
async function activatePro() {
  const code = ($('proCode') && $('proCode').value) || '';
  proMsg = 'Đang kiểm tra…'; $('proMsg').textContent = proMsg;
  const r = await verifyLicense(code, PRO.publicKey);
  if (!r.ok) { proMsg = PRO_REASON[r.reason] || 'Mã không hợp lệ.'; $('proMsg').textContent = proMsg; return; }
  if (Date.parse(r.payload.exp + 'T23:59:59') < Date.now()) { proMsg = 'Mã này đã hết hạn ngày ' + r.payload.exp.split('-').reverse().join('/') + '.'; $('proMsg').textContent = proMsg; return; }
  store.pro = { ...store.pro, license: { id: r.payload.id, plan: r.payload.plan, exp: r.payload.exp } }; persist();
  proMsg = ''; proBuy = false; addNotif('Đã kích hoạt ArrowPro', 'Gói của bạn có hiệu lực đến ' + r.payload.exp.split('-').reverse().join('/') + '. Cảm ơn bạn đã ủng hộ Arrow Travel!');
  toast('Đã kích hoạt ArrowPro'); renderPage();
}

// Dùng ngoại tuyến: service worker lưu mọi tệp app đã tải (chỉ khi mở qua web, không chạy trong khung xem thử)
const swOk = () => 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !(window.claude && typeof window.claude.use === 'function');
function offlineHtml() {
  if (!swOk()) return '<div class="panel"><b>Dùng ngoại tuyến</b><p class="hint" style="margin:4px 0 0">Mở Arrow Travel bằng trình duyệt (bản trên GitHub Pages) để bật dùng ngoại tuyến. Khung xem thử này không hỗ trợ.</p></div>';
  const on = !!store.pro.offline;
  return '<div class="panel"><b>Dùng ngoại tuyến</b><p class="hint" style="margin:4px 0 8px">' + (on ? 'Đã bật. App, dữ liệu địa điểm và ảnh đã lưu vào máy, mở được khi mất mạng. Lịch trình, khoảnh khắc vốn đã lưu trên máy.' : 'Lưu app vào máy để mở khi không có mạng (máy bay, vùng sóng yếu).') + '</p>' +
    '<button type="button" class="btn" data-pg="' + (on ? 'offoff' : 'offon') + '" style="width:100%">' + (on ? 'Tắt và xoá bản lưu' : (isPro() ? 'Bật dùng ngoại tuyến' : 'Bật dùng ngoại tuyến · Pro 🔒')) + '</button></div>';
}
async function enableOffline() {
  if (!isPro()) { needPro('Dùng ngoại tuyến'); return; }
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const urls = new Set([location.href.split('#')[0], ...performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin))]);
    DATA.places.forEach((p) => { if (p.image && !p.image.startsWith('data:')) urls.add(new URL(p.image, location.href).href); });
    Object.values(APP.bookingImages || {}).forEach((x) => urls.add(new URL(x.image, location.href).href));
    const c = await caches.open('arrow-offline-v1');
    await Promise.all([...urls].map((u) => c.add(u).catch(() => {})));
    store.pro.offline = true; persist(); toast('Đã lưu ' + urls.size + ' tệp, dùng được khi mất mạng'); renderPage();
    return reg;
  } catch (err) { toast('Không bật được: ' + (err.message || err)); }
}
async function disableOffline() {
  try { (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister()); await caches.delete('arrow-offline-v1'); } catch (e) { /* bỏ qua */ }
  store.pro.offline = false; persist(); toast('Đã tắt dùng ngoại tuyến'); if (pageName === 'pro') renderPage();
}
// hết gói thì gỡ bản lưu ngoại tuyến
if (store.pro && store.pro.offline && !isPro() && swOk()) disableOffline();

$('pageBody').addEventListener('click', (e) => {
  if (pageName !== 'pro') return;
  const b = e.target.closest('[data-pg]'); if (!b) return;
  const a = b.dataset.pg;
  if (a === 'protrial') { const n = startTrial(store.pro); if (!n) { toast('Thiết bị này đã dùng thử rồi'); return; } store.pro = n; persist(); addNotif('Bắt đầu dùng thử ArrowPro', 'Bạn có 7 ngày dùng mọi đặc quyền ArrowPro.'); toast('Đã bật dùng thử 7 ngày'); renderPage(); return; }
  if (a === 'proplan') { proPlan = b.dataset.v; renderPage(); return; }
  if (a === 'probuy') { proBuy = true; renderPage(); return; }
  if (a === 'proactivate') { activatePro(); return; }
  if (a === 'offon') { enableOffline(); return; }
  if (a === 'offoff') { disableOffline(); }
});

/* ---------- Tệp đính kèm của chuyến đi: vé, xác nhận đặt phòng… (lưu trên máy) ---------- */
let attTrip = null, attUrls = [];
async function openAttach(id) {
  attTrip = id; detailPlace = null; detailHotel = null; addCtx = null; lastFocus = document.activeElement;
  sheet.hidden = false; await renderAttach(); $('sheetClose').focus();
}
async function renderAttach() {
  const s = store.trips.find((x) => x.id === attTrip); if (!s) return;
  attUrls.forEach((u) => URL.revokeObjectURL(u)); attUrls = [];
  let files = [];
  try { files = await listPhotos('att:' + attTrip); } catch (e) { $('sheetBody').innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; return; }
  const cap = lim().attachmentsPerTrip, full = files.length >= cap;
  $('sheetBody').innerHTML = '<div class="pd"><h2>Tệp đính kèm</h2><p class="hint">' + esc(s.trip.destination) + ' ' + fmtDate(s.trip.startDate) + ' – ' + fmtDate(s.trip.endDate) + ' · ' + files.length + (cap === Infinity ? ' tệp' : '/' + cap + ' tệp (bản thường)') + '</p>' +
    '<div class="list">' + (files.length ? files.map((f) => {
      const u = URL.createObjectURL(f.blob); attUrls.push(u);
      const name = f.blob.name || 'tệp', kb = Math.max(1, Math.round(f.blob.size / 1024));
      return '<div class="panel att"><span class="att-i">' + (/^image\//.test(f.blob.type) ? '<img src="' + u + '" alt="">' : /pdf/.test(f.blob.type) ? 'PDF' : 'TỆP') + '</span><span class="grow"><b>' + esc(name) + '</b><small>' + (kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB') + ' · ' + fmtTime(f.at) + '</small></span><a class="btn quiet" href="' + u + '" target="_blank" rel="noopener">Mở</a><button type="button" class="btn quiet" data-attdel="' + f.id + '" aria-label="Xoá ' + esc(name) + '">Xoá</button></div>';
    }).join('') : '<div class="panel empty"><b>Chưa có tệp nào</b>Lưu vé máy bay, xác nhận đặt phòng, lịch tàu xe… để mở nhanh khi đi.</div>') + '</div>' +
    (full ? '<button type="button" class="go" data-propage>Thêm không giới hạn với ArrowPro</button>' : '<label class="go file-go">+ Thêm tệp<input type="file" id="attFile" multiple accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt" hidden></label>') +
    '<p class="hint" style="margin-top:8px">Tệp chỉ nằm trên thiết bị này, không tải lên đâu cả. Không nên lưu giấy tờ tuỳ thân nếu máy dùng chung.</p></div>';
}
$('sheetBody').addEventListener('change', async (e) => {
  if (e.target.id !== 'attFile' || !attTrip) return;
  const cap = lim().attachmentsPerTrip;
  let have = 0; try { have = (await listPhotos('att:' + attTrip)).length; } catch (err) { /* bỏ qua */ }
  const files = [...e.target.files].slice(0, cap === Infinity ? Infinity : Math.max(0, cap - have)); e.target.value = '';
  for (const f of files) { try { await addPhoto('att:' + attTrip, f); } catch (err) { toast('Không lưu được ' + f.name); } }
  if (e.target.files && files.length < e.target.files.length) toast('Bản thường lưu tối đa ' + cap + ' tệp mỗi chuyến');
  renderAttach();
});
$('sheetBody').addEventListener('click', async (e) => {
  const d = e.target.closest('[data-attdel]'); if (!d || !attTrip) return;
  await deletePhoto(+d.dataset.attdel).catch(() => {}); renderAttach();
});

/* ---------- Video kỷ niệm: ảnh đã đăng + nhạc nền, tạo ngay trên máy ---------- */
var reel = null; // var: go() gọi stopReel() trước khi tới dòng này lúc khởi động. { plan, imgs, urls, music, userBuf, userName, perPhoto, player, outUrl, busy }
function stopReel() {
  if (!reel) return;
  if (reel.player) reel.player.destroy();
  reel.urls.forEach((u) => URL.revokeObjectURL(u)); if (reel.outUrl) URL.revokeObjectURL(reel.outUrl);
  reel = null;
}
const fmtSec = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function pageReel() { return '<div id="reelBody"><p class="hint">Đang chuẩn bị video…</p></div>'; }
async function fillReel() {
  const box = $('reelBody'); if (!box) return;
  let photos = [];
  try { photos = await listPhotosByPrefix(momTrip + ':'); } catch (e) { box.innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; return; }
  const urls = [], by = {};
  photos.forEach((p) => { const pid = p.key.slice(momTrip.length + 1), u = URL.createObjectURL(p.blob); urls.push(u); (by[pid] = by[pid] || []).push(u); });
  const info = momInfo(momTrip);
  const entries = info.groups.map((g) => ({ label: g.label, items: g.places.map((p) => ({ p, d: momData(momTrip, p.id), urls: by[p.id] || [] })).filter((x) => x.urls.length) })).filter((g) => g.items.length);
  if (!entries.length) { urls.forEach((u) => URL.revokeObjectURL(u)); box.innerHTML = '<div class="panel empty"><b>Chưa có ảnh nào</b>Đăng ảnh cho các địa điểm trong Khoảnh khắc để tạo video.</div>'; return; }
  const imgList = await loadReelImages(urls), imgs = new Map();
  urls.forEach((u, i) => { if (imgList[i]) imgs.set(u, imgList[i]); });
  if ($('reelBody') !== box) { urls.forEach((u) => URL.revokeObjectURL(u)); return; } // đã rời trang trong lúc tải ảnh
  reel = { entries, info, imgs, urls, music: 'nhe_nhang', userBuf: null, userName: '', perPhoto: 3, outUrl: null, busy: false };
  reel.plan = planReel(entries, info, { perPhoto: reel.perPhoto, maxPhotos: lim().reelPhotos });
  box.innerHTML = reelHtml();
  reel.player = createReelPlayer($('reelCv'), () => ({ plan: reel.plan, imgs: reel.imgs, music: reel.music === 'file' ? reel.userBuf : reel.music === 'none' ? null : reel.music, accent: getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#0F766E' }), (t) => {
    const el = $('reelT'); if (el) el.textContent = fmtSec(t) + ' / ' + fmtSec(reel.plan.duration);
    const b = $('reelPlay'); if (b) { const on = !!(reel.player && reel.player.isPlaying()); b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'Tạm dừng' : 'Phát xem trước'); }
  });
  reel.player.redraw();
}
function reelHtml() {
  const musics = [...Object.entries(TRACKS).map(([k, v]) => [k, v.label]), ['file', reel.userName ? 'Của bạn: ' + reel.userName : 'Chọn nhạc từ máy'], ['none', 'Không nhạc']];
  return '<div class="reel">' +
    '<div class="reel-stage"><canvas id="reelCv" width="720" height="1280" aria-label="Xem trước video kỷ niệm"></canvas><button type="button" id="reelPlay" class="reel-play" data-reelact="play" aria-label="Phát xem trước"><span aria-hidden="true">▶</span></button></div>' +
    '<p class="reel-time"><span id="reelT">0:00 / ' + fmtSec(reel.plan.duration) + '</span> · ' + reel.plan.photos + ' ảnh</p>' +
    '<h3>Nhạc nền</h3><div class="seg" role="group" aria-label="Nhạc nền">' + musics.map(([k, l]) => '<button type="button" data-reelmusic="' + k + '" aria-pressed="' + (reel.music === k) + '">' + esc(l) + '</button>').join('') + '</div>' +
    '<input type="file" id="reelFile" accept="audio/*" hidden>' +
    '<p class="hint">Nhạc có sẵn do app tự soạn, dùng thoải mái. Nhạc của bạn chỉ nằm trên máy này; khi đăng video lên mạng, hãy chắc là bạn có quyền dùng bài đó.</p>' +
    '<h3>Mỗi ảnh hiện</h3><div class="seg" role="group" aria-label="Thời gian mỗi ảnh">' + [2, 3, 4].map((n) => '<button type="button" data-reelsec="' + n + '" aria-pressed="' + (reel.perPhoto === n) + '">' + n + ' giây</button>').join('') + '</div>' +
    '<button type="button" class="go" id="reelMake" data-reelact="make" style="margin-top:16px"' + (reel.busy ? ' disabled' : '') + '>Tạo video (' + fmtSec(reel.plan.duration) + ')</button>' +
    '<div id="reelProg" class="reel-prog" hidden><div class="bar"><i style="width:0%"></i></div><span>Đang ghi video, giữ màn hình mở…</span></div>' +
    '<div id="reelOut"></div>' +
    '<p class="hint">Video dọc 9:16, tạo ngay trên máy theo thời gian thực (video 30 giây thì mất khoảng 30 giây), không tải ảnh lên đâu cả.' + (reelMime() ? '' : ' Trình duyệt này chưa hỗ trợ tạo video, bạn vẫn xem trước được.') + '</p></div>';
}
$('pageBody').addEventListener('click', async (e) => {
  if (pageName !== 'reel' || !reel) return;
  const b = e.target.closest('[data-reelact],[data-reelmusic],[data-reelsec]'); if (!b || b.disabled) return;
  if (b.dataset.reelmusic) {
    if (b.dataset.reelmusic === 'file') { $('reelFile').click(); return; }
    reel.music = b.dataset.reelmusic; reel.player.pause();
    document.querySelectorAll('[data-reelmusic]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    return;
  }
  if (b.dataset.reelsec) { reel.perPhoto = +b.dataset.reelsec; reel.player.reset(); reel.plan = planReel(reel.entries, reel.info, { perPhoto: reel.perPhoto, maxPhotos: lim().reelPhotos }); refreshReelUi(); return; }
  if (b.dataset.reelact === 'play') { if (reel.player.isPlaying()) reel.player.pause(); else reel.player.play(); return; }
  if (b.dataset.reelact === 'make') makeReel();
});
function refreshReelUi() {
  document.querySelectorAll('[data-reelsec]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.reelsec === reel.perPhoto)));
  $('reelMake').textContent = 'Tạo video (' + fmtSec(reel.plan.duration) + ')';
  $('reelT').textContent = '0:00 / ' + fmtSec(reel.plan.duration); reel.player.redraw();
}
$('pageBody').addEventListener('change', async (e) => {
  if (e.target.id !== 'reelFile' || !reel) return;
  const f = e.target.files[0]; if (!f) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    reel.userBuf = await ac.decodeAudioData(await f.arrayBuffer()); ac.close().catch(() => {});
    reel.userName = f.name.replace(/\.[^.]+$/, '').slice(0, 24); reel.music = 'file'; reel.player.pause();
    const b = document.querySelector('[data-reelmusic="file"]'); if (b) b.textContent = 'Của bạn: ' + reel.userName;
    document.querySelectorAll('[data-reelmusic]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.reelmusic === 'file')));
    toast('Đã chọn nhạc: ' + reel.userName);
  } catch (err) { toast('Không đọc được file nhạc này'); }
  e.target.value = '';
});
async function makeReel() {
  const r = reel; if (!r || r.busy) return;
  r.busy = true; r.player.pause(); $('reelMake').disabled = true;
  const prog = $('reelProg'), bar = prog.querySelector('i'); prog.hidden = false; $('reelOut').innerHTML = '';
  try {
    const blob = await exportReel({ plan: r.plan, imgs: r.imgs, music: r.music === 'file' ? r.userBuf : r.music === 'none' ? null : r.music, accent: getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#0F766E' }, (p) => { bar.style.width = Math.round(p * 100) + '%'; });
    if (reel !== r) return; // đã rời trang
    if (r.outUrl) URL.revokeObjectURL(r.outUrl);
    r.outUrl = URL.createObjectURL(blob);
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm', name = 'arrow-travel-' + (r.info.title || 'ky-niem').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() + '.' + ext;
    r.file = new File([blob], name, { type: blob.type });
    $('reelOut').innerHTML = '<div class="panel reel-done"><b>Video đã sẵn sàng</b><video src="' + r.outUrl + '" controls playsinline></video>' +
      '<a class="go reel-dl" href="' + r.outUrl + '" download="' + esc(name) + '">Tải video (' + (blob.size / 1048576).toFixed(1) + ' MB, .' + ext + ')</a>' +
      (navigator.canShare && navigator.canShare({ files: [r.file] }) ? '<button type="button" class="btn" data-reelact="share" style="width:100%;margin-top:8px">Chia sẻ</button>' : '') +
      (ext === 'webm' ? '<p class="hint">File .webm xem được trên Chrome, Android, YouTube. Một số app trên iPhone cần đổi sang .mp4 trước khi đăng.</p>' : '') + '</div>';
    toast('Đã tạo video kỷ niệm');
  } catch (err) {
    if (reel === r) $('reelOut').innerHTML = '<div class="warn">' + esc(err.message || 'Không tạo được video') + '</div>';
  } finally {
    if (reel === r) { r.busy = false; prog.hidden = true; $('reelMake').disabled = false; }
  }
}
// Trong khung xem artifact trên claude.ai, trang không tự tải file được: nhờ nền tảng hỏi người xem rồi lưu.
// Mở ở nơi khác (GitHub Pages, máy tính) thì không có window.claude, link tải thường vẫn chạy.
$('pageBody').addEventListener('click', async (e) => {
  const a = e.target.closest('a.reel-dl'); if (!a || !reel || !reel.file || !(window.claude && typeof window.claude.use === 'function')) return;
  e.preventDefault();
  const dl = await window.claude.use('downloads');
  if (!dl) { toast('Nơi đang xem không cho tải file. Mở app trên GitHub Pages để tải video.'); return; }
  try { await dl.save({ filename: reel.file.name, data: reel.file }); toast('Đã lưu video'); }
  catch (err) { if (err && err.code !== 'declined') toast(err.code === 'rate_limited' ? 'Đang có hộp thoại lưu, thử lại sau giây lát' : 'Không lưu được video ở đây'); }
});
$('pageBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-reelact="share"]'); if (!b || !reel || !reel.file) return;
  navigator.share({ files: [reel.file], title: reel.info.title || 'Video kỷ niệm' }).catch(() => {});
});

/* ---------- Lịch trình nổi bật từ cộng đồng (mẫu) ---------- */
const featuredTrip = (f) => { const start = addDays(todayStr(), 7); return { destination: 'Đà Nẵng', startDate: start, endDate: addDays(start, f.days.length - 1), people: f.people, budget: f.budget, audience: f.audience, hasKids: f.audience === 'gia_dinh', hasElderly: false, styles: f.styles }; };
function buildFeaturedPlan(f) {
  const trip = featuredTrip(f);
  return { trip, audienceLabel: RULES[f.audience].label, warnings: [], days: f.days.map((ids, i) => ({ date: addDays(trip.startDate, i), dayIndex: i + 1, items: ids.map((id) => placeItem(DATA.places.find((x) => x.id === id))) })) };
}
function featuredStats(f) {
  const stops = f.days.reduce((n, d) => n + d.length, 0);
  const tickets = f.days.flat().reduce((sum, id) => sum + DATA.places.find((x) => x.id === id).price, 0) * f.people;
  return { stops, tickets };
}
// Ảnh bìa lịch trình nổi bật: dùng ảnh thật của một điểm trong lịch (ảnh của chủ dự án hoặc ảnh Wikimedia có giấy phép)
const featuredCover = (f) => DATA.places.find((p) => p.id === f.cover && p.image) || null;
function renderFeatured() {
  $('homeFeatured').innerHTML = FEATURED.featured.map((f) => {
    const st = featuredStats(f);
    const cv = featuredCover(f);
    return '<button type="button" class="pcard fcard' + (cv ? ' has-cover' : '') + '" data-featured="' + f.id + '">' + (cv ? '<img class="fc-img" src="' + esc(cv.image) + '" alt="" loading="lazy">' : sceneSvg({ scene: f.scene, name: f.title })) + '<div><b>' + esc(f.title) + '</b><span>' + f.days.length + ' ngày · ' + st.stops + ' điểm · ' + esc(RULES[f.audience].label) + '</span><span style="display:block">Bởi ' + esc(f.author) + '</span></div></button>';
  }).join('');
}
function openFeatured(id) {
  const f = FEATURED.featured.find((x) => x.id === id); if (!f) return;
  const trip = featuredTrip(f), keep = rule; rule = effectiveRules(RULES[f.audience], trip);
  const p = buildFeaturedPlan(f); p.days.forEach(retime); rule = keep;
  const st = featuredStats(f);
  lastFocus = document.activeElement; detailPlace = null; detailHotel = null; addCtx = null;
  const cv = featuredCover(f);
  $('sheetBody').innerHTML = '<div class="pd">' + (cv ? sceneSvg({ ...cv, imageAlt: cv.imageAlt || cv.name }) + (cv.imageCredit ? '<p class="pd-credit">' + esc(cv.imageCredit) + '</p>' : '') : sceneSvg({ scene: f.scene, name: f.title })) + '<h2>' + esc(f.title) + '</h2><p class="hint">Bởi ' + esc(f.author) + ' · lịch trình mẫu, chưa phải của người dùng thật</p>' +
    '<div class="pd-tags"><span class="tag">' + esc(p.audienceLabel) + '</span><span class="tag">' + f.people + ' người</span><span class="tag">' + f.days.length + ' ngày</span>' + f.styles.map((x) => '<span class="tag">' + esc(STYLE_NAME[x]) + '</span>').join('') + '</div>' +
    '<p style="margin-top:8px">' + esc(f.desc) + '</p><p class="hint">Vé tham quan khoảng ' + moneyVnd(st.tickets) + ' cho cả nhóm.</p>' +
    p.days.map((d) => '<h3>Ngày ' + d.dayIndex + '</h3><ul class="stops">' + d.items.map((i) => '<li class="' + (i.kind === 'visit' ? 'v' : 'm') + '"><time>' + i.time + '</time><span>' + esc(i.place.name) + (i.late ? ' <em style="color:var(--orange);font-style:normal">(có thể quá giờ)</em>' : '') + '</span></li>').join('') + '</ul>').join('') +
    '<button type="button" class="go" data-usefeatured="' + f.id + '" style="margin-top:14px">Dùng lịch trình này</button></div>';
  sheet.hidden = false; $('sheetClose').focus();
}
function useFeatured(id) {
  const f = FEATURED.featured.find((x) => x.id === id); if (!f) return;
  const trip = featuredTrip(f);
  closeSheet(); applyForm({ ...trip, styles: f.styles });
  rule = effectiveRules(RULES[f.audience], trip); pool = filterPlaces(DATA.places, trip).places;
  plan = buildFeaturedPlan(f); plan.days.forEach(retime);
  resetPlanState(); dirtyEdits = true; // lịch có sẵn, đổi form sẽ hỏi trước khi xếp lại
  go('create'); render(); setFormOpen(false);
  toast('Đã mở lịch trình mẫu, bạn có thể chỉnh sửa');
}
$('sheetBody').addEventListener('click', (e) => { const b = e.target.closest('[data-usefeatured]'); if (b) useFeatured(b.dataset.usefeatured); });

/* ---------- Khám phá: bố cục riêng, lấy "lịch đổi theo người đi cùng" làm nhân vật chính ---------- */
let homeAud = 'gia_dinh';
let homeGu = []; // sở thích đang chọn ở trang Khám phá (chọn nhiều)
function renderGu() {
  document.querySelectorAll('[data-gu]').forEach((b) => b.setAttribute('aria-pressed', String(homeGu.includes(b.dataset.gu))));
  const g = $('guGo'); g.disabled = homeGu.length === 0;
  g.textContent = homeGu.length ? tr('Lên lịch với') + ' ' + homeGu.length + ' ' + tr('sở thích') : tr('Chọn sở thích để bắt đầu');
}
const DEMO_TABS = [['gia_dinh', 'Gia đình'], ['cap_doi', 'Cặp đôi'], ['nhom_ban', 'Nhóm bạn'], ['mot_minh', 'Một mình']];
// Chạy đúng thuật toán xếp lịch cho một ngày mẫu để người xem thấy khác biệt thật giữa các đối tượng
function demoDay(aud) {
  const start = addDays(todayStr(), 7);
  const trip = { destination: 'Đà Nẵng', startDate: start, endDate: start, people: aud === 'gia_dinh' ? 4 : aud === 'mot_minh' ? 1 : 2, budget: 'vua_phai',
    audience: aud, hasKids: aud === 'gia_dinh', hasElderly: false, styles: ['thien_nhien', 'am_thuc'] };
  // Ngày mẫu trong thành phố: bỏ Bà Nà Hills vì chiếm trọn một ngày
  const city = { ...DATA, places: DATA.places.filter((x) => x.id !== 'ba-na') };
  return { day: buildItinerary(trip, city, RULES).days[0], rule: effectiveRules(RULES[aud], trip) };
}
function ribbonHtml(day, rule) {
  const s0 = toMin(rule.start), s1 = toMin(rule.end), segs = [];
  let cur = s0;
  const add = (cls, a, b) => { if (b > a) segs.push('<span class="rb ' + cls + '" style="flex:' + (b - a) + '"></span>'); };
  for (const it of day.items) {
    const st = toMin(it.time), en = toMin(it.end), t0 = it.travel ? Math.max(cur, st - it.travel.min) : st;
    add('idle', cur, t0); add('trv', t0, st); add(it.kind === 'visit' ? 'vis' : 'eat', st, en); cur = Math.max(cur, en);
  }
  add('idle', cur, s1);
  return '<div class="ribbon" role="img" aria-label="Dòng thời gian một ngày">' + segs.join('') + '</div><div class="ax"><span>' + rule.start + '</span><span>' + rule.end + '</span></div>';
}
$('notifBack').addEventListener('click', () => go(notifFrom && notifFrom !== 'notifs' ? notifFrom : 'home'));
function renderHome() {
  renderGu(); renderFeatured();
  const ts = trackTrip();
  $('homeTrack').innerHTML = ts ? '<button type="button" class="track-banner" data-go="track"><span><b>Đang theo dõi chuyến đi</b><span>' + esc(ts.trip.destination) + ' · ' + Object.keys(store.track.visited).length + ' điểm đã qua</span></span><span>Mở ›</span></button>' : '';
  const pt = store.points.balance;
  $('homePts').textContent = pt + ' ' + tr('điểm');
  // Một ngày, bốn nhịp
  const { day, rule } = demoDay(homeAud);
  const lunch = day.items.find((i) => (i.kind === 'meal' || i.kind === 'break') && /trưa/.test(i.note || ''));
  const visits = day.items.filter((i) => i.kind === 'visit').length;
  $('homeDemo').innerHTML = '<div class="demo-tabs" role="group" aria-label="Chọn đối tượng">' + DEMO_TABS.map(([v, l]) => '<button type="button" data-demo="' + v + '" aria-pressed="' + (v === homeAud) + '">' + esc(l) + '</button>').join('') + '</div>' +
    ribbonHtml(day, rule) +
    '<div class="legend"><span><i style="background:var(--teal)"></i>Tham quan</span><span><i style="background:var(--orange)"></i>Ăn và nghỉ</span><span><i style="background:var(--muted);opacity:.55"></i>Di chuyển</span></div>' +
    '<div class="facts"><div><b>' + visits + '</b><span>điểm tham quan</span></div><div><b>' + (lunch ? dur(lunch.duration) : '–') + '</b><span>nghỉ trưa</span></div><div><b>' + day.totalKm + '</b><span>km di chuyển</span></div></div>' +
    '<ul class="stops">' + day.items.slice(0, 6).map((i) => '<li class="' + (i.kind === 'visit' ? 'v' : 'm') + '"><time>' + i.time + '</time><span>' + esc(i.place ? i.place.name : i.note) + '</span></li>').join('') + '</ul>' +
    '<button type="button" class="go" data-preset="' + homeAud + '">Dùng nhịp này cho chuyến của tôi</button>';
  // Đã lưu gần đây
  const r = store.trips.slice(0, 5);
  $('homeRecent').innerHTML = r.length ? '<div class="sec-h"><h2 class="h2">Đã lưu gần đây</h2><button type="button" data-go="trips">Tất cả</button></div><div class="cards" style="margin-top:12px">' +
    r.map((x) => '<button type="button" class="pcard" style="width:220px" data-trip="' + x.id + '"><div><b>' + esc(x.trip.destination) + ' · ' + daysBetween(x.trip.startDate, x.trip.endDate) + ' ngày</b><span>' + fmtDate(x.trip.startDate) + ' – ' + fmtDate(x.trip.endDate) + ' · ' + esc(RULES[x.trip.audience].label) + '</span><span style="display:block;color:var(--fg);font-weight:600">' + money(x.total) + '</span></div></button>').join('') + '</div>' : '';
  // Ưu đãi
  $('homeDeals').innerHTML = searchPromos(PROMOS.promos, { today: todayStr() }).slice(0, 5).map((p) => '<button type="button" class="deal" data-page="promos"><b>' + esc(p.title) + '</b><span>' + esc(p.target.name || tr(TYPE_NAME[p.target.type])) + ' · mẫu</span>' + (p.code ? '<em>' + esc(p.code) + '</em>' : '') + '</button>').join('');
  // Tiến độ điểm thưởng
  const next = CATALOG.find((c) => c.cost > pt), tier = next || CATALOG[CATALOG.length - 1];
  const pct = Math.min(100, Math.round((pt / tier.cost) * 100));
  $('homeProg').innerHTML = '<b>' + (next ? pt + '/' + next.cost + ' điểm để đổi voucher ' + moneyVnd(next.value) : 'Bạn đủ điểm để đổi voucher ' + moneyVnd(tier.value)) + '</b>' +
    '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ điểm thưởng"><i style="width:' + pct + '%"></i></div>' +
    '<span style="font-size:14px;opacity:.9">Lưu lịch trình, đăng ảnh, đánh giá app để tích điểm.</span><button type="button" data-page="rewards">Xem điểm thưởng</button>';
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
let tripFilter = 'all';
function renderTrips() {
  const el = $('tripsList');
  if (!store.trips.length) { el.innerHTML = '<div class="panel empty"><b>Chưa có lịch trình nào</b>Tạo lịch trình và bấm Lưu để xem lại ở đây.<button class="go" type="button" data-go="create">Tạo lịch trình mới</button></div>'; return; }
  const favN = store.trips.filter((x) => store.favorites.includes(x.id)).length;
  const list = store.trips.filter((x) => tripFilter === 'all' || store.favorites.includes(x.id));
  el.innerHTML = '<button type="button" class="btn" data-go="create" style="align-self:flex-start">+ Lịch trình mới</button><div class="chips" role="group" aria-label="Lọc lịch trình"><button type="button" data-tripfilter="all" aria-pressed="' + (tripFilter === 'all') + '">Tất cả</button><button type="button" data-tripfilter="fav" aria-pressed="' + (tripFilter === 'fav') + '">Yêu thích (' + favN + ')</button></div>' +
    (list.length ? list.map((s) => {
      const t = s.trip, armed = armedTrip === s.id, fav = store.favorites.includes(s.id);
      return '<div class="panel trip"><div class="trip-top"><h3>' + esc(t.destination) + ' · ' + daysBetween(t.startDate, t.endDate) + ' ngày</h3><button type="button" class="fav" data-fav="' + s.id + '" aria-pressed="' + fav + '" aria-label="Yêu thích">♥</button></div><div class="sub">' + fmtDate(t.startDate) + ' – ' + fmtDate(t.endDate) + ' · ' + esc(RULES[t.audience].label) + ' · ' + t.people + ' người</div><div class="tot">Dự kiến ' + money(s.total) + '</div>' + bookingLine(s.id) +
        '<div class="acts"><button type="button" data-trip="' + s.id + '">Mở</button><button type="button" data-trackstart="' + s.id + '">' + (store.track && store.track.tripId === s.id ? 'Đang đi' : 'Bắt đầu chuyến') + '</button><button type="button" data-moments="' + s.id + '">Khoảnh khắc</button><button type="button" data-attach="' + s.id + '">Tệp</button><button type="button" class="' + (armed ? 'btn danger' : 'del') + '" data-deltrip="' + s.id + '">' + (armed ? 'Bấm lại để xoá' : 'Xoá') + '</button></div></div>';
    }).join('') : '<div class="panel empty"><b>Chưa có lịch trình yêu thích</b>Bấm ♥ ở một lịch trình để đánh dấu.</div>');
}

/* ---------- Thông báo ---------- */
function renderNotifs() {
  const el = $('notifList');
  if (!store.notifs.length) { el.innerHTML = '<div class="panel empty"><b>Chưa có thông báo</b>Thông báo về lịch trình sẽ hiện ở đây.</div>'; return; }
  el.innerHTML = store.notifs.map((n) => '<div class="panel note' + (n.read ? '' : ' unread') + '"><span class="bar"></span><div><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><small>' + fmtTime(n.at) + '</small></div></div>').join('') +
    '<button class="btn quiet" type="button" data-clearnotifs>Xoá tất cả thông báo</button>';
}

/* ---------- Bắt sự kiện chung: tab, lối tắt, danh sách ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-attach],[data-propage],[data-trackstart],[data-moments],[data-featured],[data-gu],[data-guplan],[data-daytab],[data-editform],[data-demo],[data-go],[data-page],[data-fav],[data-tripfilter],[data-preset],[data-dest],[data-trip],[data-deltrip],[data-clearnotifs],[data-clearall]'); if (!t) return;
  const d = t.dataset;
  if (d.editform !== undefined) { setFormOpen(true); $('form').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.daytab !== undefined) { dayTab = d.daytab === 'all' ? 'all' : +d.daytab; render(); window.scrollTo({ top: $('dayTabs').offsetTop - 8, behavior: 'smooth' }); return; }
  if (d.attach) { openAttach(d.attach); return; }
  if (d.propage !== undefined) { if (!sheet.hidden) closeSheet(); openPage('pro'); return; }
  if (d.trackstart) { if (store.track && store.track.tripId === d.trackstart) go('track'); else startTrack(d.trackstart); return; }
  if (d.moments) { momTrip = d.moments; momChosen = true; go('moments'); return; }
  if (d.featured) { openFeatured(d.featured); return; }
  if (d.gu) { homeGu = homeGu.includes(d.gu) ? homeGu.filter((x) => x !== d.gu) : [...homeGu, d.gu]; renderGu(); return; }
  if (d.guplan !== undefined) { if (homeGu.length) openCreate({ styles: [...homeGu] }, true); return; }
  if (d.demo) { homeAud = d.demo; renderHome(); return; }
  if (d.page) { openPage(d.page); return; }
  if (d.fav) { store.favorites = store.favorites.includes(d.fav) ? store.favorites.filter((x) => x !== d.fav) : [...store.favorites, d.fav]; persist(); renderTrips(); return; }
  if (d.tripfilter) { tripFilter = d.tripfilter; renderTrips(); return; }
  if (d.go) { if (d.go === 'create' && !plan) openCreate({}, true, false); else go(d.go); return; }
  if (d.preset) { openCreate(PRESETS[d.preset] || {}, true); return; }
  if (d.dest) { qSug.hidden = true; openCreate({}, true); return; }
  if (d.trip) { openTrip(d.trip); return; }
  if (d.deltrip) {
    if (armedTrip !== d.deltrip) { armedTrip = d.deltrip; renderTrips(); return; }
    store.trips = store.trips.filter((x) => x.id !== d.deltrip); store.favorites = store.favorites.filter((x) => x !== d.deltrip); deleteTripPhotos(d.deltrip + ':').catch(() => {}); deleteTripPhotos('att:' + d.deltrip).catch(() => {}); delete store.moments[d.deltrip]; if (store.track && store.track.tripId === d.deltrip) { stopGps(false); store.track = null; } store.bookings = store.bookings.filter((x) => x.tripId !== d.deltrip || x.status !== 'chua_chuyen'); armedTrip = null; persist(); renderTrips(); return;
  }
  if (d.clearnotifs !== undefined) { store.notifs = []; persist(); updateBadge(); renderNotifs(); return; }
  if (d.clearall !== undefined) {
    if (!armedClear) { armedClear = true; renderAccount(); return; }
    clearAllPhotos().catch(() => {}); const keepPro = store.pro; store = seedStore(); store.pro = keepPro; armedClear = false; plan = null; currentTripId = null; rateDraft = null; persist(); applySettings(); updateBadge(); renderAccount();
  }
});

/* ---------- Dịch giao diện (tiếng Anh) ---------- */
// Dịch mọi đoạn chữ khớp nguyên câu trong bản dịch, kể cả nội dung vẽ sau này; câu chưa có bản dịch giữ tiếng Việt.
const origText = new Map(), origAttr = new Map(), ATTRS = ['placeholder', 'aria-label', 'title'];
function trNode(n) {
  if (n.nodeType === 3) {
    const v = n.nodeValue, k = v.trim();
    if (k && EN[k] && EN[k] !== k && getLang() === 'en') { if (!origText.has(n)) origText.set(n, v); n.nodeValue = v.replace(k, EN[k]); }
  } else if (n.nodeType === 1 && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(n.tagName)) {
    for (const a of ATTRS) {
      const v = n.getAttribute(a);
      if (v && EN[v] && EN[v] !== v && getLang() === 'en') { if (!origAttr.has(n)) origAttr.set(n, {}); origAttr.get(n)[a] = v; n.setAttribute(a, EN[v]); }
    }
    n.childNodes.forEach(trNode);
  }
}
function retranslate() {
  origText.forEach((v, n) => { if (n.isConnected) n.nodeValue = v; }); origText.clear();
  origAttr.forEach((o, el) => { for (const a in o) el.setAttribute(a, o[a]); }); origAttr.clear();
  if (getLang() === 'en') trNode(document.body);
}
new MutationObserver((recs) => {
  if (getLang() !== 'en') return;
  for (const r of recs) { r.addedNodes.forEach(trNode); if (r.type === 'characterData') trNode(r.target); }
}).observe(document.body, { childList: true, subtree: true, characterData: true });

/* ---------- Cài đặt giao diện, ngôn ngữ, tiền tệ ---------- */
const THEMES = { light: 'Sáng', pink: 'Hồng nhạt', yellow: 'Vàng nhạt' };
function applySettings() {
  const st = store.settings, root = document.documentElement;
  if (!THEMES[st.theme]) st.theme = 'light'; // bản cũ có 'system' / 'dark', nay bỏ giao diện tối
  if (st.theme === 'pink' && !isPro()) st.theme = 'light'; // Hồng nhạt thuộc ArrowPro, hết gói thì về Sáng
  if (st.theme === 'light') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', st.theme);
  setLang(st.lang); setCurrency(st.currency); root.lang = st.lang;
  retranslate();
}
function refreshAll() {
  renderHome(); renderTrips(); renderNotifs(); updateBadge();
  if (plan) render();
  if (pageName) { $('pageTitle').textContent = tr(PAGES[pageName].title); renderPage(); }
}

/* ---------- Thông báo nhanh ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Đã chép: ' + text); } catch (e) { toast('Không chép được, hãy chép thủ công'); }
}
function givePoints(ruleId, opts) {
  const r = award(store.points, ruleId, opts);
  if (r.awarded) { store.points = r.points; persist(); renderHome(); toast('+' + r.awarded + ' điểm · ' + tr(EARN.find((x) => x.id === ruleId).label)); }
  return r.awarded;
}

/* ---------- Màn hình mở app ---------- */
const splash = $('splash');
function hideSplash() { if (splash.hidden) return; splash.classList.add('hide'); setTimeout(() => { splash.hidden = true; }, 600); }
splash.querySelector('.slogan').textContent = APP.slogan;
$('splashGo').addEventListener('click', hideSplash);
splash.addEventListener('click', hideSplash);
setTimeout(hideSplash, 2800);

/* ---------- Trang phụ ---------- */
let pageName = null, pageFrom = 'home', currentScreen = 'home';
const legalPage = (key) => () => {
  const d = LEGAL[key];
  return '<div class="panel legal">' + (key !== 'payguide' ? '<div class="warn" style="margin-bottom:8px">Bản nháp, chưa được luật sư rà soát. Chủ app cần điền các mục [ĐIỀN] trước khi công khai.</div>' : '') +
    (d.updated ? '<p class="hint">' + esc(d.updated) + '</p>' : '') + d.sections.map((s) => '<h3>' + esc(s.h) + '</h3><p>' + esc(s.p) + '</p>').join('') + '</div>';
};
const PAGES = {
  album: { title: 'Album kỷ niệm', render: () => pageAlbum() },
  reel: { title: 'Video kỷ niệm', render: () => pageReel() },
  pro: { title: 'ArrowPro', render: () => pagePro() },
  settings: { title: 'Cài đặt', render: () => pageSettings() },
  promos: { title: 'Khuyến mãi', render: () => pagePromos() },
  rewards: { title: 'Điểm thưởng và voucher', render: () => pageRewards() },
  friends: { title: 'Bạn đồng hành', render: () => pageFriends() },
  rate: { title: 'Đánh giá Arrow Travel', render: () => pageRate() },
  about: { title: 'Giới thiệu', render: () => pageAbout() },
  privacy: { title: LEGAL.privacy.title, render: legalPage('privacy') },
  terms: { title: LEGAL.terms.title, render: legalPage('terms') },
  payguide: { title: LEGAL.payguide.title, render: legalPage('payguide') },
};
function renderPage() { stopReel(); $('pageBody').innerHTML = PAGES[pageName].render(); if (pageName === 'album') fillAlbum(); if (pageName === 'reel') fillReel(); }
function openPage(name) {
  if (!PAGES[name]) return;
  if (currentScreen !== 'page') pageFrom = currentScreen;
  pageName = name; currentScreen = 'page'; armedTrip = null; armedClear = false;
  SCREENS.forEach((s) => { $('scr-' + s).hidden = true; });
  $('scr-page').hidden = false;
  document.querySelectorAll('.tab').forEach((t) => { if (t.dataset.go === pageFrom) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  $('pageTitle').textContent = tr(PAGES[name].title); renderPage(); window.scrollTo(0, 0);
}
$('pageBack').addEventListener('click', () => { pageName = null; go(pageFrom); });

const seg = (k, items, cur) => '<div class="seg" role="group">' + items.map(([v, l]) => '<button type="button" data-pg="set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (v === cur) + '">' + esc(l) + '</button>').join('') + '</div>';
function pageSettings() {
  const st = store.settings, p = store.prefs;
  const o = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
  return '<div class="panel setting"><b>Giao diện</b>' + seg('theme', Object.entries(THEMES).map(([k, l]) => [k, k === 'pink' && !isPro() ? l + ' · Pro 🔒' : l]), st.theme) + '</div>' +
    '<div class="panel setting"><b>Ngôn ngữ</b>' + seg('lang', [['vi', 'Tiếng Việt'], ['en', 'English']], st.lang) +
    '<p class="hint">Bản tiếng Anh mới dịch phần giao diện chính. Nội dung lịch trình, địa điểm, chính sách vẫn là tiếng Việt.</p></div>' +
    '<div class="panel setting"><b>Tiền tệ hiển thị</b><select id="curSel" aria-label="Tiền tệ">' + Object.entries(CURRENCIES).map(([c, v]) => o(c, v.label, st.currency)).join('') + '</select>' +
    '<p class="hint">Chỉ đổi cách hiển thị theo tỉ giá mẫu (1 USD ≈ ' + moneyVnd(CURRENCIES.USD.rate) + '). Thanh toán luôn bằng VND.</p></div>' +
    '<div class="panel setting"><b>Mặc định khi tạo lịch trình</b><div><label for="prefAud">Đi cùng</label><select id="prefAud">' +
    o('nhom_ban', 'Nhóm bạn trẻ', p.audience || 'nhom_ban') + o('mot_minh', 'Một mình', p.audience) + o('cap_doi', 'Cặp đôi', p.audience) + o('gia_dinh', 'Gia đình', p.audience) +
    '</select></div><div><label for="prefBud">Ngân sách</label><select id="prefBud">' + o('tiet_kiem', 'Tiết kiệm', p.budget) + o('vua_phai', 'Vừa phải', p.budget || 'vua_phai') + o('thoai_mai', 'Thoải mái', p.budget) + '</select></div></div>';
}

/* Khuyến mãi */
let promoQ = '', promoType = 'all';
const PROMO_TYPES = [['all', 'Tất cả'], ['place', 'Địa điểm'], ['flight', 'Chuyến bay'], ['hotel', 'Khách sạn'], ['transport', 'Thuê xe']];
const TYPE_NAME = { all: 'Arrow Travel', place: 'Địa điểm', flight: 'Chuyến bay', flight_any: 'Chuyến bay', hotel: 'Khách sạn', transport: 'Thuê xe' };
function promoCard(p) {
  const left = daysLeft(p, todayStr());
  return '<div class="panel promo' + (p.pro ? ' promo-pro' : '') + '"><h3>' + (p.pro ? '<span class="pro-tag">Pro</span> ' : '') + esc(p.title) + '</h3><div class="meta">' + esc(tr(TYPE_NAME[p.target.type])) + (p.target.name ? ' · ' + esc(p.target.name) : '') +
    (left != null ? ' · còn ' + left + ' ngày' : '') + ' <span class="badge-demo">mẫu</span></div><p style="margin:6px 0 0">' + esc(p.desc) + '</p>' +
    (p.pro && !isPro() ? '<button type="button" class="btn" data-propage style="margin-top:8px">Mở khoá với ArrowPro</button>' : p.code ? '<div class="code">' + esc(p.code) + ' <button type="button" class="btn quiet" data-pg="copy" data-v="' + esc(p.code) + '">Chép</button></div>' : '') +
    (p.kind === 'perk' ? '<p class="hint" style="margin-top:6px">Nhận trực tiếp tại nơi sử dụng.</p>' : '<p class="hint" style="margin-top:6px">Nhập mã khi thanh toán chuyến bay và khách sạn.</p>') + '</div>';
}
function promoListHtml() {
  const r = searchPromos(PROMOS.promos, { q: promoQ, type: promoType, today: todayStr() });
  return r.length ? r.map(promoCard).join('') : '<div class="panel empty"><b>Không tìm thấy khuyến mãi</b>Thử từ khoá khác, ví dụ Bà Nà, Vietjet, khách sạn.</div>';
}
function pagePromos() {
  return '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/></svg><input id="promoQ" type="search" value="' + esc(promoQ) + '" placeholder="Tìm khuyến mãi, ví dụ: Bà Nà, Vietjet" aria-label="Tìm khuyến mãi" autocomplete="off"></div>' +
    '<div class="chips" role="group">' + PROMO_TYPES.map(([v, l]) => '<button type="button" data-pg="ptype" data-v="' + v + '" aria-pressed="' + (promoType === v) + '">' + esc(l) + '</button>').join('') + '</div>' +
    '<p class="hint">Khuyến mãi mẫu để chạy thử, không phải chương trình thật của hãng hay địa điểm.</p><div id="promoList" class="list">' + promoListHtml() + '</div>';
}

/* Điểm thưởng */
function pageRewards() {
  const pt = store.points, td = todayStr();
  let h = '<div class="panel"><div class="hint">Điểm của bạn</div><div class="big">' + pt.balance + ' điểm</div><p class="hint">Điểm và voucher chỉ lưu trên thiết bị này.</p></div>';
  h += '<div class="panel"><b>Cách nhận điểm</b>' + EARN.map((r) => '<div class="rule"><span>' + esc(tr(r.label)) + '<small style="display:block;color:var(--muted)">' + esc(tr(r.note)) + (r.cap ? ' · đã ' + (pt.counters[r.id] || 0) + '/' + r.cap : '') + '</small></span><b>+' + r.points + '</b></div>').join('') +
    '<p class="hint" style="margin-top:8px">Điểm cho đơn đặt chỗ sẽ có khi đơn được xác nhận (chưa có ở bản này).</p></div>';
  h += '<div class="panel"><b>Đổi voucher</b>' + CATALOG.map((c) => '<div class="vc rule"><span>Giảm ' + moneyVnd(c.value) + '<small style="display:block;color:var(--muted)">Đơn từ ' + moneyVnd(c.min) + ' · hạn 90 ngày</small></span><button type="button" class="btn" data-pg="redeem" data-v="' + c.id + '"' + (pt.balance < c.cost ? ' disabled' : '') + '>Đổi ' + c.cost + ' điểm</button></div>').join('') + '</div>';
  h += '<div class="panel"><b>Ví voucher</b>' + (store.vouchers.length ? store.vouchers.map((v) => {
    const st = v.used ? 'Đã dùng' : v.expires < td ? 'Hết hạn' : 'Còn hạn đến ' + v.expires.split('-').reverse().join('/');
    return '<div class="vc rule' + (v.used || v.expires < td ? ' used' : '') + '"><span><b>' + esc(v.code) + '</b> · giảm ' + moneyVnd(v.value) + '<small style="display:block;color:var(--muted)">Đơn từ ' + moneyVnd(v.min) + ' · ' + esc(st) + '</small></span><button type="button" class="btn quiet" data-pg="copy" data-v="' + esc(v.code) + '">Chép</button></div>';
  }).join('') : '<p class="hint">Chưa có voucher. Tích đủ điểm để đổi.</p>') + '</div>';
  if (pt.history.length) h += '<div class="panel"><b>Lịch sử điểm</b>' + pt.history.slice(0, 8).map((x) => '<div class="rule"><span>' + esc(x.label) + '<small style="display:block;color:var(--muted)">' + fmtTime(x.at) + '</small></span><b>' + (x.delta > 0 ? '+' : '') + x.delta + '</b></div>').join('') + '</div>';
  return h;
}

/* Bạn đồng hành */
function friendTrip() {
  if (plan) return { trip: plan.trip, note: '' };
  if (store.trips[0]) return { trip: store.trips[0].trip, note: '' };
  const start = addDays(todayStr(), 7);
  return { trip: { destination: 'Đà Nẵng', startDate: start, endDate: addDays(start, 2), audience: store.prefs.audience || 'nhom_ban', budget: store.prefs.budget || 'vua_phai', styles: ['thien_nhien'] }, note: 'Bạn chưa có lịch trình, đang dùng lịch trình mặc định. Tạo lịch trình để gợi ý chính xác hơn.' };
}
function pageFriends() {
  const { trip, note } = friendTrip(), list = matchTravelers(trip, TRAVELERS.travelers, todayStr());
  const near = list.filter((x) => x.overlap > 0), others = list.filter((x) => x.overlap === 0);
  const card = (x) => {
    const on = store.friends.includes(x.id);
    return '<div class="panel fr"><div class="avatar">' + esc(x.name[0]) + '</div><div class="grow"><b>' + esc(x.name) + '</b> <span class="badge-demo">mẫu</span><div class="hint">' + esc(x.bio) + '</div>' +
      '<div class="chips" style="margin:6px 0"><span class="tag-status">' + (x.overlap ? 'Trùng ' + x.overlap + ' ngày (' + fmtDate(x.start) + ' – ' + fmtDate(x.end) + ')' : 'Lệch ngày (' + fmtDate(x.start) + ' – ' + fmtDate(x.end) + ')') + '</span>' +
      (x.sameAudience ? '<span class="tag-status">Cùng đối tượng</span>' : '') + x.sharedStyles.map((s) => '<span class="tag-status">' + esc(STYLE_NAME[s]) + '</span>').join('') + '</div>' +
      '<button type="button" class="btn' + (on ? ' quiet' : '') + '" data-pg="connect" data-v="' + x.id + '">' + (on ? 'Đã kết nối · bấm để huỷ' : 'Kết nối') + '</button></div></div>';
  };
  return '<div class="panel"><b>Dựa trên lịch trình</b><div class="hint">' + esc(trip.destination) + ' · ' + fmtDate(trip.startDate) + ' – ' + fmtDate(trip.endDate) + ' · ' + esc(RULES[trip.audience].label) + '</div>' + (note ? '<p class="hint">' + esc(note) + '</p>' : '') + '</div>' +
    '<div class="warn">Người dùng bên dưới là dữ liệu mẫu: app chưa có máy chủ nên chưa kết nối được người thật, cũng chưa nhắn tin được.</div>' +
    '<div class="sec-h"><h2>Trùng lịch với bạn</h2></div>' + (near.map(card).join('') || '<p class="hint">Chưa có ai trùng ngày.</p>') +
    (others.length ? '<div class="sec-h"><h2>Gợi ý khác</h2></div>' + others.map(card).join('') : '');
}
const STYLE_NAME = { thien_nhien: 'Thiên nhiên', van_hoa: 'Văn hoá', am_thuc: 'Ẩm thực', check_in: 'Check-in', thu_gian: 'Thư giãn' };

/* Đánh giá app */
let rateDraft = null;
function pageRate() {
  if (!rateDraft) rateDraft = { stars: store.review ? store.review.stars : 0, text: store.review ? store.review.text : '' };
  return '<div class="panel"><b>Bạn thấy Arrow Travel thế nào?</b><div class="stars" role="group" aria-label="Số sao">' +
    [1, 2, 3, 4, 5].map((n) => '<button type="button" data-pg="star" data-v="' + n + '" aria-label="' + n + ' sao" aria-pressed="' + (n <= rateDraft.stars) + '">★</button>').join('') + '</div>' +
    '<label for="rateText">Góp ý của bạn (không bắt buộc)</label><textarea id="rateText" placeholder="Điều gì tốt, điều gì cần sửa?">' + esc(rateDraft.text) + '</textarea>' +
    '<button type="button" class="go" data-pg="sendrate" style="margin-top:12px"' + (rateDraft.stars ? '' : ' disabled') + '>' + (store.review ? 'Cập nhật đánh giá' : 'Gửi đánh giá') + '</button>' +
    (store.review ? '<p class="saved-ok">Bạn đã đánh giá ' + store.review.stars + ' sao. Cảm ơn!</p>' : '') +
    '<p class="hint" style="margin-top:8px">' + (APP.feedbackUrl ? 'Đánh giá được lưu trên thiết bị này. Muốn gửi cho đội ngũ Arrow Travel, bấm nút bên dưới.' : 'Đánh giá hiện chỉ lưu trên thiết bị này, chưa gửi về đâu vì app chưa có máy chủ.') + '</p>' +
    (APP.feedbackUrl ? '<a class="pd-link" href="' + esc(APP.feedbackUrl) + '" target="_blank" rel="noopener">Gửi góp ý qua biểu mẫu</a>' : '') + '</div>';
}

/* Giới thiệu */
function pageAbout() {
  return '<div class="panel" style="text-align:center"><svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#0F766E"/><path d="M20 44L44 20M44 20H27M44 20V37" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' +
    '<h2 style="margin:8px 0 0">' + esc(APP.name) + '</h2><p style="margin:4px 0;color:var(--teal);font-weight:600">' + esc(APP.slogan) + '</p><p class="hint">Phiên bản ' + esc(APP.version) + ' · bản thử nghiệm</p></div>' +
    '<div class="panel"><b>Arrow Travel là gì?</b><p style="margin:6px 0 0">Ứng dụng lên lịch trình du lịch theo người đi cùng. Gia đình có trẻ nhỏ có giờ nghỉ trưa dài và ít đi bộ, cặp đôi có quán yên tĩnh và hoàng hôn, nhóm bạn trẻ có lịch dày và nhiều điểm check-in. Từ lịch trình, bạn tìm chuyến bay, khách sạn, chọn phương tiện và xem tổng chi phí cả chuyến.</p></div>' +
    '<div class="panel menu"><button class="mi" data-page="privacy"><span>Chính sách bảo mật</span><span class="chev">›</span></button><button class="mi" data-page="terms"><span>Điều khoản sử dụng</span><span class="chev">›</span></button><button class="mi" data-page="payguide"><span>Hướng dẫn thanh toán</span><span class="chev">›</span></button></div>' +
    '<p class="foot">Mã nguồn: <a href="' + esc(APP.repoUrl) + '" target="_blank" rel="noopener" style="color:var(--teal)">' + esc(APP.repoUrl.replace('https://', '')) + '</a>. Dữ liệu địa điểm, giá, khuyến mãi, đánh giá đang là dữ liệu mẫu.</p>';
}

/* ---------- Tài khoản (menu) ---------- */
const mi = (page, label, sub) => '<button class="mi" type="button" data-page="' + page + '"><span>' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="chev">›</span></button>';
function renderAccount() {
  const st = store.settings;
  $('accountBody').innerHTML =
    '<div class="panel me"><div class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/></svg></div><div><b>Khách</b><span>Chưa đăng nhập</span></div></div>' +
    proCardHtml() +
    '<div class="menu-h">Của tôi</div><div class="panel menu">' + mi('rewards', 'Điểm thưởng và voucher', store.points.balance + ' điểm · ' + store.vouchers.filter((v) => !v.used).length + ' voucher') + mi('friends', 'Bạn đồng hành', store.friends.length + ' đã kết nối') + mi('promos', 'Khuyến mãi') + '</div>' +
    '<div class="menu-h">Cài đặt</div><div class="panel menu">' + mi('settings', 'Giao diện, ngôn ngữ, tiền tệ', (THEMES[st.theme] || THEMES.light) + ' · ' + (st.lang === 'en' ? 'English' : 'Tiếng Việt') + ' · ' + st.currency) + '</div>' +
    '<div class="menu-h">Hỗ trợ</div><div class="panel menu">' + mi('payguide', 'Hướng dẫn thanh toán') + mi('rate', 'Đánh giá Arrow Travel', store.review ? 'Bạn đã đánh giá ' + store.review.stars + ' sao' : '') + mi('about', 'Giới thiệu') + mi('privacy', 'Chính sách bảo mật') + mi('terms', 'Điều khoản sử dụng') + '</div>' +
    '<div class="panel"><b>Dữ liệu của bạn</b><p class="hint" style="margin:6px 0 12px">Bản đầu chưa cần đăng nhập. Lịch trình, ảnh và thông báo chỉ lưu trên thiết bị này, không lưu mật khẩu hay thông tin thanh toán. Đăng nhập để đồng bộ nhiều thiết bị sẽ có ở bản sau.</p>' +
    '<button class="btn danger" type="button" data-clearall>' + (armedClear ? 'Bấm lại để xoá hết' : 'Xoá dữ liệu trên thiết bị này') + '</button></div>' +
    '<p class="foot">' + esc(APP.name) + ' · ' + esc(APP.slogan) + ' · bản thử nghiệm ' + esc(APP.version) + '</p>';
}

/* ---------- Sự kiện của các trang phụ ---------- */
$('pageBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pg]'); if (!b) return;
  const a = b.dataset.pg, v = b.dataset.v;
  if (a === 'set') { if (b.dataset.k === 'theme' && v === 'pink' && !isPro()) { needPro('Giao diện Hồng nhạt'); return; } store.settings[b.dataset.k] = v; persist(); applySettings(); refreshAll(); return; }
  if (a === 'copy') { copyText(v); return; }
  if (a === 'ptype') { promoType = v; renderPage(); return; }
  if (a === 'redeem') {
    const r = redeem(store.points, v, { today: todayStr() });
    if (r.error) { toast(r.error); return; }
    store.points = r.points; store.vouchers.unshift(r.voucher); persist(); toast('Đã đổi voucher ' + r.voucher.code); renderPage(); return;
  }
  if (a === 'connect') {
    if (store.friends.includes(v)) store.friends = store.friends.filter((x) => x !== v);
    else { store.friends.push(v); givePoints('friend'); }
    persist(); renderPage(); return;
  }
  if (a === 'star') { rateDraft.text = ($('rateText') || {}).value ?? rateDraft.text; rateDraft.stars = +v; renderPage(); return; }
  if (a === 'sendrate') {
    rateDraft.text = $('rateText').value; const first = !store.review;
    store.review = { stars: rateDraft.stars, text: rateDraft.text, at: Date.now() }; persist();
    if (first) givePoints('rate'); else toast('Đã cập nhật đánh giá');
    renderPage();
  }
});
$('pageBody').addEventListener('input', (e) => {
  if (e.target.id === 'promoQ') { promoQ = e.target.value; $('promoList').innerHTML = promoListHtml(); }
  if (e.target.id === 'rateText') rateDraft.text = e.target.value;
});
$('pageBody').addEventListener('change', (e) => {
  if (e.target.id === 'curSel') { store.settings.currency = e.target.value; persist(); applySettings(); refreshAll(); }
  if (e.target.id === 'prefAud') { store.prefs.audience = e.target.value; persist(); }
  if (e.target.id === 'prefBud') { store.prefs.budget = e.target.value; persist(); }
});

/* ---------- Ảnh chuyến đi của tôi và khuyến mãi tại địa điểm ---------- */
let detailPlace = null, phUrls = [];
const photoKey = (placeId) => (currentTripId || 'draft') + ':' + placeId;
function placePromosHtml(items) {
  const list = items.filter((p) => isValid(p, todayStr()));
  return list.length ? '<div class="pd"><h3>Khuyến mãi tại đây</h3>' + list.map((p) => '<div class="panel promo" style="margin-bottom:8px"><h3>' + esc(p.title) + ' <span class="badge-demo">mẫu</span></h3><p style="margin:4px 0 0">' + esc(p.desc) + '</p>' +
    (p.code ? '<div class="code">' + esc(p.code) + ' <button type="button" class="btn quiet" data-copy="' + esc(p.code) + '">Chép</button></div>' : '') + '</div>').join('') + '</div>' : '';
}
function placeExtrasHtml(place) {
  return placePromosHtml(PROMOS.promos.filter((p) => p.target.type === 'place' && p.target.ref === place.id)) + '<div class="pd" id="myPhotos"></div>';
}
async function renderMyPhotos() {
  const box = $('myPhotos'); if (!box || !detailPlace) return;
  let n = 0; try { n = (await listPhotos(photoKey(detailPlace))).length; } catch (err) { /* không đọc được thì coi như chưa có */ }
  const d = momData(currentTripId || 'draft', detailPlace), has = n || d.rating || d.text;
  box.innerHTML = '<h3>Khoảnh khắc của tôi</h3><p class="hint">' + (has ? 'Bạn đã đăng ' + n + ' ảnh' + (d.rating ? ' và chấm ' + d.rating + ' sao' : '') + ' cho nơi này.' : 'Chưa có ảnh hay nhận xét cho nơi này.') + '</p>' +
    '<button type="button" class="btn" data-momgo="' + detailPlace + '">' + (has ? 'Xem và thêm khoảnh khắc' : 'Thêm ảnh và cảm nhận') + '</button>';
}
$('sheetBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-momgo]'); if (!b) return;
  const pid = b.dataset.momgo; momTrip = currentTripId || 'draft'; momChosen = true; momOpen.add(pid); closeSheet(); go('moments');
  setTimeout(() => { const el = document.querySelector('details[data-mom="' + pid + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 400);
});

/* ---------- Mã giảm giá và voucher khi thanh toán ---------- */
function promoCtx(b) {
  return { flightsTotal: b.flights ? b.flights.total : 0, hotelTotal: b.hotel ? b.hotel.total : 0, payAmount: b.base, flightOut: b.flights ? b.flights.out : null, hotel: b.hotel, pro: isPro() };
}
function setDiscount(b, d) {
  b.discount = d; b.amount = Math.max(1000, b.base - (d ? d.amount : 0)); persist(); renderPay(b);
}
function promoMsg(text, bad) { const m = $('promoMsg'); if (m) { m.textContent = text; m.className = bad ? 'hint late' : 'saved-ok'; } }
function promoBoxHtml(b) {
  if (b.status !== 'chua_chuyen') return b.discount ? '<p class="hint">Đã áp ' + esc(b.discount.label) + ': giảm ' + moneyVnd(b.discount.amount) + '.</p>' : '';
  const usable = store.vouchers.filter((v) => !v.used && v.expires >= todayStr());
  return '<div class="paybox" style="margin:12px 0"><label for="promoCode">Mã giảm giá hoặc voucher</label><div class="row" style="grid-template-columns:1fr auto;gap:8px"><input id="promoCode" placeholder="Nhập mã, ví dụ CHAOARROW" autocomplete="off"><button type="button" class="btn" data-promo="apply">Áp dụng</button></div>' +
    (usable.length ? '<div class="chips" style="margin-top:8px">' + usable.map((v) => '<button type="button" data-promo="voucher" data-v="' + esc(v.code) + '">Voucher ' + esc(v.code) + ' −' + moneyVnd(v.value) + '</button>').join('') + '</div>' : '') +
    (b.discount ? '<p class="saved-ok">Đang áp ' + esc(b.discount.label) + ': giảm ' + moneyVnd(b.discount.amount) + ' <button type="button" class="btn quiet" style="min-height:36px" data-promo="remove">Bỏ mã</button></p>' : '') + '<p id="promoMsg" class="hint" aria-live="polite"></p></div>';
}
$('sheetBody').addEventListener('click', (e) => {
  const pr = e.target.closest('[data-promo]'); if (!pr) return;
  const b = payBooking; if (!b) return;
  const act = pr.dataset.promo;
  if (act === 'remove') { setDiscount(b, null); return; }
  if (act === 'voucher') {
    const v = store.vouchers.find((x) => x.code === pr.dataset.v), r = voucherCheck(v, b.base, todayStr());
    if (!r.ok) { promoMsg(r.reason, true); return; }
    setDiscount(b, { kind: 'voucher', code: v.code, amount: r.discount, label: 'voucher ' + v.code }); return;
  }
  const code = $('promoCode').value.trim(); if (!code) { promoMsg('Hãy nhập mã.', true); return; }
  const wallet = store.vouchers.find((x) => x.code.toLowerCase() === code.toLowerCase());
  if (wallet) { const r = voucherCheck(wallet, b.base, todayStr()); if (!r.ok) { promoMsg(r.reason, true); return; } setDiscount(b, { kind: 'voucher', code: wallet.code, amount: r.discount, label: 'voucher ' + wallet.code }); return; }
  const p = findByCode(PROMOS.promos, code, todayStr());
  if (!p) { promoMsg('Mã không đúng hoặc đã hết hạn.', true); return; }
  const r = applyPromo(p, promoCtx(b));
  if (!r.ok) { promoMsg(r.reason, true); return; }
  setDiscount(b, { kind: 'promo', code: p.code, amount: r.discount, label: 'mã ' + p.code });
});
const flightPromo = (carrier) => PROMOS.promos.some((p) => p.target.type === 'flight' && p.target.carrier === carrier && isValid(p, todayStr()));
const hotelPromo = (stars) => PROMOS.promos.some((p) => p.target.type === 'hotel' && stars >= (p.target.minStars || 0) && isValid(p, todayStr()));

applyForm({});
applySettings();
updateBadge();
renderHome();
