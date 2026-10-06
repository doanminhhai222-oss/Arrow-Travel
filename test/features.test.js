import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchPromos, findByCode, applyPromo } from '../src/promos.js';
import { EARN, CATALOG, newPoints, award, redeem, voucherCheck } from '../src/loyalty.js';
import { matchTravelers } from '../src/friends.js';
import { money, moneyVnd, setCurrency, vnd } from '../src/format.js';
import { tr, setLang } from '../src/i18n.js';
import { EN } from '../src/i18n-en.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const promos = read('../data/promos.json').promos, travelers = read('../data/travelers.json').travelers, legal = read('../data/legal.json');
const TODAY = '2026-10-06';

test('tìm khuyến mãi theo loại, theo từ khoá không dấu, bỏ mã hết hạn', () => {
  assert.ok(searchPromos(promos, { today: TODAY }).length >= 8);
  assert.ok(searchPromos(promos, { type: 'flight', today: TODAY }).every((p) => p.target.type === 'flight'));
  assert.equal(searchPromos(promos, { q: 'ba na', today: TODAY })[0].target.ref, 'ba-na');
  assert.equal(searchPromos(promos, { q: 'bà nà', today: TODAY })[0].target.ref, 'ba-na');
  assert.equal(searchPromos(promos, { today: '2028-01-01' }).length, 0);
});

test('áp mã: phần trăm có trần, số tiền cố định, điều kiện hãng, sao, đơn tối thiểu', () => {
  const ctx = { flightsTotal: 5000000, hotelTotal: 4000000, payAmount: 9000000, flightOut: { carrierId: 'vj' }, hotel: { stars: 4 } };
  assert.deepEqual(applyPromo(findByCode(promos, 'chaoarrow', TODAY), ctx), { ok: true, discount: 150000, reason: '' }); // 5% = 450k, trần 150k
  assert.equal(applyPromo(findByCode(promos, 'ARROWVJ8', TODAY), ctx).discount, 200000); // 8% = 400k, trần 200k
  assert.equal(applyPromo(findByCode(promos, 'ARROWVN150', TODAY), ctx).ok, false); // sai hãng
  assert.equal(applyPromo(findByCode(promos, 'ARROWVN150', TODAY), { ...ctx, flightOut: { carrierId: 'vn' } }).discount, 150000);
  assert.equal(applyPromo(findByCode(promos, 'HOTEL10', TODAY), { ...ctx, hotel: { stars: 3 } }).ok, false);
  assert.equal(applyPromo(findByCode(promos, 'HOTEL10', TODAY), ctx).discount, 300000);
  assert.equal(applyPromo(findByCode(promos, 'CHAOARROW', TODAY), { ...ctx, payAmount: 500000, flightsTotal: 500000 }).ok, false); // dưới mức tối thiểu
  assert.equal(applyPromo(promos.find((p) => p.kind === 'perk'), ctx).ok, false);
  assert.equal(findByCode(promos, 'khongco', TODAY), null);
});

test('tích điểm: có trần theo từng quy tắc, mỗi lịch trình chỉ được thưởng một lần', () => {
  let p = newPoints();
  ({ points: p } = award(p, 'save', { tripId: 'a' })); ({ points: p } = award(p, 'save', { tripId: 'a' })); ({ points: p } = award(p, 'save', { tripId: 'b' }));
  assert.equal(p.balance, 20);
  for (let i = 0; i < 15; i++) ({ points: p } = award(p, 'photo'));
  assert.equal(p.counters.photo, 10); assert.equal(p.balance, 20 + 50);
  ({ points: p } = award(p, 'rate')); const again = award(p, 'rate');
  assert.equal(again.awarded, 0); assert.equal(p.balance, 90);
  assert.equal(award(p, 'khong-co').awarded, 0);
  assert.ok(EARN.every((r) => r.points > 0));
});

