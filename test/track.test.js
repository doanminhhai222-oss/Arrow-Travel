import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { straightKm, fmtDist, reachedStop, catalogNearby, overpassQuery, normalizeOverpass, fetchOverpass, mapsSearchUrl, mapsDirectionsUrl, NEARBY_CATS } from '../src/nearby.js';
import { trackMapSvg } from '../src/trackmap.js';

const data = JSON.parse(readFileSync(new URL('../data/da-nang.json', import.meta.url)));
const P = (id) => data.places.find((p) => p.id === id);
const mykhe = P('my-khe'), rong = P('cau-rong');

test('khoảng cách đường chim bay: 1 độ vĩ ≈ 111 km; định dạng m và km', () => {
  assert.ok(Math.abs(straightKm({ lat: 16, lng: 108 }, { lat: 17, lng: 108 }) - 111.2) < 0.5);
  assert.equal(straightKm(mykhe, mykhe), 0);
  assert.equal(fmtDist(0.347), '350 m'); assert.equal(fmtDist(2.46), '2.5 km');
});

test('nhận biết đã đến nơi: trong 150 m, hoặc trong độ sai số GPS nếu GPS kém', () => {
  const at = (dLat) => ({ lat: mykhe.lat + dLat, lng: mykhe.lng });
  assert.equal(reachedStop(at(0.0005), mykhe), true);   // ~55 m
  assert.equal(reachedStop(at(0.0030), mykhe), false);  // ~330 m
  assert.equal(reachedStop({ ...at(0.0030), acc: 400 }, mykhe), true); // GPS sai số 400 m
});

test('gợi ý từ danh mục: đúng loại, trong bán kính, gần xếp trước, loại điểm đã đi', () => {
  const here = { lat: rong.lat, lng: rong.lng };
  const food = catalogNearby('food', here, data.places, { radiusKm: 8 });
  assert.ok(food.length > 0 && food.every((x) => x.cat === 'food' && x.source === 'catalog' && x.km <= 8));
  assert.ok(food.every((x, i) => i === 0 || food[i - 1].km <= x.km));
  const chk = catalogNearby('checkin', here, data.places, { exclude: ['cau-rong'] });
  assert.ok(!chk.some((x) => x.id === 'cau-rong'));
  assert.ok(!chk.some((x) => x.id === 'cho-con-cu')); // quán đã đóng cửa
  assert.deepEqual(catalogNearby('fuel', here, data.places), []); // danh mục không có cây xăng, dùng dữ liệu mở
});

test('truy vấn Overpass đúng cú pháp, theo loại', () => {
  const q = overpassQuery('fuel', 16.05, 108.22, 1500);
  assert.match(q, /^\[out:json\]/); assert.match(q, /node\["amenity"="fuel"\]\(around:1500,16.05,108.22\)/); assert.match(q, /way\["amenity"="fuel"\]/); assert.match(q, /out center/);
  assert.match(overpassQuery('checkin', 16, 108), /tourism"="viewpoint/);
});

const OSM = { elements: [
  { type: 'node', id: 1, lat: 16.0620, lon: 108.2220, tags: { amenity: 'fuel', name: 'Cây xăng số 5', brand: 'Petrolimex', opening_hours: '24/7' } },
  { type: 'way', id: 2, center: { lat: 16.0700, lon: 108.2300 }, tags: { amenity: 'fuel' } },
  { type: 'node', id: 3, lat: 16.0605, lon: 108.2215, tags: { amenity: 'fuel', 'name:vi': 'Trạm xăng gần nhất' } },
  { type: 'relation', id: 4, tags: { amenity: 'fuel', name: 'Không có toạ độ' } },
] };
test('chuẩn hoá Overpass: bỏ mục thiếu toạ độ, dùng toạ độ tâm của way, tên dự phòng, gần xếp trước', () => {
  const r = normalizeOverpass(OSM, { lat: 16.06, lng: 108.22 }, 'fuel');
  assert.equal(r.length, 3);
  assert.equal(r[0].name, 'Trạm xăng gần nhất');
  assert.equal(r[1].name, 'Cây xăng số 5'); assert.equal(r[1].note, 'Petrolimex'); assert.equal(r[1].open, '24/7');
  assert.equal(r[2].name, 'Cây xăng (chưa có tên)'); assert.ok(Math.abs(r[2].lat - 16.07) < 1e-9);
  assert.ok(r.every((x, i) => i === 0 || r[i - 1].km <= x.km) && r.every((x) => x.source === 'osm'));
});
test('gọi Overpass: gửi POST đúng, lỗi thì ném ngoại lệ', async () => {
  let call;
  const ok = async (url, init) => { call = { url, init }; return { ok: true, status: 200, json: async () => OSM }; };
  const r = await fetchOverpass({ cat: 'fuel', lat: 16.06, lng: 108.22, fetchFn: ok });
  assert.equal(r.length, 3); assert.equal(call.url, 'https://overpass-api.de/api/interpreter'); assert.equal(call.init.method, 'POST'); assert.match(decodeURIComponent(call.init.body), /amenity"="fuel/);
  await assert.rejects(fetchOverpass({ cat: 'atm', lat: 0, lng: 0, fetchFn: async () => ({ ok: false, status: 429 }) }), /429/);
});
test('liên kết Google Maps: tìm gần đây và chỉ đường, đã mã hoá tiếng Việt', () => {
  assert.equal(mapsSearchUrl('fuel', 16.06, 108.22), 'https://www.google.com/maps/search/c%C3%A2y%20x%C4%83ng/@16.06,108.22,15z');
  assert.equal(mapsDirectionsUrl(16.06, 108.22), 'https://www.google.com/maps/dir/?api=1&destination=16.06,108.22&travelmode=driving');
  for (const c of Object.keys(NEARBY_CATS)) assert.ok(mapsSearchUrl(c, 1, 1).includes('/maps/search/'));
});

test('bản đồ theo dõi: không NaN, có đủ điểm, vị trí hiện tại và gợi ý; chạy được khi 1 điểm hoặc không có vị trí', () => {
  const stops = ['my-khe', 'linh-ung', 'cho-han'].map((id, i) => ({ place: P(id), visited: i === 0, next: i === 1 }));
  const svg = trackMapSvg({ stops, current: { lat: 16.07, lng: 108.25, acc: 40 }, pois: [{ lat: 16.06, lng: 108.23, cat: 'fuel' }, { lat: 16.05, lng: 108.22, cat: 'atm' }] });
  assert.ok(!svg.includes('NaN') && !svg.includes('undefined'));
  assert.equal((svg.match(/<title>/g) || []).length, 3); assert.ok(svg.includes('✓') && svg.includes('#2563eb'));
  assert.ok(!trackMapSvg({ stops: [{ place: mykhe, visited: false, next: true }], current: null }).includes('NaN'));
  assert.equal(trackMapSvg({ stops: [], current: null }), '');
});
