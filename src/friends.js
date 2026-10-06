// Tìm bạn đồng hành có lịch trình trùng. Dữ liệu người dùng là MẪU: app chưa có máy chủ nên chưa có người dùng thật.
import { addDays, daysBetween } from './scheduler.js';

const overlapDays = (a1, a2, b1, b2) => {
  const s = a1 > b1 ? a1 : b1, e = a2 < b2 ? a2 : b2;
  return e < s ? 0 : daysBetween(s, e);
};

export function matchTravelers(trip, travelers, today) {
  const styles = trip.styles || (trip.style ? [trip.style] : []);
  return travelers.map((t) => {
    const start = addDays(today, t.startOffset), end = addDays(start, t.nights);
    const overlap = overlapDays(trip.startDate, trip.endDate, start, end);
    const sharedStyles = t.styles.filter((s) => styles.includes(s));
    const sameAudience = t.audience === trip.audience, sameBudget = t.budget === trip.budget;
    const score = overlap * 3 + (sameAudience ? 2 : 0) + sharedStyles.length + (sameBudget ? 1 : 0);
    return { ...t, start, end, overlap, sharedStyles, sameAudience, sameBudget, score };
  }).sort((a, b) => b.score - a.score);
}
