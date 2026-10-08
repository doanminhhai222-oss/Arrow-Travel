// Gói ArrowPro: mã kích hoạt có chữ ký số, dùng thử, giới hạn bản miễn phí.
// Không có máy chủ: chủ app ký mã bằng khoá bí mật (scripts/pro-license.mjs), app chỉ giữ khoá công khai để kiểm tra.
// Mã hợp lệ không làm giả được nếu không có khoá bí mật; nhưng một mã vẫn có thể bị chia sẻ cho máy khác (cần máy chủ mới chặn được).

export const FREE_LIMITS = { photosPerPlace: 10, attachmentsPerTrip: 3, reelPhotos: 30 };
export const PRO_LIMITS = { photosPerPlace: Infinity, attachmentsPerTrip: Infinity, reelPhotos: 100 };
export const TRIAL_DAYS = 7;
const DAY = 86400000;

const b64u = {
  enc: (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};
export { b64u };

// Mã dạng "AP1.<payload base64url>.<chữ ký base64url>", payload = { id, plan, exp (yyyy-mm-dd), name? }
export function parseLicense(code) {
  const m = String(code || '').trim().replace(/\s+/g, '').match(/^AP1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64u.dec(m[1])));
    if (!payload || typeof payload.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.exp)) return null;
    return { payload, signed: m[1], sig: b64u.dec(m[2]) };
  } catch { return null; }
}

export async function verifyLicense(code, publicJwk, subtle = globalThis.crypto && globalThis.crypto.subtle) {
  const lic = parseLicense(code);
  if (!lic) return { ok: false, reason: 'format' };
  if (!subtle || !publicJwk) return { ok: false, reason: 'unsupported' };
  try {
    const key = await subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, lic.sig, new TextEncoder().encode(lic.signed));
    return ok ? { ok: true, payload: lic.payload } : { ok: false, reason: 'signature' };
  } catch { return { ok: false, reason: 'signature' }; }
}

// state: { license: {id, plan, exp} | null, trialUntil: ms | null }
export function proStatus(state, now = Date.now()) {
  const s = state || {};
  if (s.license && Date.parse(s.license.exp + 'T23:59:59') >= now) return { active: true, kind: 'license', until: s.license.exp, plan: s.license.plan };
  if (s.trialUntil && s.trialUntil >= now) return { active: true, kind: 'trial', until: new Date(s.trialUntil).toISOString().slice(0, 10), daysLeft: Math.ceil((s.trialUntil - now) / DAY) };
  return { active: false, kind: s.license ? 'expired' : s.trialUntil ? 'trial_over' : 'free' };
}
export const startTrial = (state, now = Date.now()) => (state && state.trialUsed ? null : { ...state, trialUsed: true, trialUntil: now + TRIAL_DAYS * DAY });
export const limitsFor = (active) => (active ? PRO_LIMITS : FREE_LIMITS);
