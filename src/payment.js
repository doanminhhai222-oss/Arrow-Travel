// Thanh toán chuyển khoản bằng mã VietQR (chuẩn NAPAS 247) tới tài khoản của chủ app.
// Không có cổng thanh toán và không tự xác nhận: chủ app đối chiếu giao dịch rồi mới xác nhận vé và phòng.

const tlv = (tag, value) => tag + String(value.length).padStart(2, '0') + value;

// CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) theo chuẩn EMVCo
export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nội dung chuyển khoản: không dấu, chỉ chữ số, chữ cái, khoảng trắng, tối đa 25 ký tự
export function transferContent(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 25).trim();
}

export function vietQrPayload({ bin, account, amount, content }) {
  const bank = tlv('00', bin) + tlv('01', account);
  const merchant = tlv('00', 'A000000727') + tlv('01', bank) + tlv('02', 'QRIBFTTA'); // QRIBFTTA: chuyển nhanh tới số tài khoản
  let p = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('38', merchant) + tlv('53', '704');
  if (amount) p += tlv('54', String(Math.round(amount)));
  p += tlv('58', 'VN');
  if (content) p += tlv('62', tlv('08', transferContent(content)));
  p += '6304';
  return p + crc16(p);
}

// Mã đặt chỗ ngắn để ghi vào nội dung chuyển khoản và đối chiếu
export function bookingCode(now = Date.now()) {
  return 'AT' + now.toString(36).toUpperCase().slice(-6);
}

// Chỉ cho nhận tiền thật khi chủ app bật mode 'live' VÀ dữ liệu chuyến bay, khách sạn không còn là dữ liệu mẫu.
export function canCharge(cfg, samples) {
  return cfg.mode === 'live' && samples.every((s) => s === false);
}
