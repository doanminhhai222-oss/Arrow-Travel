// Xếp lịch bằng quy tắc thuần, không gọi AI. Chạy được cả Node và trình duyệt.

export const BUDGET_CAP = { tiet_kiem: 250000, vua_phai: 1000000, thoai_mai: Infinity }; // giá vé tối đa / điểm / người
export const STYLE_TYPES = {
  thien_nhien: ['beach', 'park'],
  van_hoa: ['culture'],
  am_thuc: ['food'],
  check_in: ['checkin', 'show'],
  thu_gian: ['cafe', 'beach'],
};
const EVENING_FROM = 17 * 60;
const MAX_WAIT = 90; // phút chờ tối đa cho giờ mở cửa / khung giờ đẹp

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function distanceKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3; // nhân 1.3: đường thực tế dài hơn đường chim bay
}
export const travelMinutes = (km) => Math.round((km / 25) * 60) + 3; // ~25 km/h trong phố, +3 phút gửi/đỗ xe

export function daysBetween(start, end) {
  const d = (s) => Date.UTC(...s.split('-').map((v, i) => (i === 1 ? v - 1 : +v)));
  return Math.round((d(end) - d(start)) / 86400000) + 1;
}
export function addDays(date, n) {
  const t = new Date(Date.UTC(...date.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) + n * 86400000);
  return t.toISOString().slice(0, 10);
}

// Bước 1-2: lọc địa điểm
export function filterPlaces(places, trip) {
  const cap = BUDGET_CAP[trip.budget] ?? Infinity;
  const warnings = [];
  const ok = places.filter((p) => {
    if (p.status === 'closed') return false;
    if (!p.audiences.includes(trip.audience)) return false;
    if (trip.hasKids && !p.kids) return false;
    if (trip.hasElderly && !p.elderly) return false;
    if (p.price > cap) return false;
    return true;
  });
  ok.filter((p) => p.freshness === 'stale').forEach((p) => warnings.push(`Thông tin "${p.name}" đã quá hạn, nên kiểm tra lại.`));
  return { places: ok, warnings };
}

// Điều chỉnh quy tắc theo trẻ nhỏ / người lớn tuổi
export function effectiveRules(rule, trip) {
  const r = { ...rule };
  if (trip.hasKids) r.lunchMin = Math.max(r.lunchMin, 120);
  if (trip.hasElderly) {
    r.maxWalking = Math.min(r.maxWalking, 1);
    r.maxPerDay = Math.max(2, r.maxPerDay - 1);
    r.lunchMin = Math.max(r.lunchMin, 90);
    r.maxTravelMin = Math.min(r.maxTravelMin, 30);
  }
  return r;
}

// Thử xếp 1 địa điểm vào thời điểm `clock`; trả về {start,end,travel} hoặc null
function tryFit(place, clock, last, rule) {
  let km = 0, tmin = 0;
  if (last) { km = distanceKm(last, place); tmin = travelMinutes(km); if (tmin > rule.maxTravelMin) return null; }
  let start = clock + tmin;
  if (place.slot === 'evening') start = Math.max(start, rule.eveningFrom ?? EVENING_FROM);
  const open = toMin(place.open), close = toMin(place.close);
  if (start < open) start = open;
  if (start - (clock + tmin) > MAX_WAIT) return null;
  const end = start + place.duration;
  if (end > close || end > toMin(rule.end)) return null;
  return { start, end, km: +km.toFixed(1), travelMin: tmin };
}

export const styleList = (trip) => trip.styles ?? (trip.style ? [trip.style] : []);

function score(place, fit, rule, styles) {
  let s = 0;
  const h = fit.start;
  if (place.slot === 'morning') s += h < 12 * 60 ? 3 : -2;
  if (place.slot === 'afternoon') s += h >= 12 * 60 && h < 17 * 60 ? 3 : 0;
  if (place.slot === 'evening') s += h >= EVENING_FROM ? 3 : -3;
  if (rule.preferSlot === 'evening' && place.slot === 'evening') s += 2;
  if (rule.preferTypes?.includes(place.type)) s += 2;
  for (const st of styles) if ((STYLE_TYPES[st] || []).includes(place.type)) s += 2; // chọn nhiều phong cách: mỗi phong cách khớp cộng 2
  s -= fit.travelMin / 15;
  return s;
}

