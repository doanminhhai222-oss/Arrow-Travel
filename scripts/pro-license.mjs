#!/usr/bin/env node
// Tạo khoá và ký mã kích hoạt ArrowPro. KHOÁ BÍ MẬT KHÔNG ĐƯỢC ĐƯA LÊN GITHUB.
//   node scripts/pro-license.mjs keygen [đường-dẫn-khoá]        -> tạo cặp khoá, in khoá công khai để dán vào data/pro.json
//   node scripts/pro-license.mjs sign <số-ngày> [ghi chú] [đường-dẫn-khoá] -> in mã kích hoạt AP1.… gửi cho khách
// Mặc định khoá bí mật nằm ở ~/.arrow-pro-private.jwk
import { webcrypto as wc } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const b64u = (b) => Buffer.from(b).toString('base64url');
const [cmd, a1, a2, a3] = process.argv.slice(2);
const keyPath = (cmd === 'keygen' ? a1 : a3) || join(homedir(), '.arrow-pro-private.jwk');

if (cmd === 'keygen') {
  if (existsSync(keyPath)) { console.error('Đã có khoá ở ' + keyPath + ', không ghi đè.'); process.exit(1); }
  const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  writeFileSync(keyPath, JSON.stringify(await wc.subtle.exportKey('jwk', kp.privateKey)), { mode: 0o600 });
  const pub = await wc.subtle.exportKey('jwk', kp.publicKey);
  console.log('Khoá bí mật: ' + keyPath + ' (giữ kín, sao lưu cẩn thận)');
  console.log('Dán vào data/pro.json mục "publicKey":\n' + JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }));
} else if (cmd === 'sign') {
  const days = Number(a1);
  if (!(days > 0)) { console.error('Cần số ngày, ví dụ: sign 30 "Nguyen Van A"'); process.exit(1); }
  const priv = JSON.parse(readFileSync(keyPath, 'utf8'));
  const key = await wc.subtle.importKey('jwk', priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const exp = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const payload = { id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), plan: days >= 365 ? 'year' : 'month', exp, ...(a2 ? { name: a2 } : {}) };
  const signed = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signed));
  console.log('AP1.' + signed + '.' + b64u(sig));
  console.log('(hết hạn ' + exp + ')');
} else {
  console.log('Cách dùng: keygen [khoá] | sign <số-ngày> [ghi chú] [khoá]');
}
