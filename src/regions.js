// Các thành phố có thể kết hợp trong một lịch trình nhiều ngày (gần nhau, đi lại được trong ngày bằng tàu, xe)
import { distanceKm } from './scheduler.js';

export const CITY_CENTER = {
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 }, 'Hội An': { lat: 15.8801, lng: 108.3380 }, 'Huế': { lat: 16.4637, lng: 107.5909 },
  'Hà Nội': { lat: 21.0285, lng: 105.8542 }, 'Ninh Bình': { lat: 20.2506, lng: 105.9745 }, 'Sa Pa': { lat: 22.3364, lng: 103.8438 },
  'Nha Trang': { lat: 12.2388, lng: 109.1967 }, 'Đà Lạt': { lat: 11.9404, lng: 108.4583 },
};
export const COMBO_GROUPS = [['Đà Nẵng', 'Hội An', 'Huế'], ['Hà Nội', 'Ninh Bình', 'Sa Pa'], ['Nha Trang', 'Đà Lạt']];

// Thành phố có thể kết hợp thêm với điểm đến chính
export const neighborsOf = (city) => (COMBO_GROUPS.find((g) => g.includes(city)) || []).filter((c) => c !== city);

// Xếp thứ tự đi: từ điểm đến chính, lần lượt tới thành phố gần nhất chưa ghé
export function orderCities(primary, others) {
  const left = others.filter((c, i) => CITY_CENTER[c] && others.indexOf(c) === i && c !== primary), out = [];
  let cur = primary;
  while (left.length) {
    left.sort((a, b) => distanceKm(CITY_CENTER[cur], CITY_CENTER[a]) - distanceKm(CITY_CENTER[cur], CITY_CENTER[b]));
    cur = left.shift(); out.push(cur);
  }
  return out;
}
