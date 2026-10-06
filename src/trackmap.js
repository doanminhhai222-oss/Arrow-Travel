// Bản đồ theo dõi chuyến đi vẽ bằng SVG từ toạ độ: điểm đã đi, điểm sắp tới, vị trí hiện tại, gợi ý gần đó.
import { NEARBY_CATS, straightKm } from './nearby.js';

const tEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// stops: [{ place, visited, next }], current: { lat, lng, acc } | null, pois: [{ lat, lng, cat }]
export function trackMapSvg({ stops, current, pois = [] }) {
  const W = 340, H = 260, pad = 30;
  const pts = [...stops.map((s) => s.place), ...pois, ...(current ? [current] : [])];
  if (!pts.length) return '';
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const kx = 111 * Math.cos((lat0 * Math.PI) / 180), ky = 111;
  const xs = pts.map((p) => p.lng * kx), ys = pts.map((p) => -p.lat * ky);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.6), spanY = Math.max(maxY - minY, 0.6);
  const sc = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const ox = (W - spanX * sc) / 2 - minX * sc, oy = (H - spanY * sc) / 2 - minY * sc;
  const P = (p) => ({ x: (p.lng * kx) * sc + ox, y: (-p.lat * ky) * sc + oy });
  const f = (n) => n.toFixed(1);
  const bar = [10, 5, 2, 1, 0.5, 0.2].find((k) => k * sc <= 80) || 0.2;

  let s = `<svg class="tmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bản đồ theo dõi chuyến đi"><rect width="${W}" height="${H}" fill="#e6f1ec"/>`;
  for (let i = 1; i < 8; i++) s += `<path d="M${(W / 8) * i} 0V${H}" stroke="#d3e4dc"/>`;
  for (let i = 1; i < 6; i++) s += `<path d="M0 ${(H / 6) * i}H${W}" stroke="#d3e4dc"/>`;
  const route = stops.map((x) => P(x.place));
  if (route.length > 1) s += `<polyline points="${route.map((q) => f(q.x) + ',' + f(q.y)).join(' ')}" fill="none" stroke="#0F766E" stroke-width="2" stroke-dasharray="5 4"/>`;
  pois.forEach((p) => {
    const q = P(p), c = NEARBY_CATS[p.cat];
    s += `<g><rect x="${f(q.x - 8)}" y="${f(q.y - 8)}" width="16" height="16" rx="4" fill="${c.color}" stroke="#fff" stroke-width="2" transform="rotate(45 ${f(q.x)} ${f(q.y)})"/><text x="${f(q.x)}" y="${f(q.y + 3.5)}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${c.letter}</text></g>`;
  });
  stops.forEach((x, i) => {
    const q = P(x.place), fill = x.visited ? '#15803d' : x.next ? '#D9480F' : '#0F766E';
    s += `<g><circle cx="${f(q.x)}" cy="${f(q.y)}" r="${x.next ? 13 : 11}" fill="${fill}" stroke="#fff" stroke-width="3"/><text x="${f(q.x)}" y="${f(q.y + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${x.visited ? '✓' : i + 1}</text><title>${tEsc(x.place.name)}</title></g>`;
  });
  if (current) {
    const q = P(current), r = Math.min(40, Math.max(10, ((current.acc || 30) / 1000) * sc));
    s += `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(r)}" fill="#2563eb" fill-opacity=".18"/><circle cx="${f(q.x)}" cy="${f(q.y)}" r="7" fill="#2563eb" stroke="#fff" stroke-width="3"/>`;
  }
  s += `<path d="M12 ${H - 14}h${f(bar * sc)}" stroke="#17302d" stroke-width="3"/><text x="12" y="${H - 20}" font-size="10" fill="#17302d">${bar} km</text></svg>`;
  return s;
}
