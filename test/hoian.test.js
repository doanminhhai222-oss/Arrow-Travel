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

// ---- Phú Quốc: đảo có sân bay riêng
const PQ = data.places.filter((p) => p.city === 'Phú Quốc');
const flights = read('flights.json'), transport = read('transport.json');

test('Phú Quốc có đủ loại địa điểm, dữ liệu hợp lệ, nằm trên đảo', () => {
  assert.ok(PQ.length >= 25, 'hiện ' + PQ.length);
  const types = new Set(PQ.map((p) => p.type));
  for (const t of ['beach', 'park', 'culture', 'checkin', 'food', 'cafe']) assert.ok(types.has(t), 'thiếu loại ' + t);
  for (const p of PQ) {
    assert.ok(p.lat > 9.9 && p.lat < 10.5 && p.lng > 103.8 && p.lng < 104.1, `${p.id} nằm ngoài đảo Phú Quốc`);
    assert.ok(p.audiences.length && p.highlights.length && p.culture, p.id);
    if (p.type === 'food') assert.ok(['lunch', 'dinner'].includes(p.meal), p.id);
  }
});

test('Phú Quốc: lịch trình, khách sạn, sân bay và tuyến bay đúng điểm đến', async () => {
  const { flightDataFor, originsFor, searchFlights } = await import('../src/search.js');
  for (const audience of ['cap_doi', 'gia_dinh', 'nhom_ban', 'mot_minh']) {
    const p = buildItinerary(base({ destination: 'Phú Quốc', audience, hasKids: audience === 'gia_dinh' }), data, rules);
    const used = p.days.flatMap((d) => d.items.filter((i) => i.place));
    assert.ok(used.length > 0 && used.every((i) => i.place.city === 'Phú Quốc'), audience);
  }
  const pq = hotelsFor(opts.hotels, { destination: 'Phú Quốc' });
  assert.ok(pq.length >= 8 && pq.every((h) => h.city === 'Phú Quốc'));
  for (const tier of ['tiet_kiem', 'vua_phai', 'thoai_mai']) assert.ok(pq.some((h) => h.tier === tier));
  assert.equal(flightDataFor(flights, 'Phú Quốc').destination.airport, 'PQC');
  assert.equal(flightDataFor(flights, 'Hội An').destination.airport, 'DAD', 'Hội An bay tới Đà Nẵng');
  assert.equal(flightDataFor(flights, 'Đà Nẵng').destination.airport, 'DAD');
  const origins = originsFor(flights, opts.origins, 'Phú Quốc').map((o) => o.id);
  assert.ok(origins.includes('ho-chi-minh') && origins.includes('ha-noi') && !origins.includes('hai-phong'), 'Hải Phòng chưa có tuyến mẫu tới Phú Quốc');
  const list = searchFlights({ data: flightDataFor(flights, 'Phú Quốc'), originId: 'ho-chi-minh', date: '2026-10-20', direction: 'out', people: 2, today: '2026-10-08' });
  assert.ok(list.length > 10 && list.every((f) => f.to === 'PQC' && f.from === 'SGN'));
  const back = searchFlights({ data: flightDataFor(flights, 'Phú Quốc'), originId: 'ha-noi', date: '2026-10-23', direction: 'back', people: 2, today: '2026-10-08' });
  assert.ok(back.every((f) => f.from === 'PQC' && f.to === 'HAN'));
  assert.ok(transport.airports['Phú Quốc'].lat < 10.5 && transport.airports['Hội An'].name === transport.airports['Đà Nẵng'].name);
});

test('lịch trình nổi bật của Phú Quốc: địa điểm có thật, đúng đảo, hợp đối tượng', () => {
  const list = featured.featured.filter((f) => f.destination === 'Phú Quốc');
  assert.ok(list.length >= 3);
  for (const f of list) for (const id of f.days.flat()) {
    const p = data.places.find((x) => x.id === id);
    assert.ok(p && p.city === 'Phú Quốc', f.id + ': ' + id); assert.ok(p.audiences.includes(f.audience), `${f.id}: ${id} không dành cho ${f.audience}`);
    if (f.audience === 'gia_dinh') assert.ok(p.kids, `${f.id}: ${id} không hợp trẻ nhỏ`);
  }
});

// ---- Hà Nội
const HN = data.places.filter((p) => p.city === 'Hà Nội');

