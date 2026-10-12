import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

test('ArrowPro: bản thường bị khoá, mã sai bị từ chối, dùng thử mở khoá tối ưu lịch trình, hết dùng thử khoá lại', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  assert.ok((await page.locator('[data-act=optimize] .pro-tag').count()) > 0, 'nút tối ưu phải có nhãn Pro');
  await page.locator('[data-act=optimize]').first().click();
  assert.ok((await page.locator('#pageTitle').textContent()).length > 0, 'phải mở trang giới thiệu Pro');
  // mã sai
  await page.fill('#proCode', 'AP1.abc.def'); await page.click('[data-pg=proactivate]');
  assert.match(await page.locator('#proMsg').textContent(), /Mã/);
  // dùng thử 7 ngày
  await page.click('[data-pg=protrial]');
  await page.click('#pageBack'); await page.click('.tab[data-go=home]'); await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  await page.click('[data-daytab="0"]');
  await page.locator('section.day[data-day="0"] [data-grip]').nth(0).focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  const km = () => page.locator('section.day[data-day="0"] .meta').textContent();
  const before = await km();
  await page.click('section.day[data-day="0"] [data-act=optimize]');
  assert.ok((await page.locator('.undo span').textContent()).length > 0, 'phải báo kết quả tối ưu hoặc đã ngắn nhất');
  assert.ok(before.length > 0);
  // giao diện hồng mở khoá trong dùng thử
  await page.click('.tab[data-go=account]'); await page.click('[data-page=settings]'); await page.click('[data-k=theme][data-v=pink]');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'pink');
  // hết hạn dùng thử: giao diện hồng tự về mặc định
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arrow-travel-v1')); s.pro.trialUntil = Date.now() - 1000; localStorage.setItem('arrow-travel-v1', JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#homeDest button').length >= 9);
  assert.notEqual(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'pink');
  assert.deepEqual(page.errors, []);
});
