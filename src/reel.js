// Video kỷ niệm: dựng danh sách cảnh (mở đầu, từng ảnh, kết) và bản nhạc nền tự soạn. Hàm thuần, không đụng tới trình duyệt.

export const REEL_W = 720, REEL_H = 1280; // video dọc 9:16 hợp đăng story, reels
export const FADE = 0.6; // giây chuyển cảnh

const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

// entries: [{ label, items: [{ p: {name}, d: {rating, text}, urls: [] }] }]
export function planReel(entries, info, { perPhoto = 3, maxPhotos = 30, titleSec = 3, endSec = 3 } = {}) {
  const shots = [];
  entries.forEach((g) => g.items.forEach((x) => x.urls.slice(0, 4).forEach((url, k) => shots.push({ url, day: g.label, name: x.p.name, rating: x.d.rating || 0, text: k === 0 ? clip(x.d.text, 90) : '' }))));
  // quá nhiều ảnh: lấy rải đều cả hành trình, không chỉ những ảnh đầu
  const pick = shots.length > maxPhotos ? Array.from({ length: maxPhotos }, (_, i) => shots[Math.round((i * (shots.length - 1)) / (maxPhotos - 1))]) : shots;
  const places = new Set(pick.map((s) => s.name)).size;
  const scenes = [];
  let t = 0;
  const push = (sc, len) => { scenes.push({ ...sc, start: t, dur: len }); t += len; };
  push({ kind: 'title', title: info.title || 'Hành trình của tôi', sub: info.sub || '', url: pick[0] ? pick[0].url : null }, titleSec);
  pick.forEach((s) => push({ kind: 'photo', ...s }, perPhoto));
  push({ kind: 'end', title: info.title || '', stats: pick.length + ' khoảnh khắc · ' + places + ' nơi đã ghé' }, endSec);
  return { scenes, duration: t, photos: pick.length };
}

// Cảnh đang chiếu tại thời điểm t và độ mờ (0..1) để chuyển cảnh mượt
export function sceneAt(plan, t) {
  const { scenes } = plan;
  let i = scenes.findIndex((s) => t < s.start + s.dur);
  if (i < 0) i = scenes.length - 1;
  const s = scenes[i], local = t - s.start;
  const next = i + 1 < scenes.length && local > s.dur - FADE ? scenes[i + 1] : null;
  return { i, scene: s, progress: Math.min(1, Math.max(0, local / s.dur)), next, mix: next ? (local - (s.dur - FADE)) / FADE : 0 };
}

export const starsLine = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

// ---- Nhạc nền tự soạn (không bản quyền): hợp âm + rải nốt + trống nhẹ ----
export const TRACKS = {
  nhe_nhang: { label: 'Nhẹ nhàng', bpm: 78, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], wave: 'triangle', drums: false },
  soi_dong: { label: 'Sôi động', bpm: 112, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], wave: 'square', drums: true },
  hoai_niem: { label: 'Hoài niệm', bpm: 68, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], wave: 'sine', drums: false },
};
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Danh sách nốt cho cả bài: { t, len, hz, vol, kind: 'pad'|'pluck'|'bass'|'kick'|'hat' }
export function trackNotes(id, seconds) {
  const tr = TRACKS[id]; if (!tr) return [];
  const beat = 60 / tr.bpm, bar = beat * 4, notes = [];
  for (let b = 0; b * bar < seconds; b++) {
    const ch = tr.chords[b % tr.chords.length], t0 = b * bar;
    ch.forEach((m) => notes.push({ t: t0, len: bar, hz: midiHz(m - 12), vol: 0.05, kind: 'pad' }));
    notes.push({ t: t0, len: beat * 2, hz: midiHz(ch[0] - 24), vol: 0.12, kind: 'bass' }, { t: t0 + beat * 2, len: beat * 2, hz: midiHz(ch[0] - 24), vol: 0.1, kind: 'bass' });
    // rải nốt 8 phần, lên rồi xuống
    const arp = [...ch, ch[0] + 12, ...ch.slice(1).reverse()];
    for (let k = 0; k < 8; k++) notes.push({ t: t0 + (k * beat) / 2, len: beat / 2, hz: midiHz(arp[k % arp.length] + 12), vol: 0.07, kind: 'pluck' });
    if (tr.drums) for (let k = 0; k < 4; k++) { notes.push({ t: t0 + k * beat, len: 0.2, hz: 55, vol: 0.35, kind: 'kick' }); notes.push({ t: t0 + k * beat + beat / 2, len: 0.05, hz: 0, vol: 0.05, kind: 'hat' }); }
  }
  return notes.filter((n) => n.t < seconds);
}
