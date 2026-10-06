import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crc16, transferContent, vietQrPayload, bookingCode, canCharge } from '../src/payment.js';

const cfg = JSON.parse(readFileSync(new URL('../data/payment.json', import.meta.url)));

// Đọc lại chuỗi TLV để kiểm tra cấu trúc
function parse(s) { const o = []; for (let i = 0; i < s.length;) { const tag = s.slice(i, i + 2), len = +s.slice(i + 2, i + 4); o.push([tag, s.slice(i + 4, i + 4 + len)]); i += 4 + len; } return o; }

test('CRC16/CCITT-FALSE đúng vector chuẩn "123456789" = 29B1', () => assert.equal(crc16('123456789'), '29B1'));

test('payload VietQR đúng cấu trúc, số tiền, tài khoản VCB và CRC khớp', () => {
  const p = vietQrPayload({ bin: cfg.bankBin, account: cfg.accountNumber, amount: 4305000, content: 'ARROW ATABC123' });
  assert.equal(p.slice(-8, -4), '6304');
  assert.equal(crc16(p.slice(0, -4)), p.slice(-4));
  const t = Object.fromEntries(parse(p));
  assert.equal(t['00'], '01'); assert.equal(t['01'], '12'); assert.equal(t['53'], '704');
  assert.equal(t['54'], '4305000'); assert.equal(t['58'], 'VN');
  const m = Object.fromEntries(parse(t['38']));
  assert.equal(m['00'], 'A000000727'); assert.equal(m['02'], 'QRIBFTTA');
  const bank = Object.fromEntries(parse(m['01']));
  assert.equal(bank['00'], '970436'); assert.equal(bank['01'], '0731000880190');
  assert.equal(Object.fromEntries(parse(Object.fromEntries(parse(p))['62']))['08'], 'ARROW ATABC123');
});

test('không có số tiền thì là mã tĩnh (11); nội dung bị làm sạch, tối đa 25 ký tự', () => {
  assert.equal(Object.fromEntries(parse(vietQrPayload({ bin: '970436', account: '1', amount: 0 })))['01'], '11');
  assert.equal(transferContent('Đặt chỗ Đà Nẵng #12 — rất dài rất dài rất dài'), 'Dat cho Da Nang 12 rat da');
  assert.ok(transferContent('x'.repeat(60)).length <= 25);
});

test('mã đặt chỗ ngắn, in hoa, khác nhau theo thời điểm', () => {
  const a = bookingCode(1_800_000_000_000), b = bookingCode(1_800_000_001_000);
  assert.match(a, /^AT[0-9A-Z]{6}$/); assert.notEqual(a, b);
});

test('chỉ nhận tiền thật khi mode=live và dữ liệu không còn là mẫu', () => {
  assert.equal(canCharge({ mode: 'demo' }, [false, false]), false);
  assert.equal(canCharge({ mode: 'live' }, [true, false]), false);
  assert.equal(canCharge({ mode: 'live' }, [false, false]), true);
  assert.equal(canCharge(cfg, [true, true]), false); // cấu hình hiện tại: chưa được nhận tiền thật
});
