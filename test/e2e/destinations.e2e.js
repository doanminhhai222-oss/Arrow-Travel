import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, createTrip } from './helpers.js';

const DESTS = ['Đà Nẵng', 'Hội An', 'Phú Quốc', 'Hà Nội', 'Nha Trang', 'Đà Lạt', 'Huế', 'Sa Pa', 'Ninh Bình'];
let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

for (const dest of DESTS) {
  test(`${dest}: tạo lịch trình 2 ngày, chốt, có chuyến bay, khách sạn và chi phí`, async () => {
    const page = await openApp(browser, srv.url);
    await createTrip(page, { dest, days: 2 });
    assert.equal(await page.locator('section.day').count(), 2);
    assert.ok((await page.locator('section.day [data-act=detail]').count()) >= 3, 'ít điểm');
    await page.click('[data-act=final]');
    await page.click('#bt-flights');
    assert.ok((await page.locator('[data-act=fout]').count()) > 0, 'không có chuyến bay đi');
    assert.ok((await page.locator('[data-act=fback]').count()) > 0, 'không có chuyến bay về');
    await page.click('#bt-hotel');
    assert.ok((await page.locator('.bpanel [data-act=hotel]:not([disabled])').count()) > 0, 'không có khách sạn còn phòng');
    const cost = await page.locator('.cost').first().innerText();
    assert.match(cost, /Tổng cộng/);
    assert.deepEqual(page.errors, []);
  });
}
