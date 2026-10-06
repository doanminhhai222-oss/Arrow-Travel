// Tích điểm và voucher của Arrow Travel. Lưu trên thiết bị người dùng, KHÔNG có máy chủ kiểm chứng:
// điểm và voucher có thể bị sửa tay, nên chủ app vẫn phải đối chiếu số tiền khi xác nhận đơn.
import { addDays } from './scheduler.js';

export const EARN = [
  { id: 'save', label: 'Lưu một lịch trình mới', points: 10, note: 'mỗi lịch trình' },
  { id: 'photo', label: 'Đăng ảnh chuyến đi', points: 5, note: 'tối đa 10 ảnh', cap: 10 },
  { id: 'friend', label: 'Kết nối bạn đồng hành', points: 5, note: 'tối đa 5 người', cap: 5 },
  { id: 'rate', label: 'Đánh giá Arrow Travel', points: 20, note: 'một lần', cap: 1 },
];
export const CATALOG = [
  { id: 'v30', cost: 100, value: 30000, min: 500000 },
  { id: 'v100', cost: 250, value: 100000, min: 1500000 },
  { id: 'v250', cost: 500, value: 250000, min: 3000000 },
];
export const newPoints = () => ({ balance: 0, history: [], counters: {}, trips: [] });

// Cộng điểm theo quy tắc; trả về { points (đối tượng mới), awarded }
export function award(points, ruleId, { tripId = null, now = Date.now() } = {}) {
  const rule = EARN.find((r) => r.id === ruleId);
  if (!rule) return { points, awarded: 0 };
  const used = points.counters[ruleId] || 0;
  if (rule.cap && used >= rule.cap) return { points, awarded: 0 };
  if (ruleId === 'save') { if (!tripId || points.trips.includes(tripId)) return { points, awarded: 0 }; }
  const next = { ...points, balance: points.balance + rule.points, counters: { ...points.counters, [ruleId]: used + 1 },
    trips: ruleId === 'save' ? [...points.trips, tripId] : points.trips,
    history: [{ at: now, label: rule.label, delta: rule.points }, ...points.history].slice(0, 30) };
  return { points: next, awarded: rule.points };
}

export function redeem(points, tierId, { today, now = Date.now() }) {
  const tier = CATALOG.find((c) => c.id === tierId);
  if (!tier) return { error: 'Không có mức đổi này.' };
  if (points.balance < tier.cost) return { error: 'Chưa đủ điểm.' };
  const voucher = { code: 'AV' + now.toString(36).toUpperCase().slice(-6), value: tier.value, min: tier.min, expires: addDays(today, 90), used: false };
  return { voucher, points: { ...points, balance: points.balance - tier.cost, history: [{ at: now, label: `Đổi voucher ${tier.value.toLocaleString('vi-VN')} đ`, delta: -tier.cost }, ...points.history].slice(0, 30) } };
}

export function voucherCheck(v, amount, today) {
  if (v.used) return { ok: false, discount: 0, reason: 'Voucher đã dùng.' };
  if (v.expires < today) return { ok: false, discount: 0, reason: 'Voucher đã hết hạn.' };
  if (amount < v.min) return { ok: false, discount: 0, reason: `Cần đơn từ ${v.min.toLocaleString('vi-VN')} đ.` };
  return { ok: true, discount: Math.min(v.value, amount), reason: '' };
}
