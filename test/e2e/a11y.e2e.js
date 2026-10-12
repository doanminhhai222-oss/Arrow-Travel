import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openApp, axeScan } from './helpers.js';

let srv, browser;
test.before(async () => { srv = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); srv.stop(); });

// Mở lần lượt các màn hình và hộp thoại chính, quét axe ở mỗi nơi
async function scanAll(page, label) {
  const bad = [];
  const scan = async (name) => bad.push(...(await axeScan(page, `${label}/${name}`)));
  await scan('trang-chu');
  await page.click('[data-go=create]'); await scan('tao-lich');
  await page.click('#goBtn'); await page.waitForSelector('section.day'); await scan('lich-trinh');
  await page.locator('[data-act=detail]').first().click(); await scan('chi-tiet-dia-diem'); await page.click('#sheetClose');
  await page.click('[data-act=final]'); await scan('da-chot');
  for (const t of ['flights', 'hotel', 'transport']) { await page.click('#bt-' + t); await scan('dat-' + t); }
  await page.click('#bt-hotel'); await page.locator('[data-act=hoteldetail]').first().click(); await scan('chi-tiet-khach-san'); await page.click('#sheetClose');
  await page.click('[data-act=book]'); await page.waitForSelector('.pay'); await scan('thanh-toan'); await page.click('#sheetClose');
  await page.click('[data-act=save]');
  for (const s of ['trips', 'moments', 'track', 'account']) { await page.click(`.tab[data-go=${s}]`); await scan(s); }
  await page.click('.tab[data-go=account]');
  for (const pg of await page.locator('#accountBody [data-page]').evaluateAll((a) => a.map((x) => x.dataset.page))) {
    await page.click('.tab[data-go=account]'); await page.click(`#accountBody [data-page=${pg}]`); await scan('trang-' + pg);
  }
  await page.click('.tab[data-go=home]'); await page.locator('#homeFeatured .fcard').first().click(); await scan('lich-noi-bat');
  return bad;
}

for (const theme of ['light', 'yellow', 'pink']) {
  test(`truy cập: không vi phạm WCAG A/AA ở mọi màn hình chính, giao diện ${theme}`, async () => {
    const page = await openApp(browser, srv.url);
    if (theme !== 'light') {
      // giao diện hồng cần Pro: bật dùng thử rồi đổi giao diện trong Cài đặt
      await page.click('.tab[data-go=account]'); await page.click('#accountBody .pro-card'); await page.click('[data-pg=protrial]'); await page.click('#pageBack');
      await page.click('#accountBody [data-page=settings]'); await page.click(`[data-k=theme][data-v=${theme}]`);
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), theme);
      await page.click('.tab[data-go=home]');
    }
    const bad = await scanAll(page, theme);
    assert.deepEqual(bad, []);
    assert.deepEqual(page.errors, []);
  });
}

test('truy cập: bàn phím. Hộp thoại giữ focus bên trong, Escape đóng và trả focus về nút đã mở, có vùng thông báo', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  const opener = page.locator('[data-act=detail]').first();
  await opener.focus(); await page.keyboard.press('Enter');
  const inSheet = () => page.evaluate(() => { const s = document.getElementById('sheet'); return !s.hidden && s.contains(document.activeElement); });
  assert.ok(await inSheet(), 'focus phải vào hộp thoại khi mở');
  for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); assert.ok(await inSheet(), `Tab lần ${i + 1} thoát khỏi hộp thoại`); }
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Shift+Tab'); assert.ok(await inSheet(), `Shift+Tab lần ${i + 1} thoát khỏi hộp thoại`); }
  assert.equal(await page.evaluate(() => document.querySelector('main, #scr-home').closest('[inert]') !== null || document.body.querySelector('[inert]') !== null), true, 'nền phải bị khoá (inert) khi mở hộp thoại');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.getElementById('sheet').hidden), true);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[inert]').length), 0, 'đóng hộp thoại phải gỡ khoá nền');
  assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.dataset.act), 'detail', 'focus phải quay về nút đã mở');
  assert.equal(await page.getAttribute('#toast', 'role'), 'status');
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi');
  assert.deepEqual(page.errors, []);
});

test('truy cập: không tràn ngang ở 320 px và tôn trọng giảm chuyển động', async () => {
  const page = await openApp(browser, srv.url, { viewport: { width: 320, height: 700 } });
  for (const [name, go] of [['trang-chu', null], ['tao-lich', '[data-go=create]'], ['tai-khoan', '.tab[data-go=account]']]) {
    if (go) await page.click(go);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    assert.ok(o.sw <= o.cw + 1, `${name} tràn ngang ${o.sw} > ${o.cw}`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const long = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return (parseFloat(s.animationDuration) > 0.3 && s.animationName !== 'none') || parseFloat(s.transitionDuration) > 0.3; }).length);
  assert.equal(long, 0, 'còn hiệu ứng dài khi người dùng chọn giảm chuyển động');
});

test('truy cập: trình đọc màn hình được báo khi lịch trình đổi và khi nhập sai ngày', async () => {
  const page = await openApp(browser, srv.url);
  await page.click('[data-preset=cap_doi]'); await page.waitForSelector('section.day');
  await page.waitForFunction(() => /Lịch trình \d+ ngày, \d+ điểm/.test(document.getElementById('srStatus').textContent));
  await page.click('[data-daytab="0"]');
  await page.locator('section.day[data-day="0"] [data-grip]').nth(2).focus(); await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => /Đã chuyển/.test(document.getElementById('srStatus').textContent));
  await page.click('[data-editform]');
  const start = await page.inputValue('#start'); await page.fill('#end', '2000-01-01'); await page.dispatchEvent('#end', 'change');
  await page.click('#goBtn');
  assert.equal(await page.getAttribute('#out .warn', 'role'), 'alert');
  assert.deepEqual(page.errors, []);
  assert.ok(start);
});
