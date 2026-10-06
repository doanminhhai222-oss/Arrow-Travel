// Định dạng tiền: dữ liệu luôn lưu bằng VND, chỉ đổi cách hiển thị. Tỉ giá là SỐ MẪU, thanh toán luôn bằng VND.
import { tr, getLang } from './i18n.js';

export const CURRENCIES = {
  VND: { rate: 1, label: 'VND (đ)' },
  USD: { rate: 25400, label: 'USD ($)' },
  EUR: { rate: 27500, label: 'EUR (€)' },
  JPY: { rate: 170, label: 'JPY (¥)', digits: 0 },
  KRW: { rate: 18, label: 'KRW (₩)', digits: 0 },
};
let cur = 'VND';
export const getCurrency = () => cur;
export function setCurrency(c) { if (CURRENCIES[c]) cur = c; }

export const moneyVnd = (n) => Math.round(n).toLocaleString('vi-VN') + ' đ';
export function money(vndAmount) {
  if (cur === 'VND') return moneyVnd(vndAmount);
  const c = CURRENCIES[cur], v = vndAmount / c.rate;
  const digits = c.digits ?? (v < 100 ? 2 : 0);
  return new Intl.NumberFormat(getLang() === 'en' ? 'en-US' : 'vi-VN', { style: 'currency', currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}
export const vnd = (n) => (n ? money(n) : tr('Miễn phí'));
