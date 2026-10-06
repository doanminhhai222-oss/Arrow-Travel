// Ngôn ngữ giao diện: tiếng Việt là gốc, tiếng Anh dịch theo câu gốc. Câu chưa có bản dịch giữ nguyên tiếng Việt.
import { EN } from './i18n-en.js';

let lang = 'vi';
export const getLang = () => lang;
export function setLang(l) { lang = l === 'en' ? 'en' : 'vi'; }
export const tr = (vi) => (lang === 'en' && EN[vi]) || vi;
