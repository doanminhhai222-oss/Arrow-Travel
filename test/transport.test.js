import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary } from '../src/scheduler.js';
import { estimateCost } from '../src/costing.js';
import { priceMode, tripLegs, transportOptions } from '../src/transport.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const data = read('../data/da-nang.json'), rules = read('../data/rules.json'), opts = read('../data/travel-options.json'), tr = read('../data/transport.json');
const mode = (id) => tr.modes.find((m) => m.id === id);
const base = { destination: 'Đà Nẵng', startDate: '2026-09-03', endDate: '2026-09-05', people: 2, budget: 'vua_phai', audience: 'cap_doi', styles: [] };

test('giá taxi tính theo chặng: mở cửa + km vượt, mỗi xe 4 người', () => {
  const legs = [{ km: 5 }, { km: 1 }];
  // Grab Car: chặng 5km = 28000 + 3*11000 = 61000; chặng 1km = 28000 (trong 2km đầu)
  assert.equal(priceMode(mode('grab-car'), legs, { people: 4, nDays: 1 }).total, 89000);
  assert.equal(priceMode(mode('grab-car'), legs, { people: 5, nDays: 1 }).total, 178000); // 2 xe
});

test('thuê xe máy: tiền thuê theo ngày + xăng theo km, 2 người một xe', () => {
  const p = priceMode(mode('thue-xe-may'), [{ km: 10 }, { km: 10 }], { people: 3, nDays: 2 });
  assert.equal(p.vehicles, 2);
  assert.equal(p.total, (2 * 150000 + 20 * 700) * 2); // 628000
});

test('thuê xe tài xế: vượt 100km/ngày thì tính thêm', () => {
  const p = priceMode(mode('tai-xe-4'), [{ km: 250 }], { people: 4, nDays: 2 });
  assert.equal(p.total, 2 * 1100000 + 50 * 9000);
});

test('có trẻ nhỏ hoặc người lớn tuổi: xe máy bị loại, không được chọn mặc định', () => {
  const trip = { ...base, hasKids: true, audience: 'gia_dinh' };
  const plan = buildItinerary(trip, data, rules);
  const r = transportOptions({ trip, plan, hotel: opts.hotels[1], flight: null, modes: tr.modes, airport: tr.airport, nDays: 3 });
  for (const id of ['thue-xe-may', 'xe-om-cn']) assert.equal(r.options.find((o) => o.id === id).suitable, false);
  assert.ok(r.options.find((o) => o.id === r.defaultId).suitable);
  assert.ok(r.options.find((o) => o.id === r.defaultId).kidsOk);
});

test('chặng khách sạn và sân bay được tính khi có khách sạn và vé máy bay', () => {
  const plan = buildItinerary(base, data, rules);
  const plain = tripLegs(plan, {});
  const full = tripLegs(plan, { hotel: opts.hotels[1], flight: { id: 'x' }, airport: tr.airport });
  assert.equal(full.length, plain.length + 3 * 2 + 2); // 3 ngày × 2 chặng khách sạn + 2 chặng sân bay
  assert.ok(full.every((l) => l.km >= 0 && !Number.isNaN(l.km)));
});

test('tổng chi phí dùng giá phương tiện đã chọn', () => {
  const plan = buildItinerary(base, data, rules);
  const r = transportOptions({ trip: base, plan, hotel: opts.hotels[1], flight: null, modes: tr.modes, airport: tr.airport, nDays: 3 });
  const sel = r.options.find((o) => o.id === r.defaultId);
  const c = estimateCost({ trip: base, plan, flight: null, hotel: opts.hotels[1], transport: sel });
  assert.equal(c.lines.find((l) => l.key === 'local').amount, sel.total);
  assert.equal(c.total, c.lines.reduce((s, l) => s + l.amount, 0));
});

test('nhóm đông: không chọn mặc định phương án cần quá 3 xe nếu có lựa chọn khác', () => {
  const trip = { ...base, people: 9, audience: 'nhom_ban' };
  const plan = buildItinerary(trip, data, rules);
  const r = transportOptions({ trip, plan, hotel: null, flight: null, modes: tr.modes, airport: tr.airport, nDays: 3 });
  assert.ok(r.options.find((o) => o.id === r.defaultId).vehicles <= 3);
});

test('đã có phương tiện riêng: bỏ dòng di chuyển khỏi tổng chi phí', () => {
  const plan = buildItinerary(base, data, rules);
  const c = estimateCost({ trip: base, plan, flight: null, hotel: opts.hotels[1], transport: { skip: true } });
  assert.ok(!c.lines.some((l) => l.key === 'local'));
  assert.equal(c.total, c.lines.reduce((s, l) => s + l.amount, 0));
});