export function planDay(date, pool, rule, trip, visited) {
  const items = [];
  let clock = toMin(rule.start), last = null, lunchDone = false, dinnerDone = false, sights = 0;
  const lunchAt = toMin(rule.lunchStart);

  const pushVisit = (place, fit, kind, note) => {
    items.push({ kind, time: toHHMM(fit.start), end: toHHMM(fit.end), duration: fit.end - fit.start,
      travel: last ? { km: fit.km, min: fit.travelMin } : null, place, note });
    visited.add(place.id); last = place; clock = fit.end;
  };
  const pickBest = (cands, filterFn) => {
    let best = null;
    for (const p of cands) {
      if (visited.has(p.id) || !filterFn(p)) continue;
      const fit = tryFit(p, clock, last, rule);
      if (!fit) continue;
      const sc = score(p, fit, rule, styleList(trip));
      if (!best || sc > best.sc) best = { p, fit, sc };
    }
    return best;
  };
  const food = (meal) => pool.filter((p) => p.type === 'food' && p.meal === meal);
  const sightsPool = pool.filter((p) => p.type !== 'food' || !p.meal);

  const doLunch = () => {
    lunchDone = true;
    const b = pickBest(food('lunch'), () => true);
    if (b) {
      const fit = { ...b.fit, end: Math.max(b.fit.end, b.fit.start + rule.lunchMin) };
      pushVisit(b.p, fit, 'meal', rule.lunchMin > b.p.duration ? 'Ăn trưa và nghỉ ngơi' : 'Ăn trưa');
    } else {
      items.push({ kind: 'break', time: toHHMM(clock), end: toHHMM(clock + rule.lunchMin), duration: rule.lunchMin, travel: null, place: null, note: 'Nghỉ trưa' });
      clock += rule.lunchMin;
    }
  };

  while (sights < rule.maxPerDay) {
    if (!lunchDone && clock >= lunchAt) { doLunch(); continue; }
    const b = pickBest(sightsPool, (p) => {
      if (lunchDone) return true;
      const f = tryFit(p, clock, last, rule);
      // điểm kéo dài qua giờ trưa: chỉ nhận nếu đủ dài để coi như đã gồm bữa trưa
      return !f || f.end <= lunchAt + 90 || p.duration >= 240;
    });
    if (!b) break;
    if (!lunchDone && (b.fit.end > lunchAt + 90 || b.p.duration >= 240)) lunchDone = true;
    pushVisit(b.p, b.fit, 'visit');
    sights++;
  }
  if (!lunchDone && clock < toMin(rule.end) - 240) doLunch();

  if (!dinnerDone) {
    const d = pickBest(food('dinner'), () => true);
    if (d && d.fit.start >= EVENING_FROM - 30) { pushVisit(d.p, d.fit, 'meal', 'Ăn tối'); dinnerDone = true; }
  }
  const totalKm = +items.reduce((s, i) => s + (i.travel?.km || 0), 0).toFixed(1);
  return { date, items, totalKm, placeCount: items.filter((i) => i.place).length };
}

// Hàm chính: trip → lịch trình JSON
export function buildItinerary(trip, data, rules) {
  const rule = effectiveRules(rules[trip.audience], trip);
  const { places, warnings } = filterPlaces(data.places, trip);
  const nDays = daysBetween(trip.startDate, trip.endDate);
  const visited = new Set();
  const days = [];
  for (let i = 0; i < nDays; i++) {
    const day = planDay(addDays(trip.startDate, i), places, rule, trip, visited);
    day.dayIndex = i + 1;
    if (day.placeCount === 0) warnings.push(`Ngày ${i + 1}: không còn đủ địa điểm phù hợp.`);
    days.push(day);
  }
  return { trip, audienceLabel: rules[trip.audience].label, days, warnings: [...new Set(warnings)] };
}
