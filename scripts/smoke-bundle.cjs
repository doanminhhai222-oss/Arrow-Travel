// Kiểm tra nhanh bản đóng gói: mở từng màn hình và từng bảng chính, thất bại nếu có lỗi JavaScript.
// Dùng: python3 scripts/build-artifact.py dist/arrow-travel.html && node scripts/smoke-bundle.cjs dist/arrow-travel.html
// Cần Playwright đã cài sẵn (đặt biến PLAYWRIGHT_PATH nếu không nằm ở vị trí mặc định).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');
(async () => {
  const file = path.resolve(process.argv[2] || 'dist/arrow-travel.html');
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 420, height: 880 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/fonts.googleapis.com/**', (r) => r.abort());
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { errs.push(name + ': ' + e.message.split('\n')[0]); console.log('LỖI', name); } };
  await p.goto('file://' + file); await p.waitForTimeout(300);
  await step('mở app', async () => { await p.click('#splashGo'); await p.waitForTimeout(700); });
  await step('lối tắt gia đình', async () => { await p.click('[data-preset=gia_dinh]'); await p.waitForSelector('section.day'); });
  await step('chi tiết địa điểm', async () => { await p.locator('.nm').first().click(); await p.waitForSelector('#sheetBody .pd'); await p.click('#sheetClose'); });
  await step('thêm địa điểm', async () => { await p.locator('[data-act=addplace]').first().click(); await p.waitForSelector('#addList'); await p.click('#sheetClose'); });
  await step('chốt lịch trình', async () => { await p.click('[data-act=final]'); await p.click('#bt-flights'); await p.waitForSelector('.bpanel [data-act=fout]'); await p.click('#bt-transport'); await p.waitForSelector('.bpanel [data-act=transport]'); await p.click('#bt-hotel'); });
  await step('chi tiết khách sạn', async () => { await p.locator('[data-act=hoteldetail]').nth(1).click(); await p.waitForSelector('#sheetBody [data-room]'); await p.click('#sheetClose'); });
  await step('thanh toán', async () => { await p.click('[data-act=book]'); await p.waitForSelector('.qrbox svg'); await p.click('#sheetClose'); });
  await step('khoảnh khắc và album', async () => { await p.click('.tab[data-go=moments]'); await p.waitForSelector('#momStats'); await p.locator('details.mom').first().locator('summary').click(); await p.locator('[data-momstar="5"]').first().click(); await p.click('[data-mompost]'); await p.waitForSelector('.saved-ok'); await p.click('[data-album]'); await p.waitForSelector('#albumBody .album'); await p.click('#pageBack'); });
  await step('chuông thông báo', async () => { await p.click('#bell'); await p.waitForSelector('#scr-notifs:not([hidden])'); await p.click('#notifBack'); });
  await step('bắt đầu theo dõi', async () => { await p.evaluate(() => document.querySelector('[data-go=create]').click()); await p.click('[data-act=save]'); await p.click('.tab[data-go=trips]'); await p.locator('#tripsList [data-trackstart]').first().click(); await p.waitForSelector('svg.tmap'); await p.click('[data-trk=here]'); await p.waitForTimeout(300); });
  for (const t of ['moments', 'trips', 'track', 'account', 'home']) await step('tab ' + t, async () => { await p.click('.tab[data-go=' + t + ']'); });
  for (const pg of ['settings', 'promos', 'rewards', 'friends', 'rate', 'about', 'privacy', 'terms', 'payguide']) await step('trang ' + pg, async () => { await p.click('.tab[data-go=account]'); await p.evaluate((x) => document.querySelector('#scr-account [data-page=' + x + ']') ? document.querySelector('#scr-account [data-page=' + x + ']').click() : document.querySelector('[data-page=' + x + ']').click(), pg); await p.waitForSelector('#scr-page:not([hidden])'); });
  await b.close();
  if (errs.length) { console.error('\nCó lỗi:\n- ' + errs.join('\n- ')); process.exit(1); }
  console.log('\nBản đóng gói chạy sạch, không lỗi JavaScript.');
})();
