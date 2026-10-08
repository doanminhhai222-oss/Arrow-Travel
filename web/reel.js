// Video kỷ niệm trên trình duyệt: vẽ từng khung hình lên canvas, phát nhạc bằng Web Audio,
// ghi lại bằng MediaRecorder. Không tải gì lên máy chủ.
import { REEL_W, REEL_H, sceneAt, starsLine, TRACKS, trackNotes } from '../src/reel.js';

const REEL_FONT = "'Be Vietnam Pro', system-ui, sans-serif";

export function loadReelImages(urls) {
  return Promise.all(urls.map((u) => new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u;
  })));
}

function coverDraw(ctx, im, zoom, panX, panY) {
  const s = Math.max(REEL_W / im.width, REEL_H / im.height) * zoom;
  const w = im.width * s, h = im.height * s;
  ctx.drawImage(im, (REEL_W - w) / 2 + panX * (w - REEL_W) / 2, (REEL_H - h) / 2 + panY * (h - REEL_H) / 2, w, h);
}

function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text).split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function shade(ctx, from, to, a0, a1) {
  const g = ctx.createLinearGradient(0, from, 0, to);
  g.addColorStop(0, 'rgba(0,0,0,' + a0 + ')'); g.addColorStop(1, 'rgba(0,0,0,' + a1 + ')');
  ctx.fillStyle = g; ctx.fillRect(0, from, REEL_W, to - from);
}

