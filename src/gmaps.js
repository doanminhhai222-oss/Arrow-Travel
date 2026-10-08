// Đọc toạ độ (và tên nếu có) từ link Google Maps hoặc chuỗi "vĩ độ, kinh độ" người dùng dán vào.
// Không gọi mạng: link rút gọn (maps.app.goo.gl, goo.gl/maps) không đọc được, trả về lý do để hướng dẫn người dùng.

const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

export function parseMapsInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (/^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(s)) return { ok: false, reason: 'short' };
  let text = s;
  try { text = decodeURIComponent(s.replace(/\+/g, ' ')); } catch { /* giữ nguyên nếu link hỏng mã hoá */ }
  // Thứ tự ưu tiên: ghim địa điểm (!3d…!4d…) chính xác hơn tâm bản đồ (@lat,lng)
  const tries = [
    new RegExp('!3d' + num + '!4d' + num),
    new RegExp('[?&](?:q|query|ll|destination|daddr)=' + num + '\\s*,\\s*' + num),
    new RegExp('@' + num + ',' + num),
    new RegExp('^' + num + '\\s*[,;\\s]\\s*' + num + '$'),
  ];
  for (const re of tries) {
    const m = text.match(re);
    if (m) {
      const lat = +m[1], lng = +m[2];
      if (!valid(lat, lng)) return { ok: false, reason: 'range' };
      const name = (text.match(/\/maps\/place\/([^/@?]+)/) || [])[1];
      return { ok: true, lat, lng, name: name ? name.trim() : '' };
    }
  }
  return { ok: false, reason: 'nocoords' };
}

export const mapsSearchLink = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q || '');
