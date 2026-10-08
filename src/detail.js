import { vnd } from './format.js';
// Trang chi tiết địa điểm: ảnh minh hoạ, chú ý nổi bật, nét văn hoá / quán ăn, bản đồ mini.
// Không phụ thuộc DOM, trả về chuỗi HTML. Ảnh thật: điền `image` (URL) vào dữ liệu địa điểm, nếu không có sẽ vẽ ảnh minh hoạ.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const TYPE_LABEL = { beach: 'Bãi biển', park: 'Công viên, khu vui chơi', culture: 'Văn hoá, tâm linh', checkin: 'Check-in', show: 'Cảnh đẹp ban đêm', cafe: 'Cà phê', food: 'Quán ăn' };

const SCENES = {
  beach: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a0"/><stop offset="1" stop-color="#8fd3e3"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><circle cx="240" cy="62" r="24" fill="#ffb347"/>
    <rect y="84" width="320" height="42" fill="#2a9bb8"/><path d="M0 98q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#bfeaf2" stroke-width="3"/>
    <path d="M0 112q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#7fcfe0" stroke-width="3"/>
    <rect y="126" width="320" height="34" fill="#f1dcaa"/><path d="M70 138a22 9 0 0 0 44 0z" fill="#7a4a2b"/><path d="M200 144a18 7 0 0 0 36 0z" fill="#a8603a"/>`,
  mountain: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f5"/><stop offset="1" stop-color="#eaf6ee"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><polygon points="0,130 70,60 120,110 180,40 250,115 290,80 320,120 320,160 0,160" fill="#5f8f77"/>
    <polygon points="0,150 90,95 150,140 220,90 320,145 320,160 0,160" fill="#3f6b57"/>
    <path d="M110 128q50-40 100 0" fill="none" stroke="#e4b83a" stroke-width="5"/><path d="M110 128v14M210 128v14M160 108v34" stroke="#e4b83a" stroke-width="3"/>`,
  temple: `<rect width="320" height="160" fill="#dcecf5"/><rect y="132" width="320" height="28" fill="#6f9a7e"/>
    <ellipse cx="160" cy="132" rx="46" ry="9" fill="#f6c8d0"/><path d="M142 132l8-38q10-14 20 0l8 38z" fill="#fafafa"/><circle cx="160" cy="62" r="11" fill="#fafafa"/><path d="M160 20v18M148 42l12-16 12 16" stroke="#e4b83a" stroke-width="3" fill="none"/>
    <path d="M160 70q-22 8-24 40M160 70q22 8 24 40" stroke="#fafafa" stroke-width="6" fill="none"/>
    <path d="M20 120h60l-8-18H28zM240 120h60l-8-18h-44z" fill="#b5532f"/><rect x="30" y="120" width="40" height="12" fill="#e9d8b6"/><rect x="250" y="120" width="40" height="12" fill="#e9d8b6"/>`,
  bridge: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a55"/><stop offset="1" stop-color="#4a3f7a"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><circle cx="270" cy="30" r="12" fill="#f5ecc0"/>
    <path d="M10 96q40-70 80-10t70-10 70 10 80-10" fill="none" stroke="#ffcf5a" stroke-width="5"/><path d="M0 100h320" stroke="#e0d6ff" stroke-width="4"/>
    <g fill="#ffe08a"><circle cx="50" cy="94" r="2.5"/><circle cx="110" cy="92" r="2.5"/><circle cx="170" cy="90" r="2.5"/><circle cx="230" cy="92" r="2.5"/><circle cx="290" cy="94" r="2.5"/></g>
    <rect y="108" width="320" height="52" fill="#16204a"/><path d="M0 120h320M0 136h320" stroke="#ffcf5a" stroke-opacity=".35" stroke-width="2"/>`,
  museum: `<rect width="320" height="160" fill="#efe6d3"/><polygon points="60,52 160,18 260,52" fill="#c9b690"/><rect x="60" y="52" width="200" height="8" fill="#b9a47b"/>
    <g fill="#d8c8a2"><rect x="76" y="62" width="16" height="72"/><rect x="118" y="62" width="16" height="72"/><rect x="186" y="62" width="16" height="72"/><rect x="228" y="62" width="16" height="72"/></g>
    <rect x="50" y="134" width="220" height="14" fill="#b9a47b"/><rect y="148" width="320" height="12" fill="#a69368"/>`,
  market: `<rect width="320" height="160" fill="#fff0d6"/><rect y="120" width="320" height="40" fill="#caa56f"/>
    <g><path d="M20 50h90l-8 28H28z" fill="#d9482f"/><path d="M130 50h90l-8 28h-74z" fill="#f2b33d"/><path d="M240 50h70l-8 28h-54z" fill="#2f8f6f"/></g>
    <g fill="#8a5a2b"><rect x="28" y="100" width="76" height="20"/><rect x="138" y="100" width="76" height="20"/><rect x="246" y="100" width="56" height="20"/></g>
    <g fill="#e4572e"><circle cx="46" cy="96" r="7"/><circle cx="64" cy="96" r="7"/></g><g fill="#78b43c"><circle cx="156" cy="96" r="7"/><circle cx="174" cy="96" r="7"/></g>`,
  frame: `<rect width="320" height="160" fill="#2d2a4a"/><rect x="60" y="14" width="200" height="132" fill="#e0b84a"/><rect x="70" y="24" width="180" height="112" fill="#6fa8dc"/>
    <polygon points="70,136 140,70 190,110 250,60 250,136" fill="#3d6f4f"/><circle cx="110" cy="52" r="12" fill="#fff4c2"/><path d="M200 100l10-24 10 24z" fill="#d9482f"/><circle cx="210" cy="70" r="6" fill="#f2c7a0"/>`,
  wheel: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3a7a"/><stop offset="1" stop-color="#f09a6a"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><circle cx="160" cy="72" r="54" fill="none" stroke="#ffe9a8" stroke-width="4"/><circle cx="160" cy="72" r="6" fill="#ffe9a8"/>
    <g stroke="#ffe9a8" stroke-width="2"><path d="M160 18v108M106 72h108M122 34l76 76M198 34l-76 76"/></g><path d="M160 72l-34 88h68z" fill="none" stroke="#ffe9a8" stroke-width="3"/>
    <rect y="140" width="320" height="20" fill="#2a2850"/>`,
  cafe: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><circle cx="220" cy="92" r="30" fill="#ffe3a0"/><rect y="104" width="320" height="56" fill="#2f6f8f"/>
    <path d="M90 82h56l-6 34q-22 10-44 0z" fill="#5a3a2a"/><path d="M146 88q16 2 10 14-4 8-12 8" fill="none" stroke="#5a3a2a" stroke-width="5"/><path d="M104 74q-6-10 0-18M122 74q-6-10 0-18" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none"/>`,
  room: `<rect width="320" height="160" fill="#efe9df"/><rect x="200" y="22" width="86" height="70" fill="#bfe3f5" stroke="#8a7a62" stroke-width="5"/><path d="M243 22v70M200 57h86" stroke="#8a7a62" stroke-width="3"/>
    <rect x="34" y="84" width="170" height="44" rx="6" fill="#fafafa" stroke="#cfc6b4" stroke-width="3"/><rect x="34" y="70" width="40" height="30" rx="6" fill="#c9b690"/><rect x="82" y="92" width="52" height="16" rx="5" fill="#9ec9c4"/><rect y="132" width="320" height="28" fill="#b9a47b"/>`,
  pool: `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3f5"/><stop offset="1" stop-color="#eaf6ee"/></linearGradient></defs>
    <rect width="320" height="160" fill="url(#g)"/><rect y="104" width="320" height="56" fill="#e8dcc0"/><rect x="30" y="86" width="260" height="56" rx="12" fill="#2aa7c9"/><path d="M44 104q20-8 40 0t40 0 40 0 40 0 40 0 40 0" fill="none" stroke="#bfeaf2" stroke-width="3"/>
    <rect x="236" y="70" width="46" height="8" rx="4" fill="#d9482f"/><rect x="40" y="70" width="46" height="8" rx="4" fill="#f2b33d"/><circle cx="270" cy="34" r="16" fill="#ffd36a"/>`,
  lobby: `<rect width="320" height="160" fill="#f1e8d6"/><rect y="122" width="320" height="38" fill="#c9b690"/><rect x="90" y="84" width="140" height="38" rx="4" fill="#8a5a2b"/><rect x="82" y="78" width="156" height="10" rx="3" fill="#b07a3e"/>
    <rect x="30" y="40" width="10" height="82" fill="#8a7a62"/><path d="M20 40h30l-6 -18h-18z" fill="#f2b33d"/><rect x="270" y="40" width="10" height="82" fill="#8a7a62"/><path d="M260 40h30l-6 -18h-18z" fill="#f2b33d"/>
    <circle cx="160" cy="46" r="14" fill="#fafafa" stroke="#8a7a62" stroke-width="3"/><path d="M160 46v-8M160 46l6 3" stroke="#8a7a62" stroke-width="2"/>`,
  food: `<rect width="320" height="160" fill="#fbe9cf"/><ellipse cx="160" cy="116" rx="86" ry="14" fill="#d8b98c"/>
    <path d="M78 84h164q-4 38-82 40-78-2-82-40z" fill="#fafafa" stroke="#d6d0c4" stroke-width="3"/><path d="M92 84q68-22 136 0" fill="#e8a23c"/>
    <g fill="#d9482f"><circle cx="130" cy="76" r="6"/><circle cx="176" cy="72" r="6"/></g><g fill="#6fae3e"><circle cx="152" cy="68" r="5"/><circle cx="200" cy="78" r="5"/></g>
    <path d="M130 56q-6-10 0-18M160 52q-6-10 0-18M190 56q-6-10 0-18" stroke="#b0a090" stroke-width="3" fill="none"/>`,
};

