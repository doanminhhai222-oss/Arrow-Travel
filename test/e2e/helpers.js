// Dùng chung cho kiểm thử trình duyệt: chạy server thử, mở trình duyệt, gom lỗi JS và lỗi tải tệp.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const root = join(here, '..', '..');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');

export async function startServer() {
  const port = 3200 + Math.floor(Math.random() * 600);
  const child = spawn(process.execPath, [join(root, 'serve.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const url = `http://localhost:${port}/web/`;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch { /* chưa lên */ } await new Promise((r) => setTimeout(r, 100)); }
  return { url, stop: () => child.kill() };
}
export const launch = () => chromium.launch();

// Mở app ở khổ điện thoại, trả về page kèm danh sách lỗi (errors) để kiểm tra cuối bài
export async function openApp(browser, url, { viewport = { width: 400, height: 860 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('JS: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith('http://localhost')) page.errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll('#homeDest button').length >= 9, null, { timeout: 15000 });
  return page;
}

export const isoPlus = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Tạo lịch trình qua form: điểm đến, số ngày, các thành phố kết hợp
export async function createTrip(page, { dest, days = 2, also = [] }) {
  await page.click('[data-go=create]');
  await page.click(`#destSeg [data-v="${dest}"]`);
  for (const b of await page.locator('#combo button[aria-pressed=true]').all()) await b.click();
  for (const c of also) await page.click(`#combo [data-v="${c}"]`);
  const start = await page.inputValue('#start');
  await page.fill('#end', isoPlus(start, days - 1));
  await page.click('#goBtn');
  await page.waitForSelector('section.day');
  return start;
}
