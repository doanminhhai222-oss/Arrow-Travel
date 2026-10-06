// Đánh giá từ Google Maps qua Places API (New). Chỉ dùng khi chủ app điền khoá vào data/google.json.
// Lưu ý điều khoản Google Maps Platform: không lưu sẵn nội dung đánh giá vào file, chỉ tải trực tiếp khi mở chi tiết,
// luôn ghi nguồn Google Maps, và khoá phải giới hạn theo tên miền.
const BASE = 'https://places.googleapis.com/v1';

// Chuẩn hoá phản hồi Place Details về cùng dạng với đánh giá mẫu của app
export function normalizePlace(json) {
  const reviews = (json.reviews || []).map((r) => ({
    author: r.authorAttribution?.displayName || 'Khách Google',
    authorUrl: r.authorAttribution?.uri || '',
    rating: r.rating || 0,
    time: r.relativePublishTimeDescription || '',
    text: r.text?.text || r.originalText?.text || '',
  })).filter((r) => r.text);
  return { rating: json.rating ?? null, reviewCount: json.userRatingCount ?? reviews.length, reviews, source: 'google', mapsUrl: json.googleMapsUri || '' };
}

// Tìm địa điểm theo tên và toạ độ, rồi lấy điểm và đánh giá. Ném lỗi nếu không gọi được.
export async function fetchPlaceReviews({ apiKey, query, lat, lng, fetchFn = fetch }) {
  const search = await fetchFn(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id' },
    body: JSON.stringify({ textQuery: query, languageCode: 'vi', maxResultCount: 1, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 1500 } } }),
  });
  if (!search.ok) throw new Error('Tìm địa điểm lỗi ' + search.status);
  const id = (await search.json()).places?.[0]?.id;
  if (!id) throw new Error('Không tìm thấy địa điểm trên Google Maps');
  const res = await fetchFn(`${BASE}/places/${id}?languageCode=vi`, { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' } });
  if (!res.ok) throw new Error('Lấy đánh giá lỗi ' + res.status);
  return normalizePlace(await res.json());
}
