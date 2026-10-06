import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchHotels } from '../src/search.js';
import { hotelDetailHtml } from '../src/hoteldetail.js';
import { normalizePlace, fetchPlaceReviews } from '../src/google.js';

const opts = JSON.parse(readFileSync(new URL('../data/travel-options.json', import.meta.url)));
const q = { hotels: opts.hotels, checkIn: '2026-10-20', checkOut: '2026-10-22', people: 4 };
const byId = (list, id) => list.find((h) => h.id === id);

test('mọi khách sạn có loại phòng, mô tả, ảnh, đánh giá mẫu có nhãn nguồn', () => {
  for (const h of opts.hotels) {
    assert.ok(h.roomTypes.length >= 2, h.id);
    assert.ok(h.roomTypes.every((r) => r.sleeps > 0 && r.factor >= 1 && r.sizeM2 > 0), h.id);
    assert.ok(h.description && h.photos.length >= 2 && h.reviews.length === 3, h.id);
    assert.equal(h.reviewSource, 'sample');
  }
});

test('đổi loại phòng thì đổi giá và số phòng cần', () => {
  const base = byId(searchHotels(q), '3sao-bien'); // Tiêu chuẩn: 2 người/phòng
  const fam = byId(searchHotels({ ...q, roomByHotel: { '3sao-bien': 'fam' } }), '3sao-bien'); // Gia đình: 4 người/phòng
  assert.equal(base.rooms, 2); assert.equal(fam.rooms, 1);
  assert.equal(fam.room.id, 'fam'); assert.equal(fam.capacity, 4);
  assert.equal(fam.total, fam.nightly.reduce((s, n) => s + n.price, 0) * 1);
  assert.notEqual(base.total, fam.total);
});

test('trang chi tiết khách sạn: loại phòng, ảnh, đánh giá mẫu, liên kết Google Maps', () => {
  const h = byId(searchHotels(q), '4sao-bien');
  const html = hotelDetailHtml(h, { nights: h.nights });
  for (const t of ['Loại phòng', 'Phòng Superior', 'Đánh giá mẫu, chưa lấy từ Google Maps', 'Khách mẫu A', 'Ảnh minh hoạ', 'google.com/maps/search', 'Chọn khách sạn này']) assert.ok(html.includes(t), t);
  assert.equal((html.match(/data-room=/g) || []).length, h.roomTypes.length);
  assert.ok(html.includes('data-hotelpick="4sao-bien"'));
});

test('hết phòng thì nút chọn bị khoá và nêu lý do; tên được escape', () => {
  const h = { ...byId(searchHotels(q), 'resort'), available: false, reason: 'Hết phòng ngày 21/10', name: '<img onerror=x>' };
  const html = hotelDetailHtml(h, { nights: 2 });
  assert.ok(html.includes('disabled') && html.includes('Hết phòng ngày 21/10'));
  assert.ok(!html.includes('<img onerror'));
});

// Mẫu phản hồi theo định dạng Places API (New)
const PLACE = { rating: 4.6, userRatingCount: 1283, googleMapsUri: 'https://maps.google.com/?cid=1',
  reviews: [{ rating: 5, relativePublishTimeDescription: '2 tuần trước', text: { text: 'Phòng đẹp, view biển.', languageCode: 'vi' }, authorAttribution: { displayName: 'An', uri: 'https://maps.google.com/u/1' } },
            { rating: 4, relativePublishTimeDescription: 'tháng trước', originalText: { text: 'Good value.' }, authorAttribution: { displayName: 'Bo' } },
            { rating: 3, text: { text: '' } }] };

test('chuẩn hoá phản hồi Google Places: bỏ đánh giá rỗng, giữ nguồn và liên kết', () => {
  const n = normalizePlace(PLACE);
  assert.equal(n.source, 'google'); assert.equal(n.rating, 4.6); assert.equal(n.reviewCount, 1283);
  assert.equal(n.reviews.length, 2); assert.equal(n.reviews[0].author, 'An'); assert.equal(n.reviews[1].text, 'Good value.');
  assert.equal(n.mapsUrl, 'https://maps.google.com/?cid=1');
});

test('đánh giá từ Google hiện nhãn nguồn Google Maps, không còn nhãn mẫu', () => {
  const h = byId(searchHotels(q), 'resort');
  const html = hotelDetailHtml(h, { nights: 2, google: normalizePlace(PLACE) });
  assert.ok(html.includes('Nguồn: Google Maps') && html.includes('Phòng đẹp, view biển.') && html.includes('4.6'));
  assert.ok(!html.includes('Đánh giá mẫu, chưa lấy'));
});

test('gọi Places API: 2 yêu cầu, khoá và field mask đúng, lỗi thì ném ngoại lệ', async () => {
  const calls = [];
  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  const fetchFn = async (url, init) => { calls.push({ url, init }); return calls.length === 1 ? ok({ places: [{ id: 'abc' }] }) : ok(PLACE); };
  const r = await fetchPlaceReviews({ apiKey: 'K', query: 'X Đà Nẵng', lat: 16.1, lng: 108.3, fetchFn });
  assert.equal(r.reviews.length, 2);
  assert.ok(calls[0].url.endsWith('/places:searchText') && calls[0].init.headers['X-Goog-Api-Key'] === 'K');
  assert.ok(calls[1].url.includes('/places/abc') && calls[1].init.headers['X-Goog-FieldMask'].includes('reviews'));
  await assert.rejects(fetchPlaceReviews({ apiKey: 'K', query: 'X', lat: 0, lng: 0, fetchFn: async () => ({ ok: false, status: 403 }) }), /403/);
  await assert.rejects(fetchPlaceReviews({ apiKey: 'K', query: 'X', lat: 0, lng: 0, fetchFn: async () => ok({ places: [] }) }), /Không tìm thấy/);
});
