import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.js';

const DESTS = ['Đà Nẵng', 'Hội An', 'Phú Quốc', 'Hà Nội', 'Nha Trang', 'Đà Lạt', 'Huế', 'Sa Pa', 'Ninh Bình'];
let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

test('trang chủ: 9 điểm đến, mỗi nơi đổi tiêu đề, có lịch trình nổi bật và lịch trình mẫu', async () => {
  const page = await openApp(browser, srv.url);
  assert.deepEqual(await page.locator('#homeDest button').allTextContents(), DESTS);
  for (const d of DESTS) {
    await page.click(`[data-homedest="${d}"]`);
    assert.equal((await page.locator('#heroTitle').textContent()).trim(), d);
    assert.ok((await page.locator('#homeFeatured .fcard').count()) >= 3, `${d}: thiếu lịch trình nổi bật`);
    assert.ok((await page.locator('#homeDemo .stops li').count()) >= 3, `${d}: thiếu lịch trình mẫu`);
  }
  assert.deepEqual(page.errors, []);
});

test('bốn thẻ đối tượng đi cùng tạo được lịch trình ngay từ trang chủ', async () => {
  const page = await openApp(browser, srv.url);
  for (const p of ['cap_doi', 'gia_dinh', 'nhom_ban', 'mot_minh']) {
    await page.click('.tab[data-go=home]');
    await page.click(`[data-preset=${p}]`);
    await page.waitForSelector('section.day');
    assert.ok((await page.locator('section.day [data-act=detail]').count()) > 0, p);
  }
  assert.deepEqual(page.errors, []);
});
