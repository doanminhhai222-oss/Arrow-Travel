// Tối ưu thứ tự trong ngày: giữ nguyên vị trí các bữa ăn và khoảng nghỉ, xếp lại các điểm tham quan
// giữa chúng sao cho tổng quãng đường ngắn nhất (thử mọi hoán vị khi đoạn ≤ 7 điểm, dài hơn thì láng giềng gần nhất + 2-opt).

function bestOrder(pts, before, after, dist) {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const cost = (ord) => {
    let s = before ? dist(before, ord[0]) : 0;
    for (let i = 1; i < ord.length; i++) s += dist(ord[i - 1], ord[i]);
    return s + (after ? dist(ord[ord.length - 1], after) : 0);
  };
  if (n <= 7) {
    let best = pts.slice(), bestC = cost(best);
    const a = pts.slice(), c = new Array(n).fill(0);
    let i = 0;
    while (i < n) { // thuật toán Heap: duyệt mọi hoán vị
      if (c[i] < i) {
        const j = i % 2 ? c[i] : 0; [a[j], a[i]] = [a[i], a[j]];
        const k = cost(a); if (k < bestC - 1e-9) { bestC = k; best = a.slice(); }
        c[i]++; i = 0;
      } else { c[i] = 0; i++; }
    }
    return best;
  }
  const left = pts.slice(), ord = [];
  let cur = before || left.shift();
  if (!before) ord.push(cur);
  while (left.length) { left.sort((x, y) => dist(cur, x) - dist(cur, y)); cur = left.shift(); ord.push(cur); }
  for (let improved = true; improved;) {
    improved = false;
    for (let i = 0; i < ord.length - 1; i++) for (let j = i + 1; j < ord.length; j++) {
      const t = [...ord.slice(0, i), ...ord.slice(i, j + 1).reverse(), ...ord.slice(j + 1)];
      if (cost(t) < cost(ord) - 1e-9) { ord.splice(0, ord.length, ...t); improved = true; }
    }
  }
  return ord;
}

// items: [{ kind: 'visit'|'meal'|'break', place }] ; dist(placeA, placeB) -> km
export function optimizeDayOrder(items, dist) {
  const out = items.slice(), fixed = (it) => it.kind !== 'visit' || !it.place;
  let i = 0;
  while (i < out.length) {
    if (fixed(out[i])) { i++; continue; }
    let j = i; while (j < out.length && !fixed(out[j])) j++;
    const prev = out.slice(0, i).reverse().find((x) => x.place), next = out.slice(j).find((x) => x.place);
    const seg = bestOrder(out.slice(i, j), prev, next, (a, b) => dist(a.place || a, b.place || b));
    out.splice(i, j - i, ...seg); i = j;
  }
  return out;
}
export function routeKm(items, dist) {
  const ps = items.filter((x) => x.place).map((x) => x.place);
  let s = 0; for (let i = 1; i < ps.length; i++) s += dist(ps[i - 1], ps[i]);
  return s;
}
