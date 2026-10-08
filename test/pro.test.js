import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto as wc } from 'node:crypto';
import { verifyLicense, parseLicense, proStatus, startTrial, limitsFor, FREE_LIMITS } from '../src/pro.js';
import { optimizeDayOrder, routeKm } from '../src/optimize.js';

async function keys() {
  const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await wc.subtle.exportKey('jwk', kp.publicKey);
  const sign = async (payload) => {
    const s = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(s));
    return 'AP1.' + s + '.' + Buffer.from(sig).toString('base64url');
  };
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }, sign };
}

test('mã kích hoạt: đúng chữ ký thì nhận, sửa nội dung hoặc khoá khác thì từ chối', async () => {
  const k = await keys(), other = await keys();
  const code = await k.sign({ id: 'L1', plan: 'month', exp: '2026-11-30' });
  const ok = await verifyLicense(code, k.pub, wc.subtle);
  assert.equal(ok.ok, true); assert.equal(ok.payload.exp, '2026-11-30');
  assert.equal((await verifyLicense(code, other.pub, wc.subtle)).reason, 'signature');
  const [h, , s] = code.split('.');
  const forged = h + '.' + Buffer.from(JSON.stringify({ id: 'L1', plan: 'year', exp: '2099-01-01' })).toString('base64url') + '.' + s;
  assert.equal((await verifyLicense(forged, k.pub, wc.subtle)).ok, false);
  assert.equal((await verifyLicense('abc', k.pub, wc.subtle)).reason, 'format');
  assert.equal(parseLicense('  ' + code + '\n').payload.id, 'L1', 'chấp nhận khoảng trắng thừa khi dán');
});

test('trạng thái Pro: mã còn hạn, hết hạn, dùng thử một lần', () => {
  const now = Date.parse('2026-10-10T12:00:00');
  assert.equal(proStatus({ license: { exp: '2026-10-10' } }, now).active, true, 'còn hiệu lực hết ngày hết hạn');
  assert.equal(proStatus({ license: { exp: '2026-10-09' } }, now).kind, 'expired');
  assert.equal(proStatus({}, now).kind, 'free');
  const t = startTrial({}, now);
  assert.equal(proStatus(t, now).kind, 'trial'); assert.equal(proStatus(t, now).daysLeft, 7);
  assert.equal(proStatus(t, now + 8 * 86400000).kind, 'trial_over');
  assert.equal(startTrial(t, now), null, 'không dùng thử lần hai');
  assert.equal(limitsFor(false), FREE_LIMITS); assert.equal(limitsFor(true).attachmentsPerTrip, Infinity);
});

test('tối ưu lộ trình: ngắn hơn hoặc bằng, giữ nguyên bữa ăn, không mất điểm nào', () => {
  const P = (id, x) => ({ id, lat: 0, lng: x });
  const d = (a, b) => Math.abs(a.lng - b.lng);
  const v = (p) => ({ kind: 'visit', place: p });
  const items = [v(P('a', 0)), v(P('c', 9)), v(P('b', 3)), v(P('d', 1)), { kind: 'meal', place: P('m', 5) }, v(P('f', 20)), v(P('e', 6))];
  const out = optimizeDayOrder(items, d);
  assert.equal(out[4].kind, 'meal', 'bữa trưa đứng yên');
  assert.deepEqual(new Set(out.map((x) => x.place.id)), new Set(items.map((x) => x.place.id)));
  assert.ok(routeKm(out, d) < routeKm(items, d));
  assert.deepEqual(out.slice(5).map((x) => x.place.id), ['e', 'f']);
  // đoạn dài (> 7 điểm) dùng cách gần đúng, vẫn không tệ hơn
  const many = Array.from({ length: 10 }, (_, i) => v(P('p' + i, (i * 7) % 10)));
  assert.ok(routeKm(optimizeDayOrder(many, d), d) <= routeKm(many, d));
});
