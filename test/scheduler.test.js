import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildItinerary, toMin } from '../src/scheduler.js';

const data = JSON.parse(readFileSync(new URL('../data/da-nang.json', import.meta.url)));
const rules = JSON.parse(readFileSync(new URL('../data/rules.json', import.meta.url)));
const base = { destination: 'Đà Nẵng', startDate: '2026-09-03', endDate: '2026-09-05', people: 2, budget: 'vua_phai', style: 'thien_nhien' };
const plan = (o) => buildItinerary({ ...base, ...o }, data, rules);
const sights = (day) => day.items.filter((i) => i.kind === 'visit');

test('trả về đúng số ngày và không lặp địa điểm', () => {
  const r = plan({ audience: 'nhom_ban' });
  assert.equal(r.days.length, 3);
  const ids = r.days.flatMap((d) => d.items.filter((i) => i.place).map((i) => i.place.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('loại địa điểm đã đóng cửa', () => {
  const ids = plan({ audience: 'nhom_ban' }).days.flatMap((d) => d.items.map((i) => i.place?.id));
  assert.ok(!ids.includes('cho-con-cu'));
});

test('gia đình có trẻ nhỏ: ít điểm, nghỉ trưa >= 120 phút, không có điểm kids=false', () => {
  const r = plan({ audience: 'gia_dinh', hasKids: true });
  for (const d of r.days) {
    assert.ok(sights(d).length <= rules.gia_dinh.maxPerDay);
    const lunch = d.items.find((i) => i.kind === 'meal' && i.note?.includes('trưa')) || d.items.find((i) => i.kind === 'break');
    if (lunch) assert.ok(lunch.duration >= 120);
    assert.ok(d.items.every((i) => !i.place || i.place.kids));
  }
});

test('nhóm bạn trẻ dày hơn gia đình', () => {
  const young = plan({ audience: 'nhom_ban', endDate: '2026-09-03' }).days[0];
  const fam = plan({ audience: 'gia_dinh', hasKids: true, endDate: '2026-09-03' }).days[0];
  assert.ok(young.placeCount >= fam.placeCount);
});

test('giờ hợp lệ: trong giờ mở cửa, không vượt giờ kết thúc, không chồng nhau', () => {
  for (const audience of Object.keys(rules)) {
    for (const d of plan({ audience }).days) {
      let prevEnd = 0;
      for (const it of d.items) {
        assert.ok(toMin(it.time) >= prevEnd, `${audience}: chồng giờ ${it.time}`);
        prevEnd = toMin(it.end);
        if (it.place) {
          assert.ok(toMin(it.time) >= toMin(it.place.open));
          assert.ok(toMin(it.time) + it.place.duration <= toMin(it.place.close));
        }
      }
      assert.ok(prevEnd <= toMin(rules[audience].end));
    }
  }
});

test('ngân sách tiết kiệm loại Bà Nà Hills', () => {
  const ids = plan({ audience: 'nhom_ban', budget: 'tiet_kiem' }).days.flatMap((d) => d.items.map((i) => i.place?.id));
  assert.ok(!ids.includes('ba-na'));
});
