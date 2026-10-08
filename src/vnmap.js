// Bản đồ Việt Nam thu nhỏ (đường nét giản lược, dùng làm biểu tượng) kèm hai quần đảo Hoàng Sa và Trường Sa.
// Toạ độ [kinh độ, vĩ độ] làm tròn, chỉ để vẽ biểu tượng, KHÔNG dùng để đo đạc hay làm bản đồ hành chính.

const MAINLAND = [
  [102.1, 22.4], [102.6, 22.7], [103.1, 22.5], [103.9, 22.5], [104.4, 22.8], [105.0, 23.2], [105.4, 23.3], [106.0, 22.95], [106.7, 22.85], [107.4, 22.0], [108.0, 21.55],
  [107.6, 21.4], [107.0, 21.0], [106.8, 20.7], [106.5, 20.2], [106.1, 19.9], [105.9, 19.5], [105.8, 19.0], [106.1, 18.4], [106.4, 17.9], [106.7, 17.4], [107.1, 16.95], [107.7, 16.4], [108.2, 16.1], [108.7, 15.4], [108.9, 14.9],
  [109.2, 14.1], [109.3, 13.5], [109.3, 12.9], [109.2, 12.3], [109.2, 11.8], [108.9, 11.3], [108.1, 10.9], [107.5, 10.5], [107.0, 10.35], [106.7, 10.4], [106.8, 10.0], [106.6, 9.7], [106.0, 9.3], [105.6, 8.9], [104.9, 8.6], [104.8, 9.2], [105.1, 9.9], [104.8, 10.2], [104.5, 10.4],
  [104.8, 10.6], [105.0, 11.0], [105.8, 11.0], [106.1, 11.5], [106.9, 11.95], [107.45, 12.35], [107.5, 13.0], [107.5, 14.1], [107.3, 14.6], [107.5, 15.0], [107.1, 15.5], [106.6, 16.0], [106.5, 16.6], [105.9, 17.4], [105.3, 18.0], [105.1, 18.6], [104.2, 19.1], [104.1, 19.7], [104.5, 20.1], [104.0, 20.7], [103.7, 21.1], [103.1, 21.9], [102.6, 22.2],
];
// Hoàng Sa (Đà Nẵng) và Trường Sa (Khánh Hoà): các cụm đảo đại diện
const HOANG_SA = [[111.2, 16.55], [111.7, 16.5], [112.3, 16.6], [112.6, 16.3], [112.0, 16.1], [111.5, 16.0], [112.3, 15.8]];
const TRUONG_SA = [[111.9, 10.4], [112.9, 10.1], [113.9, 10.0], [114.4, 9.7], [114.9, 10.3], [115.8, 9.9], [114.0, 8.9], [112.6, 9.2], [113.5, 8.7], [114.7, 8.7], [113.2, 11.1], [114.2, 11.4]];

const LNG0 = 101.6, LAT1 = 23.7, K = 6.2; // 6.2 đơn vị cho mỗi độ
const px = (lng, lat) => [(lng - LNG0) * K * 0.966, (LAT1 - lat) * K];
const f = (n) => n.toFixed(1);

// opts: { labels: hiện tên hai quần đảo, fill/island/stroke: màu }. Bản nhỏ chỉ vẽ nét và chấm đảo.
export function vnMapSvg({ labels = false, label = 'Bản đồ Việt Nam với quần đảo Hoàng Sa và Trường Sa', fill = 'currentColor', island = '#F59E0B' } = {}) {
  const W = labels ? 126 : 98, H = 106;
  const d = 'M' + MAINLAND.map(([a, b]) => px(a, b).map(f).join(' ')).join('L') + 'Z';
  const dots = (arr, r) => arr.map(([a, b]) => { const [x, y] = px(a, b); return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}"/>`; }).join('');
  const [hx, hy] = px(113.3, 16.25), [tx, ty] = px(115.0, 12.3);
  return `<svg class="vnmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" focusable="false">` +
    `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<g fill="${island}" stroke="#fff" stroke-width=".5">${dots(HOANG_SA, 1.8)}${dots(TRUONG_SA, 1.8)}</g>` +
    (labels ? `<g font-size="5.6" font-weight="700" fill="currentColor" font-family="inherit"><text x="${f(hx)}" y="${f(hy)}" text-anchor="start">Hoàng Sa</text><text x="${f(tx)}" y="${f(ty)}" text-anchor="start">Trường Sa</text></g>` : '') +
    `</svg>`;
}
