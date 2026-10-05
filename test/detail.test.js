import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeDetailHtml, miniMapSvg } from '../src/detail.js';

const data = JSON.parse(readFileSync(new URL('../data/da-nang.json', import.meta.url)));
const open = data.places.filter((p) => p.status !== 'closed');
const get = (id) => data.places.find((p) => p.id === id);

test('mọi địa điểm đang mở đều có chú ý nổi bật và nội dung văn hoá', () => {
  for (const p of open) {
    assert.ok(p.highlights?.length, `${p.id} thiếu highlights`);
    assert.ok(p.culture, `${p.id} thiếu culture`);
  }
});

test('quán ăn có mô tả, đánh giá, món nên thử; điểm tham quan có nét văn hoá', () => {
  const food = placeDetailHtml(get('mi-quang'), [get('mi-quang')]);
  assert.match(food, /Mô tả/); assert.match(food, /Đánh giá/); assert.match(food, /Món nên thử/); assert.match(food, /đánh giá mẫu/);
  const sight = placeDetailHtml(get('linh-ung'), [get('my-khe'), get('linh-ung')]);
  assert.match(sight, /Nét đặc trưng văn hoá/); assert.match(sight, /Chú ý nổi bật/); assert.match(sight, /<svg class="pd-map"/);
  assert.match(sight, /google\.com\/maps/);
});

test('bản đồ chạy được với 1 điểm và nhiều điểm, không ra NaN', () => {
  assert.ok(!miniMapSvg(get('ba-na'), []).includes('NaN'));
  assert.ok(!miniMapSvg(get('ba-na'), open).includes('NaN'));
});

test('tên địa điểm được escape', () => {
  const html = placeDetailHtml({ ...get('my-khe'), name: '<script>x</script>' }, []);
  assert.ok(!html.includes('<script>x'));
});
