// Tìm chuyến bay và khách sạn theo ngày đã chọn. DỮ LIỆU MẪU: giá và chỗ trống sinh theo quy tắc cố định,
// không phải dữ liệu thật. Muốn tìm đủ mọi hãng thật cần nguồn dữ liệu của đại lý hoặc API trả phí.
import { addDays, daysBetween } from './scheduler.js';

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const round1000 = (n) => Math.round(n / 1000) * 1000;
const dow = (date) => new Date(date + 'T00:00:00Z').getUTCDay(); // 0 = Chủ nhật
const hm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toM = (t) => +t.slice(0, 2) * 60 + +t.slice(3);

const DOW_FACTOR = [1.1, 0.95, 0.9, 0.9, 1.0, 1.15, 1.1]; // CN, T2 ... T7: giá bay theo thứ
const timeFactor = (t) => { const m = toM(t); return m < 420 ? 0.9 : m < 660 ? 1.0 : m < 960 ? 0.95 : m < 1200 ? 1.15 : 0.9; };
const advanceFactor = (daysUntil) => (daysUntil <= 2 ? 1.35 : daysUntil <= 7 ? 1.2 : daysUntil <= 21 ? 1.0 : 0.9);

// Chuyến bay một chiều. direction 'out' = từ nơi khởi hành đến Đà Nẵng, 'back' = chiều ngược lại.
export function searchFlights({ data, originId, date, direction, people, today = new Date().toISOString().slice(0, 10) }) {
  const route = data.routes[originId];
  if (!route) return [];
  const daysUntil = daysBetween(today, date) - 1;
  const from = direction === 'out' ? route.airport : data.destination.airport, to = direction === 'out' ? data.destination.airport : route.airport;
  const list = [];
  for (const c of data.carriers) {
    const base = route.base[c.id];
    if (!base) continue;
    for (const dep of c.departures) {
      const id = `${c.id}-${originId}-${direction}-${date}-${dep}`, h = hash(id);
      const jitter = 0.95 + (h % 11) / 100; // 0.95 - 1.05
      const price = round1000(base * DOW_FACTOR[dow(date)] * timeFactor(dep) * advanceFactor(daysUntil) * jitter);
      const seatsLeft = 1 + ((h >>> 6) % 9);
      const arriveMin = toM(dep) + route.durationMin;
      list.push({ id, carrierId: c.id, airline: c.name, code: c.code, type: c.type, flightNo: c.code + (100 + (h >>> 3) % 900), from, to, date, depart: dep, arrive: hm(arriveMin),
        nextDay: arriveMin >= 1440, durationMin: route.durationMin, baggage: c.baggage, priceOne: price, seatsLeft, soldOut: seatsLeft < people });
    }
  }
  return list;
}

export function sortFlights(list, sort) {
  const by = sort === 'time' ? (a, b) => a.depart.localeCompare(b.depart) : (a, b) => a.priceOne - b.priceOne;
  return [...list].sort((a, b) => (a.soldOut - b.soldOut) || by(a, b));
}
export const cheapestFlight = (list) => sortFlights(list, 'price').find((f) => !f.soldOut) || null;

const nightFactor = (date) => { const d = dow(date); return d === 5 || d === 6 ? 1.25 : d === 0 ? 1.1 : 1; };

// Giá và phòng trống của một loại phòng trong kỳ nghỉ: giá từng đêm, phòng còn lại từng đêm
export function priceStay(hotel, room, { checkIn, nights, people }) {
  const rooms = Math.ceil(people / room.sleeps);
  const nightly = [];
  for (let i = 0; i < nights; i++) {
    const date = addDays(checkIn, i), h = hash(hotel.id + date), d = dow(date);
    const soldOut = h % 100 < (d === 5 || d === 6 ? 12 : 6);
    nightly.push({ date, price: round1000(hotel.pricePerRoom * room.factor * nightFactor(date)), left: soldOut ? 0 : 1 + ((h >>> 8) % 6) });
  }
  const short = nightly.find((n) => n.left < rooms);
  const fmt = (s) => s.slice(8) + '/' + s.slice(5, 7);
  const reason = short ? (short.left === 0 ? `Hết phòng ngày ${fmt(short.date)}` : `Chỉ còn ${short.left} phòng ngày ${fmt(short.date)}`) : '';
  const stayPerRoom = nightly.reduce((s, n) => s + n.price, 0);
  return { rooms, nightly, stayPerRoom, total: stayPerRoom * rooms, avgNight: nights ? round1000(stayPerRoom / nights) : 0, available: !short, reason };
}

// Khách sạn theo ngày nhận và trả phòng đã chọn; roomByHotel: loại phòng đang chọn cho từng khách sạn
export function searchHotels({ hotels, checkIn, checkOut, people, roomByHotel = {} }) {
  const nights = Math.max(0, daysBetween(checkIn, checkOut) - 1);
  return hotels.map((hotel) => {
    const room = hotel.roomTypes.find((r) => r.id === roomByHotel[hotel.id]) || hotel.roomTypes[0];
    return { ...hotel, room, capacity: room.sleeps, nights, checkIn, people, ...priceStay(hotel, room, { checkIn, nights, people }) };
  });
}

export function sortHotels(list, sort) {
  const by = sort === 'rating' ? (a, b) => b.rating - a.rating : (a, b) => a.total - b.total;
  return [...list].sort((a, b) => (b.available - a.available) || by(a, b));
}
