import { buildItinerary } from '../src/scheduler.js';

const $ = (id) => document.getElementById(id);
const [data, rules] = await Promise.all([
  fetch('../data/da-nang.json').then((r) => r.json()),
  fetch('../data/rules.json').then((r) => r.json()),
]);

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
$('startDate').value = iso(new Date(today.getTime() + 7 * 864e5));
$('endDate').value = iso(new Date(today.getTime() + 9 * 864e5));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const vnd = (n) => (n ? n.toLocaleString('vi-VN') + ' đ' : 'Miễn phí');
const fmtDur = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m}p`);

function render(plan) {
  const out = [];
  if (plan.warnings.length) out.push(`<div class="warn">${plan.warnings.map(esc).join('<br>')}</div>`);
  for (const d of plan.days) {
    const rows = d.items.map((it) => {
      const travel = it.travel ? `<div class="travel">🚗 ${it.travel.km} km · ${it.travel.min}p</div>` : '';
      const name = it.place ? esc(it.place.name) : esc(it.note);
      const sub = it.place ? `${fmtDur(it.duration)} · ${vnd(it.place.price)}${it.note && it.kind === 'meal' ? ' · ' + esc(it.note) : ''}` : fmtDur(it.duration);
      return `${travel}<div class="item"><div class="t">${it.time}</div><div><div class="n">${name}</div><div class="s">${sub}</div></div></div>`;
    }).join('');
    out.push(`<section class="day"><h2>Ngày ${d.dayIndex} · ${d.date}</h2><div class="meta">${d.placeCount} điểm · ${d.totalKm} km</div>${rows}</section>`);
  }
  $('result').innerHTML = out.join('');
}

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const trip = {
    destination: $('destination').value, startDate: $('startDate').value, endDate: $('endDate').value,
    people: +$('people').value, budget: $('budget').value, audience: $('audience').value,
    hasKids: $('hasKids').checked, hasElderly: $('hasElderly').checked, style: $('style').value,
  };
  if (trip.endDate < trip.startDate) { $('result').innerHTML = '<div class="warn">Ngày về phải sau ngày đi.</div>'; return; }
  render(buildItinerary(trip, data, rules));
  $('result').scrollIntoView({ behavior: 'smooth' });
});