let sceneN = 0; // mỗi ảnh một id gradient riêng, tránh trùng khi nhiều ảnh nằm cùng trang
export function sceneSvg(place) {
  if (place.image) return `<img class="pd-img pd-photo" src="${esc(place.image)}" alt="${esc(place.imageAlt || place.name)}" loading="lazy">`;
  const gid = 'sg' + ++sceneN;
  const body = (SCENES[place.scene] || SCENES.mountain).replaceAll('id="g"', `id="${gid}"`).replaceAll('url(#g)', `url(#${gid})`);
  return `<svg class="pd-img" viewBox="0 0 320 160" role="img" aria-label="Ảnh minh hoạ ${esc(place.name)}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

// Bản đồ mini: vẽ các điểm trong ngày theo toạ độ, nối theo thứ tự đi, tô nổi điểm đang xem
export function miniMapSvg(place, dayPlaces) {
  const pts = dayPlaces.some((p) => p.id === place.id) ? dayPlaces : [...dayPlaces, place];
  const W = 320, H = 200, pad = 28;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const kx = 111 * Math.cos((lat0 * Math.PI) / 180), ky = 111;
  const xs = pts.map((p) => p.lng * kx), ys = pts.map((p) => -p.lat * ky);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const sc = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const ox = (W - spanX * sc) / 2 - minX * sc, oy = (H - spanY * sc) / 2 - minY * sc;
  const P = pts.map((p, i) => ({ p, x: xs[i] * sc + ox, y: ys[i] * sc + oy }));
  const kmPerPx = 1 / sc;
  const bar = [10, 5, 2, 1, 0.5].find((k) => k / kmPerPx <= 90) || 0.5;
  const cur = P.find((q) => q.p.id === place.id);
  let s = `<svg class="pd-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bản đồ vị trí ${esc(place.name)}"><rect width="${W}" height="${H}" fill="#e6f1ec"/>`;
  for (let i = 1; i < 8; i++) s += `<path d="M${(W / 8) * i} 0V${H}" stroke="#d3e4dc" stroke-width="1"/>`;
  for (let i = 1; i < 5; i++) s += `<path d="M0 ${(H / 5) * i}H${W}" stroke="#d3e4dc" stroke-width="1"/>`;
  if (P.length > 1) s += `<polyline points="${P.map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ')}" fill="none" stroke="#0F766E" stroke-width="2" stroke-dasharray="5 4"/>`;
  P.forEach((q, i) => {
    if (q === cur) return;
    s += `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="9" fill="#0F766E"/><text x="${q.x.toFixed(1)}" y="${(q.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${i + 1}</text>`;
  });
  s += `<circle cx="${cur.x.toFixed(1)}" cy="${cur.y.toFixed(1)}" r="13" fill="#D9480F" stroke="#fff" stroke-width="3"/><text x="${cur.x.toFixed(1)}" y="${(cur.y + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${P.indexOf(cur) + 1}</text>`;
  const bw = bar / kmPerPx;
  s += `<path d="M12 ${H - 14}h${bw.toFixed(1)}" stroke="#17302d" stroke-width="3"/><text x="12" y="${H - 20}" font-size="10" fill="#17302d">${bar} km</text></svg>`;
  return s;
}

