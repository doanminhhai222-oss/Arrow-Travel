import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchFlights, sortFlights, cheapestFlight, searchHotels, sortHotels } from '../src/search.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const fl = read('../data/flights.json'), opts = read('../data/travel-options.json');
const TODAY = '2026-10-06';
const q = { data: fl, originId: 'ho-chi-minh', date: '2026-10-20', direction: 'out', people: 2, today: TODAY };

test('tìm chuyến bay trả đủ mọi hãng của tuyến, giờ và giá hợp lệ', () => {
  const r = searchFlights(q);
  assert.deepEqual([...new Set(r.map((f) => f.carrierId))].sort(), ['qh', 'vj', 'vn', 'vu']);
  assert.equal(r.length, 5 + 6 + 3 + 3);
  for (const f of r) {
    assert.match(f.depart, /^\d\d:\d\d$/); assert.match(f.arrive, /^\d\d:\d\d$/);
    assert.ok(f.priceOne >= 300000 && f.priceOne % 1000 === 0, `${f.id} ${f.priceOne}`);
    assert.equal(f.from, 'SGN'); assert.equal(f.to, 'DAD');
  }
});

test('tuyến ít hãng chỉ có hãng đang khai thác; chiều về đảo sân bay', () => {
  const hp = searchFlights({ ...q, originId: 'hai-phong', direction: 'back' });
  assert.deepEqual([...new Set(hp.map((f) => f.carrierId))].sort(), ['vj', 'vn']);
  assert.ok(hp.every((f) => f.from === 'DAD' && f.to === 'HPH'));
});

test('kết quả ổn định cùng một đầu vào; đặt gần ngày bay đắt hơn đặt xa', () => {
  assert.deepEqual(searchFlights(q), searchFlights(q));
  const near = cheapestFlight(searchFlights({ ...q, date: '2026-10-08' })).priceOne;
  const far = cheapestFlight(searchFlights({ ...q, date: '2026-12-08' })).priceOne;
  assert.ok(near > far, `${near} > ${far}`);
});

test('sắp xếp theo giá hoặc giờ; chuyến hết chỗ cho nhóm luôn xuống cuối', () => {
  const r = searchFlights({ ...q, people: 9 });
  const byPrice = sortFlights(r, 'price');
  const firstSold = byPrice.findIndex((f) => f.soldOut);
  if (firstSold >= 0) assert.ok(byPrice.slice(firstSold).every((f) => f.soldOut));
  const byTime = sortFlights(searchFlights(q), 'time');
  const avail = byTime.filter((f) => !f.soldOut);
  assert.ok(avail.every((f, i) => i === 0 || avail[i - 1].depart <= f.depart));
});

test('khách sạn theo ngày: số đêm, giá từng đêm, phòng trống', () => {
  const r = searchHotels({ hotels: opts.hotels, checkIn: '2026-10-09', checkOut: '2026-10-11', people: 4 });
  assert.equal(r.length, opts.hotels.length);
  for (const h of r) {
    assert.equal(h.nights, 2); assert.equal(h.nightly.length, 2); assert.equal(h.rooms, Math.ceil(4 / h.capacity));
    assert.equal(h.total, h.nightly.reduce((s, n) => s + n.price, 0) * h.rooms);
    assert.equal(h.available, h.nightly.every((n) => n.left >= h.rooms));
    if (!h.available) assert.match(h.reason, /phòng ngày \d\d\/\d\d/);
  }
  // 09/10/2026 là thứ Sáu: đêm cuối tuần đắt hơn giá gốc
  assert.ok(r[0].nightly[0].price > r[0].pricePerRoom);
});

test('sắp xếp khách sạn: còn phòng lên trước, rồi theo giá hoặc đánh giá', () => {
  const r = searchHotels({ hotels: opts.hotels, checkIn: '2026-10-12', checkOut: '2026-10-15', people: 2 });
  const s = sortHotels(r, 'price'), firstNo = s.findIndex((h) => !h.available);
  if (firstNo >= 0) assert.ok(s.slice(firstNo).every((h) => !h.available));
  const ok = s.filter((h) => h.available);
  assert.ok(ok.every((h, i) => i === 0 || ok[i - 1].total <= h.total));
  const rt = sortHotels(r, 'rating').filter((h) => h.available);
  assert.ok(rt.every((h, i) => i === 0 || rt[i - 1].rating >= h.rating));
});

test('chuyến một đêm hoặc không đêm nào: không có phòng cần tìm', () => {
  const r = searchHotels({ hotels: opts.hotels, checkIn: '2026-10-09', checkOut: '2026-10-09', people: 2 });
  assert.ok(r.every((h) => h.nights === 0 && h.available));
});

test('không bao giờ ra số chỗ, số phòng âm; số hiệu chuyến bay đúng dạng (nhiều ngày, nhiều tuyến)', () => {
  for (const originId of Object.keys(fl.routes)) {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      for (const f of searchFlights({ data: fl, originId, date, direction: 'out', people: 2, today: TODAY })) {
        assert.ok(f.seatsLeft >= 1 && f.seatsLeft <= 9, `${f.id} seatsLeft=${f.seatsLeft}`);
        assert.match(f.flightNo, /^[A-Z]{2}\d{3}$/);
      }
    }
  }
  for (let d = 1; d <= 28; d++) {
    const checkIn = `2026-11-${String(d).padStart(2, '0')}`;
    for (const h of searchHotels({ hotels: opts.hotels, checkIn, checkOut: `2026-12-${String(d).padStart(2, '0')}`, people: 3 })) {
      assert.ok(h.nightly.every((n) => n.left >= 0 && n.left <= 6), `${h.id} ${checkIn}`);
      if (!h.available) assert.doesNotMatch(h.reason, /-\d/);
    }
  }
});
