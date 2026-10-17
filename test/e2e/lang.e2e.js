import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

test('đổi qua 5 ngôn ngữ: thanh tab đổi chữ, không lỗi, quay lại tiếng Việt như cũ', async () => {
  const page = await openApp(browser, srv.url);
  const tabs = async () => (await page.locator('.tab').allTextContents()).map((x) => x.trim()).join('|');
  const vi = await tabs();
  const seen = new Set([vi]);
  for (const l of ['zh', 'ja', 'ko', 'en', 'vi']) {
    await page.click('.tab[data-go=account]');
    await page.click('#accountBody [data-page=settings]');
    await page.click(`[data-k=lang][data-v=${l}]`);
    await page.waitForFunction((x) => document.documentElement.lang === x, l);
    // bộ dịch chạy sau khi đổi ngôn ngữ: đợi thanh tab ổn định ở chữ của ngôn ngữ đó thay vì chờ cố định
    if (l !== 'vi') await page.waitForFunction((prev) => [...document.querySelectorAll('.tab')].map((x) => x.textContent.trim()).join('|') !== prev, vi);
    else await page.waitForFunction((v) => [...document.querySelectorAll('.tab')].map((x) => x.textContent.trim()).join('|') === v, vi);
    seen.add(await tabs());
  }
  assert.equal(await tabs(), vi, 'không trả về tiếng Việt như cũ');
  assert.equal(seen.size, 5, 'mỗi ngôn ngữ phải cho thanh tab khác nhau');
  assert.deepEqual(page.errors, []);
});

test('ngôn ngữ khác vẫn tạo được lịch trình kết hợp mà không lỗi', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('.tab[data-go=account]'); await page.click('#accountBody [data-page=settings]'); await page.click('[data-k=lang][data-v=ja]');
  await page.click('.tab[data-go=home]'); await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  assert.ok((await page.locator('section.day [data-act=detail]').count()) > 0);
  assert.deepEqual(page.errors, []);
});