test('đổi voucher: trừ điểm, hạn 90 ngày, báo lỗi khi thiếu điểm; kiểm tra điều kiện dùng', () => {
  const p = { ...newPoints(), balance: 260 };
  assert.match(redeem(p, 'v250', { today: TODAY }).error, /Chưa đủ/);
  const r = redeem(p, 'v100', { today: TODAY });
  assert.equal(r.points.balance, 10); assert.equal(r.voucher.expires, '2027-01-04'); assert.match(r.voucher.code, /^AV[0-9A-Z]{6}$/);
  assert.equal(voucherCheck(r.voucher, 2000000, TODAY).discount, 100000);
  assert.equal(voucherCheck(r.voucher, 1000000, TODAY).ok, false);
  assert.equal(voucherCheck({ ...r.voucher, used: true }, 2000000, TODAY).ok, false);
  assert.equal(voucherCheck(r.voucher, 2000000, '2027-02-01').ok, false);
  assert.ok(CATALOG.every((c, i) => i === 0 || c.cost > CATALOG[i - 1].cost));
});

test('bạn đồng hành: ưu tiên trùng ngày, cùng đối tượng và phong cách', () => {
  const trip = { destination: 'Đà Nẵng', startDate: '2026-10-13', endDate: '2026-10-15', audience: 'cap_doi', budget: 'thoai_mai', styles: ['thu_gian', 'am_thuc'] };
  const r = matchTravelers(trip, travelers, TODAY);
  assert.equal(r.length, travelers.length);
  assert.equal(r[0].id, 't1'); assert.ok(r[0].overlap >= 3 && r[0].sameAudience && r[0].sharedStyles.length === 2);
  assert.equal(r.find((x) => x.id === 't8').overlap, 0); // đã đi xong
  assert.ok(r.every((x, i) => i === 0 || r[i - 1].score >= x.score));
});

test('tiền tệ: đổi cách hiển thị, thanh toán luôn VND; ngôn ngữ: câu chưa dịch giữ nguyên', () => {
  assert.equal(money(1500000), '1.500.000 đ');
  setCurrency('USD'); assert.match(money(2540000), /100/); assert.equal(moneyVnd(2540000), '2.540.000 đ'); assert.match(vnd(0), /Miễn phí/);
  setCurrency('JPY'); assert.match(money(1700000), /10[.,]000/);
  setCurrency('VND'); assert.equal(money(1500000), '1.500.000 đ');
  assert.equal(tr('Khám phá'), 'Khám phá');
  setLang('en'); assert.equal(tr('Khám phá'), EN['Khám phá'] || 'Khám phá'); assert.equal(tr('Câu chưa dịch xyz'), 'Câu chưa dịch xyz'); setLang('vi');
});

test('văn bản pháp lý có đủ 3 phần, mỗi phần có mục và dấu [ĐIỀN] ở chỗ chủ app phải điền', () => {
  for (const k of ['privacy', 'terms', 'payguide']) { assert.ok(legal[k].title); assert.ok(legal[k].sections.length >= 5, k); assert.ok(legal[k].sections.every((s) => s.h && s.p)); }
  assert.ok(JSON.stringify(legal).includes('[ĐIỀN'));
});

test('bản dịch tiếng Anh: không mục nào dịch ra chính nó, khoá không thừa khoảng trắng, không vòng lặp dịch', () => {
  for (const [k, v] of Object.entries(EN)) {
    assert.notEqual(k, v, `"${k}" dịch ra chính nó (gây vòng lặp bộ dịch)`);
    assert.equal(k, k.trim(), `khoá thừa khoảng trắng: "${k}"`);
    assert.ok(v && v.trim(), `thiếu bản dịch: "${k}"`);
    assert.equal(EN[v], undefined, `bản dịch "${v}" lại là khoá khác`);
  }
});

test('lịch trình nổi bật mẫu: địa điểm có thật, không đóng cửa, đúng đối tượng; ghi rõ là mẫu', async () => {
  const feat = read('../data/featured.json'), data = read('../data/da-nang.json');
  assert.equal(feat.sample, true);
  assert.ok(feat.featured.length >= 4);
  for (const f of feat.featured) {
    assert.match(f.author, /\(mẫu\)/);
    const ids = f.days.flat();
    assert.equal(new Set(ids).size, ids.length, `${f.id} có điểm lặp`);
    for (const id of ids) {
      const p = data.places.find((x) => x.id === id);
      assert.ok(p, `${f.id}: không có địa điểm ${id}`);
      assert.notEqual(p.status, 'closed');
      assert.ok(p.audiences.includes(f.audience), `${f.id}: ${id} không dành cho ${f.audience}`);
      if (f.audience === 'gia_dinh') assert.ok(p.kids, `${f.id}: ${id} không hợp trẻ nhỏ`);
    }
  }
});