test('Hà Nội có đủ loại địa điểm, dữ liệu hợp lệ', () => {
  assert.ok(HN.length >= 30, 'hiện ' + HN.length);
  const types = new Set(HN.map((p) => p.type));
  for (const t of ['culture', 'checkin', 'show', 'park', 'food', 'cafe']) assert.ok(types.has(t), 'thiếu loại ' + t);
  for (const p of HN) {
    assert.ok(p.lat > 20.5 && p.lat < 21.3 && p.lng > 105.4 && p.lng < 106.0, `${p.id} nằm ngoài vùng Hà Nội`);
    assert.ok(p.audiences.length && p.highlights.length && p.culture, p.id);
    if (p.type === 'food') assert.ok(['lunch', 'dinner'].includes(p.meal), p.id);
  }
});

test('địa điểm đóng cửa theo ngày: Lăng Bác không được xếp vào thứ Hai, thứ Sáu hoặc lúc tu bổ', async () => {
  const { closedOn } = await import('../src/scheduler.js');
  const lang = data.places.find((p) => p.id === 'lang-bac');
  assert.equal(closedOn(lang, '2026-12-07'), true, 'thứ Hai');
  assert.equal(closedOn(lang, '2026-12-11'), true, 'thứ Sáu');
  assert.equal(closedOn(lang, '2026-12-09'), false, 'thứ Tư');
  assert.equal(closedOn(lang, '2026-10-15'), true, 'đang tu bổ');
  assert.equal(closedOn(lang, '2026-11-03'), false, 'mở lại 3/11 (thứ Ba)');
  const inRepair = buildItinerary(base({ destination: 'Hà Nội', startDate: '2026-10-14', endDate: '2026-10-20', audience: 'nhom_ban', people: 3 }), data, rules);
  assert.ok(!inRepair.days.flatMap((d) => d.items).some((i) => i.place && i.place.id === 'lang-bac'), 'đang tu bổ mà vẫn xếp Lăng Bác');
  const open = buildItinerary(base({ destination: 'Hà Nội', startDate: '2026-12-08', endDate: '2026-12-12', audience: 'mot_minh', styles: ['van_hoa'], budget: 'tiet_kiem', people: 1 }), data, rules);
  for (const d of open.days) if (d.items.some((i) => i.place && i.place.id === 'lang-bac')) assert.ok(![1, 5].includes(new Date(d.date + 'T00:00:00Z').getUTCDay()), 'xếp Lăng Bác vào ' + d.date);
});

test('Hà Nội: lịch trình, khách sạn, sân bay và tuyến bay đúng điểm đến', async () => {
  const { flightDataFor, originsFor } = await import('../src/search.js');
  for (const audience of ['cap_doi', 'gia_dinh', 'nhom_ban', 'mot_minh']) {
    const p = buildItinerary(base({ destination: 'Hà Nội', audience, hasKids: audience === 'gia_dinh' }), data, rules);
    assert.ok(p.days.flatMap((d) => d.items.filter((i) => i.place)).every((i) => i.place.city === 'Hà Nội'), audience);
  }
  const hotels = hotelsFor(opts.hotels, { destination: 'Hà Nội' });
  assert.ok(hotels.length >= 8 && hotels.every((h) => h.city === 'Hà Nội'));
  assert.equal(flightDataFor(flights, 'Hà Nội').destination.airport, 'HAN');
  const o = originsFor(flights, opts.origins, 'Hà Nội').map((x) => x.id);
  assert.ok(o.includes('ho-chi-minh') && o.includes('da-nang') && !o.includes('ha-noi'), 'không có chuyến Hà Nội đi Hà Nội: ' + o);
  assert.ok(!originsFor(flights, opts.origins, 'Đà Nẵng').some((x) => x.id === 'da-nang'), 'không có chuyến Đà Nẵng đi Đà Nẵng');
  assert.ok(transport.airports['Hà Nội'].lat > 21);
  const list = featured.featured.filter((f) => f.destination === 'Hà Nội');
  assert.ok(list.length >= 3);
  for (const f of list) for (const id of f.days.flat()) {
    const p = data.places.find((x) => x.id === id);
    assert.ok(p && p.city === 'Hà Nội' && p.audiences.includes(f.audience), f.id + ': ' + id);
    if (f.audience === 'gia_dinh') assert.ok(p.kids, `${f.id}: ${id}`);
  }
});
