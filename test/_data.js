// Đọc dữ liệu địa điểm và khách sạn đã tách theo điểm đến (data/places/<slug>.json, data/hotels/<slug>.json), ghép lại như app.
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(new URL('../data/' + p, import.meta.url)));
const dests = read('destinations.json').destinations;
export const loadData = () => ({ places: dests.flatMap((d) => read(`places/${d.slug}.json`).places) });
export const loadOptions = () => ({ ...read('travel-options.json'), hotels: dests.flatMap((d) => read(`hotels/${d.slug}.json`).hotels) });
export const destinations = dests;
