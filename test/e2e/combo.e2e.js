import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, createTrip } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

test('ô kết hợp chỉ hiện ở các điểm đến có thành phố gần', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-go=create]');
  const expect = { 'Đà Nẵng': ['Hội An', 'Huế'], 'Hội An': ['Đà Nẵng', 'Huế'], 'Huế': ['Đà Nẵng', 'Hội An'], 'Hà Nội': ['Ninh Bình', 'Sa Pa'], 'Ninh Bình': ['Hà Nội', 'Sa Pa'], 'Sa Pa': ['Hà Nội', 'Ninh Bình'], 'Nha Trang': ['Đà Lạt'], 'Đà Lạt': ['Nha Trang'], 'Phú Quốc': [] };
  for (const [d, nb] of Object.entries(expect)) {
    await page.click(`#destSeg [data-v="${d}"]`);
    assert.deepEqual(await page.locator('#combo button').allTextContents(), nb, d);
    assert.equal(await page.locator('#comboRow').isVisible(), nb.length > 0, d);
  }
  assert.deepEqual(page.errors, []);
});

test('Đà Nẵng + Hội An + Huế 5 ngày: mỗi ngày một thành phố, hai khách sạn, chi phí và chặng liên tỉnh', async () => {
  const page = await openApp(browser, srv.url);
  await createTrip(page, { dest: 'Đà Nẵng', days: 5, also: ['Huế', 'Hội An'] });
  const heads = (await page.locator('section.day h2').allTextContents()).map((x) => x.split(' · ').pop().trim());
  assert.deepEqual(heads, ['Đà Nẵng', 'Đà Nẵng', 'Hội An', 'Hội An', 'Huế']);
  await page.click('[data-act=final]');
  await page.click('#bt-hotel');
  const stays = await page.locator('.bpanel h4').allTextContents();
  assert.equal(stays.length, 2);
  assert.match(stays[0], /Ở Đà Nẵng/); assert.match(stays[1], /Ở Hội An/);
  // chọn khách sạn khác ở Hội An: danh sách thứ hai đổi, danh sách thứ nhất giữ nguyên
  const first = await page.locator('.bpanel .opts').nth(0).locator('[data-act=hotel][aria-pressed=true] b').textContent();
  const second = page.locator('.bpanel .opts').nth(1).locator('[data-act=hotel]:not([disabled]):not([aria-pressed=true])').first();
  const pick = await second.locator('b').textContent();
  await second.click();
  assert.equal(await page.locator('.bpanel .opts').nth(0).locator('[data-act=hotel][aria-pressed=true] b').textContent(), first);
  assert.equal(await page.locator('.bpanel .opts').nth(1).locator('[data-act=hotel][aria-pressed=true] b').textContent(), pick);
  const cost = await page.locator('.cost').first().innerText();
  assert.match(cost, /Khách sạn · Đà Nẵng/); assert.match(cost, /Khách sạn · Hội An/);
  await page.click('#bt-transport');
  assert.match(await page.locator('.bpanel .hint').first().innerText(), /chặng sang thành phố khác/);
  assert.deepEqual(page.errors, []);
});

test('Hà Nội + Ninh Bình + Sa Pa chỉ 2 ngày: có cảnh báo thiếu ngày, chỉ đi 2 thành phố đầu', async () => {
  const page = await openApp(browser, srv.url);
  await createTrip(page, { dest: 'Hà Nội', days: 2, also: ['Sa Pa', 'Ninh Bình'] });
  const heads = (await page.locator('section.day h2').allTextContents()).map((x) => x.split(' · ').pop().trim());
  assert.deepEqual(heads, ['Hà Nội', 'Ninh Bình']);
  assert.match(await page.locator('#out').innerText(), /ít nhất 3 ngày/);
  assert.deepEqual(page.errors, []);
});
