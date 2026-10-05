// Ước tính chi phí chuyến đi sau khi chốt lịch trình. Giá lấy từ data/travel-options.json (dữ liệu mẫu).
import { daysBetween } from './scheduler.js';

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
export function estimateCost({ trip, plan, flight, hotel }) {
  const people = trip.people;
  const nDays = daysBetween(trip.startDate, trip.endDate);
  const nights = Math.max(0, nDays - 1);
  const items = plan.days.flatMap((d) => d.items.filter((i) => i.kind === 'visit' && i.place));
  const tickets = items.reduce((s, i) => s + i.place.price, 0) * people;
  const km = plan.days.reduce((s, d) => s + (d.totalKm || 0), 0);

  const lines = [];
  if (flight) lines.push({ key: 'flight', label: 'Vé máy bay khứ hồi', amount: flight.priceRoundTrip * people, note: `${people} người × ${flight.priceRoundTrip.toLocaleString('vi-VN')} đ` });
  if (hotel && nights > 0) {
    const rooms = Math.ceil(people / hotel.capacity);
    lines.push({ key: 'hotel', label: 'Khách sạn', amount: hotel.pricePerRoom * rooms * nights, note: `${rooms} phòng × ${nights} đêm` });
  }
  lines.push({ key: 'food', label: 'Ăn uống', amount: (FOOD_PER_PERSON_DAY[trip.budget] ?? 0) * people * nDays, note: `${people} người × ${nDays} ngày` });
  lines.push({ key: 'tickets', label: 'Vé tham quan', amount: tickets, note: `${items.length} điểm` });
  lines.push({ key: 'local', label: 'Di chuyển trong thành phố', amount: Math.round((km * LOCAL_TRANSPORT_PER_KM) / 1000) * 1000, note: `${km.toFixed(1)} km` });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, perPerson: Math.round(total / people), nights };
}
