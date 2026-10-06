// Chi tiết khách sạn: ảnh, loại phòng, đánh giá (mẫu hoặc từ Google Maps), liên kết Google Maps.
import { sceneSvg } from './detail.js';
import { priceStay } from './search.js';
import { money } from './format.js';

const hEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hStars = (r) => { const n = Math.max(0, Math.min(5, Math.round(r))); return '★'.repeat(n) + '☆'.repeat(5 - n); };
const PHOTO_LABEL = { lobby: 'Sảnh', room: 'Phòng', pool: 'Hồ bơi', beach: 'Biển', food: 'Bữa sáng' };

// hotel: kết quả searchHotels (đã tính giá theo ngày). google: kết quả normalizePlace hoặc null (dùng đánh giá mẫu).
export function hotelDetailHtml(hotel, { selected = false, nights, google = null, loading = false, error = '' } = {}) {
  const real = !!(google && google.source === 'google');
  const rating = real ? google.rating : hotel.rating, count = real ? google.reviewCount : hotel.reviewCount;
  const reviews = real ? google.reviews : hotel.reviews || [];
  const mapsUrl = (real && google.mapsUrl) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.googleQuery || hotel.name)}%20${hotel.lat},${hotel.lng}`;
  let h = `<div class="pd hd"><div class="hd-photos" role="group" aria-label="Ảnh minh hoạ">${(hotel.photos || ['lobby']).map((p) => `<figure>${sceneSvg({ scene: p === 'beach' ? 'beach' : p, name: hotel.name })}<figcaption>${PHOTO_LABEL[p] || ''}</figcaption></figure>`).join('')}</div>`;
  h += `<p class="hint">Ảnh minh hoạ, chưa phải ảnh thật của khách sạn.</p><h2>${hEsc(hotel.name)}</h2>`;
  h += `<div class="pd-tags"><span class="tag">${hotel.stars} sao</span><span class="tag">${hEsc(hotel.area)}</span>${(hotel.amenities || []).map((a) => `<span class="tag">${hEsc(a)}</span>`).join('')}</div>`;
  if (hotel.description) h += `<p style="margin-top:8px">${hEsc(hotel.description)}</p>`;
  h += `<dl class="pd-facts"><div><dt>Nhận phòng</dt><dd>từ ${hEsc(hotel.checkInTime)}</dd></div><div><dt>Trả phòng</dt><dd>trước ${hEsc(hotel.checkOutTime)}</dd></div><div><dt>Chính sách huỷ</dt><dd style="font-weight:400;font-size:13px">${hEsc(hotel.cancel)}</dd></div></dl>`;

  h += `<h3>Loại phòng</h3><div class="opts">${hotel.roomTypes.map((r) => {
    const p = priceStay(hotel, r, { checkIn: hotel.checkIn, nights, people: hotel.people });
    const on = r.id === hotel.room.id;
    return `<button type="button" class="opt" data-room="${hEsc(r.id)}" aria-pressed="${on}"><b>${hEsc(r.name)}</b><span>${r.sizeM2} m² · ${hEsc(r.beds)} · ${hEsc(r.view)}</span><span>Tối đa ${r.sleeps} người/phòng · ${r.perks.map(hEsc).join(' · ')}</span>` +
      (p.available ? `<span class="pr">${money(p.total)} cả kỳ nghỉ · ${p.rooms} phòng × ${nights} đêm</span>` : `<span class="late">${hEsc(p.reason)}</span>`) + `</button>`;
  }).join('')}</div>`;

  h += `<h3>Đánh giá</h3>`;
  h += `<p class="pd-rate"><span class="pd-stars" aria-hidden="true">${hStars(rating || 0)}</span> <b>${rating != null ? Number(rating).toFixed(1) : '–'}</b> · ${count} lượt</p>`;
  h += real ? `<p class="hint">Nguồn: Google Maps. Dữ liệu © Google.</p>` : `<p class="hint late">${hEsc(error) || 'Đánh giá mẫu, chưa lấy từ Google Maps.'}${loading ? ' Đang tải đánh giá từ Google Maps…' : ''}</p>`;
  h += reviews.length ? reviews.map((r) => `<blockquote><b>${r.authorUrl ? `<a href="${hEsc(r.authorUrl)}" target="_blank" rel="noopener">${hEsc(r.author)}</a>` : hEsc(r.author)}</b> · <span class="pd-stars">${hStars(r.rating)}</span> · ${hEsc(r.time)}<br>${hEsc(r.text)}</blockquote>`).join('') : '<p class="hint">Chưa có đánh giá.</p>';
  h += `<a class="pd-link" href="${hEsc(mapsUrl)}" target="_blank" rel="noopener">Xem ảnh và đánh giá thật trên Google Maps</a>`;
  h += `<button class="go" type="button" data-hotelpick="${hEsc(hotel.id)}" style="margin-top:12px"${hotel.available ? '' : ' disabled'}>${hotel.available ? (selected ? 'Đang chọn khách sạn này' : 'Chọn khách sạn này') : hEsc(hotel.reason || 'Hết phòng')}</button></div>`;
  return h;
}
