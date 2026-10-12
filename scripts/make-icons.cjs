// Tạo biểu tượng cài app (PNG) và ảnh chia sẻ (Open Graph) từ web/logo.svg bằng trình duyệt không giao diện.
// Chạy: PLAYWRIGHT_PATH=/duong-dan/toi/playwright node scripts/make-icons.cjs
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..', 'web');
const logo = fs.readFileSync(path.join(root, 'logo.svg'), 'utf8').replace(/ width="512" height="512"/, ' width="100%" height="100%"');
const flat = logo.replace('rx="16"', 'rx="0"'); // bản không bo góc cho biểu tượng iOS và maskable (hệ điều hành tự bo)
const slogan = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'app.json'), 'utf8')).slogan;
const page = (w, h, body, css = '') => `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:transparent}${css}</style>${body}`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const shot = async (name, w, h, html, omit = true) => {
    await p.setViewportSize({ width: w, height: h }); await p.setContent(html); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(root, 'icons', name), omitBackground: omit }); console.log('đã tạo icons/' + name);
  };
  fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
  const plain = (s) => page(s, s, `<div style="width:${s}px;height:${s}px">${logo}</div>`);
  await shot('icon-192.png', 192, 192, plain(192));
  await shot('icon-512.png', 512, 512, plain(512));
  await shot('apple-touch-icon.png', 180, 180, page(180, 180, `<div style="width:180px;height:180px">${flat}</div>`), false);
  // maskable: nền phủ kín, biểu tượng thu nhỏ vào vùng an toàn 80%
  await shot('icon-maskable-512.png', 512, 512, page(512, 512, `<div style="width:512px;height:512px;background:linear-gradient(to top right,#0A4F4A,#0F766E 60%,#2DD4BF);display:grid;place-items:center"><div style="width:450px;height:450px">${flat}</div></div>`), false);
  // ảnh chia sẻ 1200x630: nền gradient thương hiệu, không dùng ảnh địa điểm để khỏi vướng bản quyền
  await shot('og-image.png', 1200, 630, page(1200, 630, `<div style="width:1200px;height:630px;background:linear-gradient(135deg,#0A4F4A,#0F766E 55%,#2DD4BF);color:#fff;font-family:'DejaVu Sans','Liberation Sans',sans-serif;display:flex;align-items:center;padding:0 96px;gap:64px">
    <div style="width:240px;height:240px;flex:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.25))">${logo}</div>
    <div><div style="font-size:92px;font-weight:700;letter-spacing:-1px">Arrow Travel</div>
    <div style="font-size:38px;line-height:1.35;margin-top:18px;opacity:.95;max-width:860px;text-wrap:balance">${slogan}</div>
    <div style="font-size:26px;margin-top:28px;opacity:.8">Lịch trình du lịch theo người đi cùng · 9 điểm đến</div></div></div>`), false);
  await b.close();
})();
