// Đề xuất phương tiện di chuyển và tự tính chi phí theo quãng đường của lịch trình.
// Giá lấy từ data/transport.json (dữ liệu mẫu).
import { distanceKm } from './scheduler.js';

const round1k = (n) => Math.round(n / 1000) * 1000;
const r1 = (n) => +n.toFixed(1);

// Gom mọi chặng đi trong chuyến: giữa các điểm, khách sạn <-> điểm, sân bay <-> nơi ở
export function tripLegs(plan, { hotel = null, flight = null, airport = null } = {}) {
  const legs = [];
  const firstOf = (d) => d.items.find((i) => i.place)?.place;
  const lastOf = (d) => [...d.items].reverse().find((i) => i.place)?.place;
  plan.days.forEach((d, di) => {
    d.items.forEach((i) => { if (i.travel) legs.push({ km: i.travel.km, day: di, kind: 'between' }); });
    const first = firstOf(d), last = lastOf(d);
    if (hotel && first) {
      legs.push({ km: r1(distanceKm(hotel, first)), day: di, kind: 'hotel' });
      legs.push({ km: r1(distanceKm(last, hotel)), day: di, kind: 'hotel' });
    }
  });
  if (flight && airport && plan.days.length) {
    const firstDay = plan.days[0], lastDay = plan.days[plan.days.length - 1];
    const arriveAt = hotel || firstOf(firstDay), leaveFrom = hotel || lastOf(lastDay);
    if (arriveAt) legs.push({ km: r1(distanceKm(airport, arriveAt)), day: 0, kind: 'airport' });
    if (leaveFrom) legs.push({ km: r1(distanceKm(leaveFrom, airport)), day: plan.days.length - 1, kind: 'airport' });
  }
  return legs;
}

export function priceMode(mode, legs, { people, nDays }) {
  const vehicles = Math.ceil(people / mode.cap);
  const totalKm = legs.reduce((s, l) => s + l.km, 0);
  let perVehicle;
  if (mode.kind === 'ride') perVehicle = legs.reduce((s, l) => s + mode.base + Math.max(0, l.km - mode.baseKm) * mode.perKm, 0);
  else if (mode.kind === 'rental') perVehicle = nDays * mode.perDay + totalKm * mode.fuelPerKm;
  else perVehicle = nDays * mode.perDay + Math.max(0, totalKm - mode.includedKmPerDay * nDays) * mode.extraPerKm;
  const total = round1k(perVehicle * vehicles);
  return { vehicles, total, perPerson: round1k(total / people), totalKm: r1(totalKm) };
}

export function transportOptions({ trip, plan, hotel, flight, modes, airport, nDays }) {
  const legs = tripLegs(plan, { hotel, flight, airport });
  const options = modes.map((m) => {
    const p = priceMode(m, legs, { people: trip.people, nDays });
    let reason = '';
    if (trip.hasKids && !m.kidsOk) reason = 'Không hợp khi có trẻ nhỏ';
    else if (trip.hasElderly && !m.elderlyOk) reason = 'Không hợp khi có người lớn tuổi';
    return { ...m, ...p, legCount: legs.length, suitable: !reason, reason, crowded: p.vehicles > 3, tags: [] };
  }).sort((a, b) => (b.suitable - a.suitable) || (a.total - b.total));

  const good = options.filter((o) => o.suitable && !o.crowded);
  const pool = good.length ? good : options.filter((o) => o.suitable);
  const cheapest = pool[0] || null;
  const comfort = pool.find((o) => o.kind !== 'rental' && o.id !== 'xe-om-cn' && o.cap >= 4);
  if (cheapest) cheapest.tags.push('Rẻ nhất');
  if (comfort && comfort !== cheapest) comfort.tags.push('Ô tô rẻ nhất');
  return { legs, totalKm: r1(legs.reduce((s, l) => s + l.km, 0)), options, defaultId: cheapest ? cheapest.id : null };
}
