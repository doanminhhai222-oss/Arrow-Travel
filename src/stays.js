// Các lần lưu trú của chuyến đi. Chuyến một thành phố có một lần; chuyến kết hợp (ví dụ Đà Nẵng + Hội An) mỗi thành phố một khách sạn riêng.
import { addDays, daysBetween } from './scheduler.js';

export const dayCity = (day, fallback = 'Đà Nẵng') => day.city || ((day.items.find((i) => i.place) || {}).place || {}).city || fallback;

// Trả về [{ city, checkIn, checkOut, nights }], bỏ lần lưu 0 đêm (ví dụ ngày cuối ở thành phố thứ hai chỉ có 1 ngày)
export function tripStays(plan) {
  const t = plan.trip, days = plan.days;
  if (!days.length) return [];
  const end = addDays(days[days.length - 1].date, 0);
  if (!(t.alsoVisit && t.alsoVisit.length)) {
    const n = Math.max(0, daysBetween(t.startDate, t.endDate) - 1);
    return n > 0 ? [{ city: t.destination, checkIn: t.startDate, checkOut: t.endDate, nights: n }] : [];
  }
  const segs = [];
  days.forEach((d) => { const c = dayCity(d, t.destination); if (!segs.length || segs[segs.length - 1].city !== c) segs.push({ city: c, checkIn: d.date }); });
  segs.forEach((s, i) => { s.checkOut = i + 1 < segs.length ? segs[i + 1].checkIn : end; s.nights = Math.max(0, daysBetween(s.checkIn, s.checkOut) - 1); });
  return segs.filter((s) => s.nights > 0);
}
