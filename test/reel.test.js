import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planReel, sceneAt, trackNotes, TRACKS, starsLine, FADE } from '../src/reel.js';

const entries = [
  { label: 'Ngày 1', items: [{ p: { name: 'Biển Mỹ Khê' }, d: { rating: 5, text: 'Bình minh đẹp nhất chuyến đi, nước trong và mát, cả nhà tắm tới trưa mới chịu về khách sạn nghỉ ngơi một chút' }, urls: ['a', 'b'] }] },
  { label: 'Ngày 2', items: [{ p: { name: 'Cầu Rồng' }, d: { rating: 0, text: '' }, urls: ['c'] }, { p: { name: 'Chợ Hàn' }, d: { rating: 3, text: 'x' }, urls: [] }] },
];

test('dựng cảnh: mở đầu, mỗi ảnh một cảnh, kết; thời lượng cộng đúng', () => {
  const r = planReel(entries, { title: 'Đà Nẵng', sub: '3 ngày' }, { perPhoto: 3 });
  assert.deepEqual(r.scenes.map((s) => s.kind), ['title', 'photo', 'photo', 'photo', 'end']);
  assert.equal(r.duration, 3 + 3 * 3 + 3);
  assert.equal(r.scenes[1].text.length <= 90, true);
  assert.equal(r.scenes[1].text.endsWith('…'), true);
  assert.equal(r.scenes[2].text, '', 'chỉ ảnh đầu của mỗi nơi có lời cảm nhận');
  assert.equal(r.scenes[4].stats, '3 khoảnh khắc · 2 nơi đã ghé');
});

test('nhiều ảnh thì lấy rải đều, giữ ảnh đầu và ảnh cuối', () => {
  const many = [{ label: 'N', items: Array.from({ length: 20 }, (_, i) => ({ p: { name: 'P' + i }, d: {}, urls: ['u' + i + 'a', 'u' + i + 'b'] })) }];
  const r = planReel(many, {}, { maxPhotos: 10 });
  assert.equal(r.photos, 10);
  assert.equal(r.scenes[1].url, 'u0a');
  assert.equal(r.scenes[10].url, 'u19b');
});

test('cảnh theo thời gian và chuyển cảnh mờ dần', () => {
  const r = planReel(entries, {}, { perPhoto: 3 });
  assert.equal(sceneAt(r, 0).scene.kind, 'title');
  assert.equal(sceneAt(r, 3.1).scene.url, 'a');
  const f = sceneAt(r, 6 - FADE / 2);
  assert.equal(f.next.url, 'b'); assert.ok(f.mix > 0.4 && f.mix < 0.6);
  assert.equal(sceneAt(r, 999).scene.kind, 'end');
});

test('nhạc nền: đủ dài, không vượt thời lượng, có trống ở bài sôi động', () => {
  for (const id of Object.keys(TRACKS)) {
    const n = trackNotes(id, 20);
    assert.ok(n.length > 20); assert.ok(n.every((x) => x.t < 20 && x.vol > 0 && x.vol <= 0.4));
  }
  assert.ok(trackNotes('soi_dong', 10).some((x) => x.kind === 'kick'));
  assert.ok(!trackNotes('nhe_nhang', 10).some((x) => x.kind === 'kick'));
  assert.deepEqual(trackNotes('khong_co', 10), []);
  assert.equal(starsLine(4), '★★★★☆'); assert.equal(starsLine(0), '');
});
