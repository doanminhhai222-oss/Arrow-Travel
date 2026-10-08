// Arrow Travel dùng ngoại tuyến (ArrowPro): trả bản đã lưu ngay, đồng thời tải bản mới để lần sau cập nhật.
// Chỉ đăng ký khi người dùng bật trong trang ArrowPro; tắt thì gỡ và xoá bản lưu.
const CACHE = 'arrow-offline-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Đang ngoại tuyến và tệp này chưa được lưu.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
