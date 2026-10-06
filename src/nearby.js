// Gợi ý địa điểm gần vị trí hiện tại: điểm check-in, quán ăn, cây xăng, ATM, nhà thuốc.
// Check-in và quán ăn lấy từ danh mục của app. Cây xăng, ATM, nhà thuốc (và thêm quán ăn, điểm check-in) lấy từ dữ liệu mở
// OpenStreetMap qua Overpass API: miễn phí, không cần khoá, chỉ gọi được khi chạy ngoài artifact. Dữ liệu © OpenStreetMap contributors.

export const NEARBY_CATS = {
  checkin: { label: 'Check-in', color: '#7c3aed', letter: 'C', osm: [['tourism', 'attraction'], ['tourism', 'viewpoint'], ['tourism', 'artwork']], types: ['checkin', 'show', 'beach', 'park', 'culture'] },
  food: { label: 'Quán ăn', color: '#d9480f', letter: 'A', osm: [['amenity', 'restaurant'], ['amenity', 'cafe']], types: ['food', 'cafe'] },
  fuel: { label: 'Cây xăng', color: '#b45309', letter: 'X', osm: [['amenity', 'fuel']], types: [] },
  atm: { label: 'ATM', color: '#0369a1', letter: 'T', osm: [['amenity', 'atm']], types: [] },
  pharmacy: { label: 'Nhà thuốc', color: '#15803d', letter: 'N', osm: [['amenity', 'pharmacy']], types: [] },
};
export const MAPS_QUERY = { checkin: 'điểm check-in', food: 'quán ăn ngon', fuel: 'cây xăng', atm: 'ATM', pharmacy: 'nhà thuốc' };

// Khoảng cách đường chim bay (km), dùng để nhận biết đã đến nơi hay chưa
export function straightKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtDist = (km) => (km < 1 ? Math.round(km * 1000 / 10) * 10 + ' m' : km.toFixed(1) + ' km');

// Đã đến nơi khi cách điểm đến không quá 150 m, hoặc không quá độ chính xác của GPS nếu GPS kém hơn
export function reachedStop(pos, place, radiusM = 150) {
  const d = straightKm(pos, place) * 1000;
  return d <= Math.max(radiusM, pos.acc || 0);
}

// Gợi ý từ danh mục của app (luôn dùng được, kể cả khi không có mạng)
export function catalogNearby(cat, center, places, { radiusKm = 6, limit = 8, exclude = [] } = {}) {
  const c = NEARBY_CATS[cat];
  if (!c || !c.types.length) return [];
  return places
    .filter((p) => p.status !== 'closed' && c.types.includes(p.type) && !exclude.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, km: straightKm(center, p), cat, source: 'catalog', note: p.culture || '', open: p.open + ' – ' + p.close }))
    .filter((x) => x.km <= radiusKm)
    .sort((a, b) => a.km - b.km).slice(0, limit);
}

export function overpassQuery(cat, lat, lng, radiusM = 2000) {
  const c = NEARBY_CATS[cat];
  const parts = c.osm.flatMap(([k, v]) => ['node', 'way'].map((t) => `${t}["${k}"="${v}"](around:${radiusM},${lat},${lng});`));
  return `[out:json][timeout:15];(${parts.join('')});out center 40;`;
}

// Chuẩn hoá phản hồi Overpass: bỏ mục không có toạ độ, đặt tên dự phòng, sắp theo khoảng cách
export function normalizeOverpass(json, center, cat, limit = 12) {
  const fallback = NEARBY_CATS[cat].label + ' (chưa có tên)';
  return (json.elements || []).map((e) => {
    const lat = e.lat ?? (e.center && e.center.lat), lng = e.lon ?? (e.center && e.center.lon);
    if (lat == null || lng == null) return null;
    const t = e.tags || {};
    return { id: 'osm-' + e.type + '-' + e.id, name: t['name:vi'] || t.name || t.brand || t.operator || fallback, lat, lng, km: straightKm(center, { lat, lng }), cat, source: 'osm', note: t.brand && t.name && t.brand !== t.name ? t.brand : '', open: t.opening_hours || '' };
  }).filter(Boolean).sort((a, b) => a.km - b.km).slice(0, limit);
}

export async function fetchOverpass({ cat, lat, lng, radiusM = 2000, fetchFn = fetch }) {
  const res = await fetchFn('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(overpassQuery(cat, lat, lng, radiusM)) });
  if (!res.ok) throw new Error('Dịch vụ bản đồ mở trả lỗi ' + res.status);
  return normalizeOverpass(await res.json(), { lat, lng }, cat);
}

export const mapsSearchUrl = (cat, lat, lng) => `https://www.google.com/maps/search/${encodeURIComponent(MAPS_QUERY[cat])}/@${lat},${lng},15z`;
export const mapsDirectionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
export const mapsPlaceUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
