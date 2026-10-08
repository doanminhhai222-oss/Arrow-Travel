// Ngôn ngữ giao diện: tiếng Việt là gốc; tiếng Anh, Trung, Nhật, Hàn dịch theo câu gốc.
// Câu chưa có bản dịch ở ngôn ngữ đang chọn thì dùng bản tiếng Anh, chưa có nữa thì giữ tiếng Việt.
import { EN } from './i18n-en.js';
import { ZH } from './i18n-zh.js';
import { JA } from './i18n-ja.js';
import { KO } from './i18n-ko.js';

export const LANGS = { vi: 'Tiếng Việt', en: 'English', zh: '中文', ja: '日本語', ko: '한국어' };
const DICTS = { en: EN, zh: ZH, ja: JA, ko: KO };
let lang = 'vi';
export const getLang = () => lang;
export function setLang(l) { lang = LANGS[l] ? l : 'vi'; }
// Bản dịch của một câu tiếng Việt, hoặc undefined nếu đang ở tiếng Việt / chưa có bản dịch
export const lookup = (vi) => (lang === 'vi' ? undefined : (DICTS[lang][vi] || EN[vi]));
export const tr = (vi) => lookup(vi) || vi;
