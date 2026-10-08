import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary, filterPlaces } from '../src/scheduler.js';
import { estimateCost, hotelsFor, TICKET_GROUPS } from '../src/costing.js';

const read = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url)));
const data = read('da-nang.json'), rules = read('rules.json'), opts = read('travel-options.json'), featured = read('featured.json');
const HA = data.places.filter((p) => p.city === 'Hội An'), DN = data.places.filter((p) => (p.city || 'Đà Nẵng') === 'Đà Nẵng');
const base = (o) => ({ destination: 'Hội An', startDate: '2026-10-13', endDate: '2026-10-15', people: 2, budget: 'thoai_mai', audience: 'cap_doi', styles: ['check_in'], ...o });

test('Hội An có nhiều địa điểm đủ loại, dữ liệu hợp lệ', () => {
  assert.ok(HA.length >= 35, 'nên có ít nhất 35 điểm, hiện ' + HA.length);
  const types = new Set(HA.map((p) => p.type));
  for (const t of ['culture', 'checkin', 'park', 'beach', 'show', 'food', 'cafe']) assert.ok(types.has(t), 'thiếu loại ' + t);
  assert.equal(new Set(data.places.map((p) => p.id)).size, data.places.length, 'trùng id');
  for (const p of HA) {
    assert.ok(p.lat > 15.7 && p.lat < 16.0 && p.lng > 108.1 && p.lng < 108.6, `${p.id} nằm ngoài vùng Hội An`);
    assert.ok(['morning', 'midday', 'afternoon', 'evening'].includes(p.slot), p.id);
    assert.ok(p.audiences.length && p.highlights.length && p.culture, p.id);
    assert.ok(p.approx, p.id + ' phải ghi là ước lượng');
    if (p.type === 'food') assert.ok(['lunch', 'dinner'].includes(p.meal), p.id + ' thiếu bữa');
    if (p.ticketGroup) { assert.equal(p.price, 0); assert.ok(TICKET_GROUPS[p.ticketGroup]); }
  }
});

test('lịch trình chỉ gồm địa điểm của đúng điểm đến, không lẫn Đà Nẵng và Hội An', () => {
  for (const audience of ['cap_doi', 'gia_dinh', 'nhom_ban', 'mot_minh']) {
    for (const [dest, city] of [['Hội An', 'Hội An'], ['Đà Nẵng', 'Đà Nẵng']]) {
      const p = buildItinerary(base({ audience, destination: dest, hasKids: audience === 'gia_dinh' }), data, rules);
      const used = p.days.flatMap((d) => d.items.filter((i) => i.place)).map((i) => i.place);
      assert.ok(used.length > 0);
      assert.ok(used.every((x) => (x.city || 'Đà Nẵng') === city), `${audience}/${dest} lẫn điểm khác thành phố`);
    }
  }
  assert.ok(filterPlaces(data.places, { destination: 'Hội An', audience: 'cap_doi' }).places.length >= 25);
  assert.equal(filterPlaces(data.places, { audience: 'cap_doi' }).places.every((p) => (p.city || 'Đà Nẵng') === 'Đà Nẵng'), true, 'không ghi điểm đến thì mặc định Đà Nẵng');
});

test('khách sạn lọc theo điểm đến, Hội An có đủ hạng', () => {
  const ha = hotelsFor(opts.hotels, { destination: 'Hội An' }), dn = hotelsFor(opts.hotels, { destination: 'Đà Nẵng' });
  assert.ok(ha.length >= 8 && dn.length >= 10);
  assert.ok(ha.every((h) => h.city === 'Hội An') && dn.every((h) => (h.city || 'Đà Nẵng') === 'Đà Nẵng'));
  for (const tier of ['tiet_kiem', 'vua_phai', 'thoai_mai']) assert.ok(ha.some((h) => h.tier === tier), 'thiếu hạng ' + tier);
  assert.ok(ha.every((h) => h.roomTypes.length && h.sample !== false));
  assert.equal(hotelsFor(opts.hotels, { destination: 'Hội An', hasElderly: true }).every((h) => h.elderly), true);
});

test('vé phố cổ tính một lần mỗi khách cho cả chuyến, không cộng lặp theo từng điểm', () => {
  const trip = base({ people: 3 });
  const pick = (ids) => ({ days: [{ items: ids.map((id) => ({ kind: 'visit', place: data.places.find((p) => p.id === id) })), totalKm: 0 }] });
  const one = estimateCost({ trip: { ...trip, endDate: '2026-10-13' }, plan: pick(['chua-cau']), flight: null, hotel: null });
  const many = estimateCost({ trip: { ...trip, endDate: '2026-10-13' }, plan: pick(['chua-cau', 'nha-co-tan-ky', 'hoi-quan-quang-dong', 'bao-tang-sa-huynh']), flight: null, hotel: null });
  const t = (c) => c.lines.find((l) => l.key === 'tickets').amount;
  assert.equal(t(one), 120000 * 3); assert.equal(t(many), 120000 * 3);
  const free = estimateCost({ trip: { ...trip, endDate: '2026-10-13' }, plan: pick(['cau-an-hoi', 'bien-an-bang']), flight: null, hotel: null });
  assert.equal(t(free), 0, 'điểm ngoài vé phố cổ không phải trả vé phố cổ');
});

test('lịch trình nổi bật của Hội An: địa điểm có thật, đúng thành phố, hợp đối tượng', () => {
  const list = featured.featured.filter((f) => f.destination === 'Hội An');
  assert.ok(list.length >= 3);
  for (const f of list) {
    for (const id of f.days.flat()) {
      const p = data.places.find((x) => x.id === id);
      assert.ok(p, f.id + ': không có ' + id); assert.equal(p.city, 'Hội An', id); assert.ok(p.audiences.includes(f.audience), `${f.id}: ${id} không dành cho ${f.audience}`);
      if (f.audience === 'gia_dinh') assert.ok(p.kids, `${f.id}: ${id} không hợp trẻ nhỏ`);
    }
    assert.ok(data.places.find((x) => x.id === f.cover), f.id + ' thiếu ảnh bìa');
  }
});