const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

function legendHtml(place, dayPlaces) {
  const pts = dayPlaces.some((p) => p.id === place.id) ? dayPlaces : [...dayPlaces, place];
  return `<ol class="pd-legend">${pts.map((p) => `<li${p.id === place.id ? ' class="cur"' : ''}>${esc(p.name)}${p.id === place.id ? ' (đang xem)' : ''}</li>`).join('')}</ol>`;
}

export function placeDetailHtml(place, dayPlaces = []) {
  const isFood = place.type === 'food';
  const tags = [TYPE_LABEL[place.type] || place.type];
  if (place.kids) tags.push('Hợp trẻ nhỏ');
  if (place.elderly) tags.push('Hợp người lớn tuổi');
  const list = (a) => (a && a.length ? `<ul class="pd-list">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  let h = `<div class="pd">${sceneSvg(place)}${place.imageCredit ? `<p class="pd-credit">${esc(place.imageCredit)}</p>` : ''}<h2>${esc(place.name)}</h2><div class="pd-tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
  h += `<dl class="pd-facts"><div><dt>Giờ mở cửa</dt><dd>${esc(place.open)} – ${esc(place.close)}</dd></div><div><dt>${isFood || place.type === 'cafe' ? 'Giá tham khảo' : 'Giá vé'}</dt><dd>${vnd(place.price)}</dd></div><div><dt>Thời gian</dt><dd>${place.duration >= 60 ? Math.floor(place.duration / 60) + 'h' + (place.duration % 60 ? String(place.duration % 60).padStart(2, '0') : '') : place.duration + 'p'}</dd></div></dl>`;
  if (place.highlights?.length) h += `<h3>Chú ý nổi bật</h3>${list(place.highlights)}`;
  if (isFood || place.rating || place.desc) {
    if (place.desc) h += `<h3>Mô tả</h3><p>${esc(place.desc)}</p>`;
    if (place.rating) h += `<h3>Đánh giá</h3><p class="pd-rate"><span class="pd-stars" aria-hidden="true">${stars(place.rating)}</span> <b>${place.rating.toFixed(1)}</b> · ${place.reviews} lượt${place.sample ? ' <em>(đánh giá mẫu)</em>' : ''}</p>${place.review ? `<blockquote>${esc(place.review)}</blockquote>` : ''}`;
    if (place.dishes?.length) h += `<h3>Món nên thử</h3><div class="pd-tags">${place.dishes.map((d) => `<span class="tag">${esc(d)}</span>`).join('')}</div>`;
    if (place.culture) h += `<h3>Nét ẩm thực địa phương</h3><p>${esc(place.culture)}</p>`;
  } else if (place.culture) {
    h += `<h3>Nét đặc trưng văn hoá</h3><p>${esc(place.culture)}</p>`;
  }
  h += `${place.address ? `<h3>Địa chỉ</h3><p>${esc(place.address)}</p>` : ''}<h3>Bản đồ</h3>${miniMapSvg(place, dayPlaces)}${legendHtml(place, dayPlaces)}<p class="hint">Số trên bản đồ là thứ tự đi trong ngày. ${place.approx ? 'Vị trí chỉ là ước lượng, xem lại trên Google Maps.' : 'Vị trí tính từ toạ độ mẫu.'}</p>`;
  h += `<a class="pd-link" href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}" target="_blank" rel="noopener">Mở trong Google Maps</a></div>`;
  return h;
}
