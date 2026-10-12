import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

const names = (page) => page.locator('section.day[data-day="0"] .leg .n').allTextContents();

test('đổi thứ tự bằng phím, hoàn tác, thêm địa điểm từ Google Maps, lưu và mở lại sau khi tải lại trang', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  await page.click('[data-daytab="0"]');
  const before = await names(page);
  assert.ok(before.length >= 3);
  // phím mũi tên đưa điểm thứ 3 lên trên
  await page.locator('section.day[data-day="0"] [data-grip]').nth(2).focus();
  await page.keyboard.press('ArrowUp');
  const moved = await names(page);
  assert.deepEqual([moved[1], moved[2]], [before[2], before[1]]);
  await page.click('[data-act=undo]');
  assert.deepEqual(await names(page), before);
  // thêm địa điểm từ liên kết Google Maps đầy đủ; liên kết rút gọn bị từ chối rõ ràng
  await page.click('section.day[data-day="0"] [data-act=addplace]');
  await page.click('[data-add=mode][data-v=maps]');
  await page.fill('#cpLink', 'https://maps.app.goo.gl/xyz');
  assert.match(await page.locator('#cpStatus').textContent(), /rút gọn|đầy đủ|mở/i);
  await page.fill('#cpLink', 'https://www.google.com/maps/place/B%C3%BAn+m%E1%BA%AFm+V%C3%A2n/@16.0600,108.2100,17z/data=!3m1!4b1!4m6!3m5!8m2!3d16.0612!4d108.2121');
  assert.match(await page.locator('#cpStatus').textContent(), /16\.06/);
  assert.match(await page.inputValue('#cpName'), /Bún mắm Vân/);
  await page.selectOption('#cpType', 'food'); await page.fill('#cpPrice', '45000');
  await page.click('[data-add=custom]');
  assert.ok((await names(page)).some((x) => x.includes('Bún mắm Vân')));
  // lưu, tải lại, mở lại từ danh sách chuyến đi
  await page.click('[data-act=final]'); await page.click('[data-act=save]');
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#homeDest button').length >= 9);
  await page.click('.tab[data-go=trips]'); await page.click('#tripsList [data-trip]');
  await page.waitForSelector('.leg .n');
  assert.ok((await page.locator('.leg .n').allTextContents()).some((x) => x.includes('Bún mắm Vân')));
  assert.deepEqual(page.errors, []);
});

test('lưu chuyến kết hợp nhiều thành phố rồi mở lại: vẫn đủ hai khách sạn và tên thành phố', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-go=create]');
  await page.click('#destSeg [data-v="Đà Nẵng"]');
  for (const b of await page.locator('#combo button[aria-pressed=true]').all()) await b.click();
  await page.click('#combo [data-v="Hội An"]');
  const start = await page.inputValue('#start');
  const end = new Date(start + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + 3);
  await page.fill('#end', end.toISOString().slice(0, 10));
  await page.click('#goBtn'); await page.waitForSelector('section.day');
  await page.click('[data-act=final]'); await page.click('#bt-hotel');
  const second = page.locator('.bpanel .opts').nth(1).locator('[data-act=hotel]:not([disabled]):not([aria-pressed=true])').first();
  const pick = await second.locator('b').textContent(); await second.click();
  await page.click('[data-act=save]');
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#homeDest button').length >= 9);
  await page.click('.tab[data-go=trips]');
  assert.match(await page.locator('#tripsList').innerText(), /Đà Nẵng \+ Hội An/);
  await page.click('#tripsList [data-trip]'); await page.waitForSelector('section.day');
  const heads = (await page.locator('section.day h2').allTextContents()).map((x) => x.split(' · ').pop().trim());
  assert.deepEqual(heads, ['Đà Nẵng', 'Đà Nẵng', 'Hội An', 'Hội An']);
  // chuyến đã lưu mở ra ở trạng thái đã chốt nên không có nút "Chốt lịch trình"
  if (await page.locator('[data-act=final]').count()) await page.click('[data-act=final]');
  await page.click('#bt-hotel');
  assert.equal((await page.locator('.bpanel h4').count()), 2);
  assert.equal(await page.locator('.bpanel .opts').nth(1).locator('[data-act=hotel][aria-pressed=true] b').textContent(), pick);
  assert.deepEqual(page.errors, []);
});
