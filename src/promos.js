// Khuyến mãi: tìm theo địa điểm, chuyến bay, khách sạn và áp mã giảm giá vào đơn. DỮ LIỆU MẪU.

const foldP = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const r1000 = (n) => Math.round(n / 1000) * 1000;
export const isValid = (p, today) => !p.validTo || p.validTo >= today;

export function searchPromos(promos, { q = '', type = 'all', today }) {
  const k = foldP(q.trim());
  return promos.filter((p) => isValid(p, today) && (type === 'all' || p.target.type === type)
    && (!k || foldP([p.title, p.desc, p.code || '', p.target.name || ''].join(' ')).includes(k)));
}
export const findByCode = (promos, code, today) => promos.find((p) => p.code && p.code.toLowerCase() === String(code).trim().toLowerCase() && isValid(p, today)) || null;

// ctx: { flightsTotal, hotelTotal, payAmount, flightOut, hotel } -> { ok, discount, reason }
export function applyPromo(p, ctx) {
  if (p.kind === 'perk') return { ok: false, discount: 0, reason: 'Ưu đãi này nhận trực tiếp tại nơi sử dụng, không trừ vào đơn.' };
  const t = p.target.type;
  if (t === 'place') return { ok: false, discount: 0, reason: 'Ưu đãi này dùng tại địa điểm, không trừ vào đơn.' };
  if (t === 'flight' && ctx.flightOut?.carrierId !== p.target.carrier) return { ok: false, discount: 0, reason: `Chỉ áp dụng khi chọn chuyến bay của ${p.target.name || p.target.carrier}.` };
  if (t === 'hotel' && (!ctx.hotel || ctx.hotel.stars < (p.target.minStars || 0))) return { ok: false, discount: 0, reason: `Chỉ áp dụng khi chọn khách sạn từ ${p.target.minStars} sao.` };
  const base = t === 'flight' ? ctx.flightsTotal : t === 'hotel' ? ctx.hotelTotal : ctx.payAmount;
  if (!(base > 0)) return { ok: false, discount: 0, reason: 'Đơn chưa có khoản phù hợp với mã này.' };
  if (p.min && base < p.min) return { ok: false, discount: 0, reason: `Cần đơn phù hợp từ ${p.min.toLocaleString('vi-VN')} đ.` };
  const raw = p.kind === 'percent' ? r1000((base * p.value) / 100) : p.value;
  const discount = Math.min(raw, p.max ?? Infinity, base);
  return { ok: true, discount, reason: '' };
}
export const daysLeft = (p, today) => (p.validTo ? Math.max(0, Math.round((Date.parse(p.validTo) - Date.parse(today)) / 86400000)) : null);
