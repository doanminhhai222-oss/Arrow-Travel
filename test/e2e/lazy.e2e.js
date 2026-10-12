import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, createTrip } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

// Gom các tệp dữ liệu điểm đến đã được tải: trả về danh sách tên (ví dụ places/hue)
function track(page) {
  const seen = [];
  page.on('request', (r) => { const m = r.url().match(/\/data\/(places|hotels)\/([\w-]+)\.json/); if (m) seen.push(m[1] + '/' + m[2]); });
  return seen;
}
async function open(context) {
  const page = await context.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push('JS: ' + e.message));
  const seen = track(page);
  await page.goto(srv.url);
  await page.waitForFunction(() => document.querySelectorAll('#homeDest button').length >= 9);
  return { page, seen };
}

test('mở app chỉ tải dữ liệu của điểm đến đang dùng; chọn điểm khác mới tải thêm, mỗi tệp một lần', async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const { page, seen } = await open(ctx);
  assert.deepEqual([...seen].sort(), ['hotels/da-nang', 'places/da-nang']);
  await page.click('[data-homedest="Huế"]');
  await page.waitForFunction(() => document.querySelector('#heroTitle').textContent.trim() === 'Huế' && document.querySelectorAll('#homeFeatured .fcard').length >= 3);
  assert.ok(seen.includes('places/hue') && seen.includes('hotels/hue'));
  assert.ok(!seen.includes('places/sa-pa'), 'không được tải điểm đến chưa chọn');
  await page.click('[data-homedest="Đà Nẵng"]'); await page.click('[data-homedest="Huế"]');
  await page.waitForTimeout(300);
  assert.equal(seen.filter((x) => x === 'places/hue').length, 1, 'tải trùng');
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('lịch kết hợp tải thêm thành phố đi kèm trước khi xếp lịch; lịch nổi bật kết hợp hiện đủ khi chọn Hội An', async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const { page, seen } = await open(ctx);
  await createTrip(page, { dest: 'Đà Nẵng', days: 4, also: ['Hội An'] });
  assert.ok(seen.includes('places/hoi-an'));
  const heads = (await page.locator('section.day h2').allTextContents()).map((x) => x.split(' · ').pop().trim());
  assert.deepEqual(heads, ['Đà Nẵng', 'Đà Nẵng', 'Hội An', 'Hội An']);
  assert.ok((await page.locator('section.day [data-act=detail]').count()) >= 6);
  // Đà Nẵng có lịch kết hợp với Hội An, Huế: thẻ chỉ hiện sau khi dữ liệu thành phố đi kèm đã tải
  await page.click('.tab[data-go=home]'); await page.click('[data-homedest="Đà Nẵng"]');
  await page.waitForFunction(() => document.querySelectorAll('#homeFeatured .fcard').length >= 7, null, { timeout: 8000 });
  assert.ok(seen.includes('places/hue'), 'lịch Miền Trung cần dữ liệu Huế');
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('chuyến đã lưu: tải lại trang thì tải đúng các điểm đến của chuyến, mở lại đủ địa điểm', async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const { page } = await open(ctx);
  await createTrip(page, { dest: 'Nha Trang', days: 4, also: ['Đà Lạt'] });
  await page.click('[data-act=final]'); await page.click('[data-act=save]');
  // trang mới trong cùng bối cảnh (cùng bộ nhớ trình duyệt), đang chọn điểm đến khác
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arrow-travel-v1')); s.prefs.dest = 'Phú Quốc'; localStorage.setItem('arrow-travel-v1', JSON.stringify(s)); });
  const second = await open(ctx);
  assert.ok(second.seen.includes('places/phu-quoc'));
  assert.ok(second.seen.includes('places/nha-trang') && second.seen.includes('places/da-lat'), 'phải tải điểm đến của chuyến đã lưu');
  assert.ok(!second.seen.includes('places/da-nang'));
  await second.page.click('.tab[data-go=trips]'); await second.page.click('#tripsList [data-trip]'); await second.page.waitForSelector('section.day');
  assert.ok((await second.page.locator('section.day [data-act=detail]').count()) >= 6);
  assert.deepEqual(second.page.errors, []);
  await ctx.close();
});

test('khoảnh khắc: chọn địa điểm bất kỳ tải mọi điểm đến', async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const { page, seen } = await open(ctx);
  await page.click('.tab[data-go=moments]');
  await page.click('[data-momtrip="free"]');
  await page.waitForFunction(() => document.body.innerText.includes('Tất cả địa điểm'), null, { timeout: 15000 });
  assert.equal(new Set(seen.filter((x) => x.startsWith('places/'))).size, 9);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});