function drawScene(ctx, sc, progress, imgs, accent) {
  const im = sc.url ? imgs.get(sc.url) : null;
  ctx.fillStyle = '#0b1b1a'; ctx.fillRect(0, 0, REEL_W, REEL_H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (sc.kind === 'end') {
    const g = ctx.createLinearGradient(0, 0, REEL_W, REEL_H);
    g.addColorStop(0, accent); g.addColorStop(1, '#0b1b1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, REEL_W, REEL_H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '700 64px ' + REEL_FONT; ctx.fillText('Arrow Travel', REEL_W / 2, REEL_H / 2 - 40);
    ctx.font = '400 32px ' + REEL_FONT; ctx.fillText('Chỉ một mũi tên, đi hết cả hành trình.', REEL_W / 2, REEL_H / 2 + 20);
    ctx.font = '600 30px ' + REEL_FONT; ctx.globalAlpha = 0.9; ctx.fillText(sc.stats, REEL_W / 2, REEL_H / 2 + 110); ctx.globalAlpha = 1;
    return;
  }
  if (im) coverDraw(ctx, im, 1.04 + 0.1 * progress, sc.kind === 'title' ? 0 : (Math.round(sc.start / (sc.dur || 1)) % 2 ? -1 : 1) * (progress - 0.5) * 0.6, 0);
  if (sc.kind === 'title') {
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, REEL_W, REEL_H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '600 30px ' + REEL_FONT; ctx.globalAlpha = 0.9; ctx.fillText('KHOẢNH KHẮC', REEL_W / 2, REEL_H / 2 - 90); ctx.globalAlpha = 1;
    ctx.font = '800 64px ' + REEL_FONT;
    wrapLines(ctx, sc.title, REEL_W - 120, 3).forEach((l, i) => ctx.fillText(l, REEL_W / 2, REEL_H / 2 + i * 76));
    ctx.font = '400 32px ' + REEL_FONT; ctx.fillText(sc.sub, REEL_W / 2, REEL_H / 2 + 200);
    return;
  }
  shade(ctx, REEL_H * 0.5, REEL_H, 0, 0.82); shade(ctx, 0, 180, 0.45, 0);
  ctx.fillStyle = '#fff'; ctx.font = '600 28px ' + REEL_FONT; ctx.fillText(sc.day, 48, 90);
  let y = REEL_H - 120;
  ctx.font = '400 32px ' + REEL_FONT;
  const lines = sc.text ? wrapLines(ctx, '“' + sc.text + '”', REEL_W - 96, 3) : [];
  y -= lines.length * 44;
  ctx.font = '800 54px ' + REEL_FONT; ctx.fillText(sc.name, 48, y - (sc.rating ? 64 : 0), REEL_W - 96);
  if (sc.rating) { ctx.fillStyle = '#FFC93C'; ctx.font = '400 42px ' + REEL_FONT; ctx.fillText(starsLine(sc.rating), 48, y - 6); }
  ctx.fillStyle = '#fff'; ctx.font = '400 32px ' + REEL_FONT;
  lines.forEach((l, i) => ctx.fillText(l, 48, y + 52 + i * 44));
}

export function drawReelFrame(ctx, plan, t, imgs, accent) {
  const f = sceneAt(plan, t);
  drawScene(ctx, f.scene, f.progress, imgs, accent);
  if (f.next) { ctx.globalAlpha = f.mix; drawScene(ctx, f.next, 0, imgs, accent); ctx.globalAlpha = 1; }
}

// ---- Nhạc ----
let noiseBuf = null;
function noise(ac) {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// music: id trong TRACKS, hoặc AudioBuffer (nhạc người dùng chọn), hoặc null (không nhạc)
export function startReelMusic(ac, dest, music, at, duration) {
  const master = ac.createGain(), nodes = [];
  master.connect(dest);
  master.gain.setValueAtTime(0, at); master.gain.linearRampToValueAtTime(1, at + 1);
  master.gain.setValueAtTime(1, at + Math.max(1, duration - 2)); master.gain.linearRampToValueAtTime(0, at + duration);
  if (music && typeof music === 'object') {
    const src = ac.createBufferSource(); src.buffer = music; src.loop = music.duration < duration;
    src.connect(master); src.start(at); src.stop(at + duration); nodes.push(src);
  } else if (TRACKS[music]) {
    const tr = TRACKS[music], lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(master);
    for (const n of trackNotes(music, duration)) {
      const t0 = at + n.t, g = ac.createGain(); g.connect(n.kind === 'hat' ? master : lp);
      if (n.kind === 'hat') {
        const s = ac.createBufferSource(), hp = ac.createBiquadFilter(); s.buffer = noise(ac); hp.type = 'highpass'; hp.frequency.value = 7000;
        s.connect(hp); hp.connect(g); g.gain.setValueAtTime(n.vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + n.len);
        s.start(t0); s.stop(t0 + n.len + 0.02); nodes.push(s); continue;
      }
      const o = ac.createOscillator();
      o.type = n.kind === 'pluck' ? tr.wave : 'sine';
      if (n.kind === 'kick') { o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + n.len); } else o.frequency.value = n.hz;
      const atk = n.kind === 'pad' ? 0.4 : 0.01, end = t0 + n.len;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(n.kind === 'pluck' && tr.wave === 'square' ? n.vol * 0.5 : n.vol, t0 + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, n.kind === 'pad' ? end : t0 + Math.min(n.len, n.kind === 'pluck' ? 0.35 : n.len));
      o.connect(g); o.start(t0); o.stop(end + 0.05); nodes.push(o);
    }
  }
  return () => { nodes.forEach((x) => { try { x.stop(); } catch (e) { /* đã dừng */ } }); try { master.disconnect(); } catch (e) { /* bỏ qua */ } };
}

// ---- Phát xem trước ----
export function createReelPlayer(canvas, getState, onTick) {
  const ctx = canvas.getContext('2d');
  let ac = null, raf = 0, stopMusic = null, t0 = 0, playing = false, offset = 0;
  const st = () => getState();
  const now = () => (ac ? ac.currentTime : performance.now() / 1000);
  function frame() {
    const s = st(), t = Math.min(s.plan.duration, offset + (playing ? now() - t0 : 0));
    drawReelFrame(ctx, s.plan, t, s.imgs, s.accent); onTick(t);
    if (playing && t >= s.plan.duration) { pause(); offset = 0; onTick(s.plan.duration); return; }
    if (playing) raf = requestAnimationFrame(frame);
  }
  function play() {
    const s = st(); if (playing) return;
    if (offset >= s.plan.duration) offset = 0;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    t0 = ac.currentTime + 0.05; playing = true;
    // nhạc chạy từ đầu bài cho đơn giản; xem lại từ giữa thì nhạc bắt đầu lại
    stopMusic = startReelMusic(ac, ac.destination, s.music, t0, s.plan.duration - offset);
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    if (!playing) return;
    offset = Math.min(st().plan.duration, offset + now() - t0); playing = false;
    cancelAnimationFrame(raf); if (stopMusic) stopMusic(); stopMusic = null;
  }
  function reset() { pause(); offset = 0; frame(); }
  function destroy() { pause(); if (ac) ac.close().catch(() => {}); ac = null; }
  return { play, pause, reset, destroy, redraw: frame, isPlaying: () => playing };
}

// ---- Xuất video (ghi theo thời gian thực) ----
export function reelMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
}
export function exportReel(state, onProgress) {
  return new Promise((resolve, reject) => {
    const mime = reelMime();
    if (!mime) { reject(new Error('Trình duyệt này chưa hỗ trợ tạo video. Hãy thử Chrome, Edge hoặc Safari mới.')); return; }
    const cv = document.createElement('canvas'); cv.width = REEL_W; cv.height = REEL_H;
    const ctx = cv.getContext('2d'), ac = new (window.AudioContext || window.webkitAudioContext)(), dest = ac.createMediaStreamDestination();
    const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 }), chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = (e) => reject(e.error || new Error('Lỗi khi ghi video'));
    rec.onstop = () => { ac.close().catch(() => {}); resolve(new Blob(chunks, { type: mime.split(';')[0] })); };
    const D = state.plan.duration;
    drawReelFrame(ctx, state.plan, 0, state.imgs, state.accent);
    ac.resume().then(() => {
      const start = ac.currentTime + 0.1, stop = startReelMusic(ac, dest, state.music, start, D);
      rec.start(500);
      let last = -1;
      const tick = () => {
        const t = ac.currentTime - start;
        if (t >= D) { stop(); drawReelFrame(ctx, state.plan, D - 0.01, state.imgs, state.accent); setTimeout(() => rec.stop(), 200); onProgress(1); return; }
        drawReelFrame(ctx, state.plan, Math.max(0, t), state.imgs, state.accent);
        const p = Math.floor((Math.max(0, t) / D) * 100); if (p !== last) { last = p; onProgress(p / 100); }
        // khi tab ẩn requestAnimationFrame ngừng chạy, dùng setTimeout làm dự phòng
        if (document.hidden) setTimeout(tick, 33); else requestAnimationFrame(tick);
      };
      tick();
    }, reject);
  });
}
