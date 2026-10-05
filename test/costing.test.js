import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary } from '../src/scheduler.js';
import { estimateCost, hotelsFor, defaultHotel, defaultFlight } from '../src/costing.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const data = read('../data/da-nang.json'), rules = read('../data/rules.json'), opts = read('../data/travel-options.json');
const trip = { destination: 'Đà Nẵng', startDate: '2026-09-03', endDate: '2026-09-05', people: 4, budget: 'vua_phai', audience: 'gia_dinh', hasKids: true, styles: [] };

test('tổng = cộng các dòng, 2 đêm cho chuyến 3 ngày, số phòng theo sức chứa', () => {
  const plan = buildItinerary(trip, data, rules);
  const hotel = opts.hotels.find((h) => h.id === '3sao-bien'); // 2 người/phòng → 2 phòng
  const flight = opts.origins[0].flights[0];
  const c = estimateCost({ trip, plan, flight, hotel });
  assert.equal(c.total, c.lines.reduce((s, l) => s + l.amount, 0));
  assert.equal(c.nights, 2);
  assert.equal(c.lines.find((l) => l.key === 'hotel').amount, 750000 * 2 * 2);
  assert.equal(c.lines.find((l) => l.key === 'flight').amount, 1600000 * 4);
  assert.equal(c.perPerson, Math.round(c.total / 4));
});

test('tự túc: không có dòng vé máy bay', () => {
  const plan = buildItinerary(trip, data, rules);
  const c = estimateCost({ trip, plan, flight: null, hotel: opts.hotels[1] });
  assert.ok(!c.lines.some((l) => l.key === 'flight'));
});

test('người lớn tuổi: ẩn homestay không phù hợp; mặc định theo ngân sách', () => {
  const t = { ...trip, hasElderly: true };
  const list = hotelsFor(opts.hotels, t);
  assert.ok(!list.some((h) => h.id === 'homestay'));
  assert.equal(defaultHotel(list, t).tier, 'vua_phai');
  assert.equal(defaultFlight(opts.origins[0].flights, { budget: 'tiet_kiem' }).id, 'hcm-lcc');
  assert.equal(defaultFlight(opts.origins[0].flights, { budget: 'thoai_mai' }).id, 'hcm-fsc');
});
