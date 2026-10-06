// Ước tính chi phí chuyến đi sau khi chốt lịch trình. Giá lấy từ data/travel-options.json (dữ liệu mẫu).
import { daysBetween } from './scheduler.js';
import { money } from './format.js';

export const FOOD_PER_PERSON_DAY = { tiet_kiem: 150000, vua_phai: 350000, thoai_mai: 700000 }; // ăn uống mỗi người mỗi ngày
export const LOCAL_TRANSPORT_PER_KM = 10000; // taxi / xe công nghệ trong thành phố

export function hotelsFor(hotels, trip) {
  return hotels
    .filter((h) => (!trip.hasKids || h.kids) && (!trip.hasElderly || h.elderly))
    .sort((a, b) => a.pricePerRoom - b.pricePerRoom);
}

// Gợi ý mặc định theo ngân sách
export function defaultHotel(hotels, trip) {
  return hotels.find((h) => h.tier === trip.budget) || hotels[0];
}
export function defaultFlight(flights, trip) {
  if (!flights.length) return null;
  const sorted = [...flights].sort((a, b) => a.priceRoundTrip - b.priceRoundTrip);
  return trip.budget === 'thoai_mai' ? sorted[sorted.length - 1] : sorted[0];
}

// plan: kết quả buildItinerary (có thể đã chỉnh sửa). flight = null nghĩa là tự túc, không tính vé máy bay.
export function estimateCost({ trip, plan, flight, hotel, transport = null }) {
  const people = trip.people;
  const nDays = daysBetween(trip.startDate, trip.endDate);
  const nights = Math.max(0, nDays - 1);
  const items = plan.days.flatMap((d) => d.items.filter((i) => i.kind === 'visit' && i.place));
  const tickets = items.reduce((s, i) => s + i.place.price, 0) * people;
  const km = plan.days.reduce((s, d) => s + (d.totalKm || 0), 0);

  const lines = [];
  if (flight) lines.push({ key: 'flight', label: 'Vé máy bay khứ hồi', amount: flight.priceRoundTrip * people, note: `${people} người × ${money(flight.priceRoundTrip)}` });
  if (hotel && nights > 0) {
    const rooms = Math.ceil(people / hotel.capacity);
    const perRoom = hotel.stayPerRoom ?? hotel.pricePerRoom * nights; // giá từng đêm đã tính theo ngày nếu có
    lines.push({ key: 'hotel', label: 'Khách sạn', amount: perRoom * rooms, note: `${rooms} phòng × ${nights} đêm` });
  }
  lines.push({ key: 'food', label: 'Ăn uống', amount: (FOOD_PER_PERSON_DAY[trip.budget] ?? 0) * people * nDays, note: `${people} người × ${nDays} ngày` });
  lines.push({ key: 'tickets', label: 'Vé tham quan', amount: tickets, note: `${items.length} điểm` });
  if (transport && transport.skip) { /* đã có phương tiện riêng: không tính phí di chuyển */ }
  else if (transport) lines.push({ key: 'local', label: `Di chuyển: ${transport.name}`, amount: transport.total, note: `${transport.totalKm} km, ${transport.vehicles} xe` });
  else lines.push({ key: 'local', label: 'Di chuyển trong thành phố', amount: Math.round((km * LOCAL_TRANSPORT_PER_KM) / 1000) * 1000, note: `${km.toFixed(1)} km` });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, perPerson: Math.round(total / people), nights };
}
