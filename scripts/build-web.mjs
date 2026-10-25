// Gộp và nén mã chạy trên web: web/app.js và các module nó nhập (src/*.js, web/photos.js, web/reel.js) thành một tệp web/app.min.js,
// gộp và nén CSS thành web/style.min.css. Chạy: npm run build:web   (npm start tự chạy bước này)
// Thêm --check: không ghi, báo lỗi nếu tệp nén đang cũ so với mã nguồn (dùng trong CI).
import { build, transform } from 'esbuild';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const common = { absWorkingDir: root, bundle: true, minify: true, legalComments: 'none', write: false, logLevel: 'warning' };

const js = await build({ ...common, entryPoints: ['web/app.js'], outfile: 'web/app.min.js', format: 'esm', target: 'es2022', charset: 'utf8' });
// fonts.css (phông tự lưu), style.css và detail.css gộp thành một tệp; tệp phông .woff2 giữ nguyên đường dẫn web/fonts/
const css = await build({ ...common, external: ['*.woff2'], stdin: { contents: readFileSync(join(root, 'web/fonts.css'), 'utf8') + '\n' + readFileSync(join(root, 'web/style.css'), 'utf8') + '\n' + readFileSync(join(root, 'web/detail.css'), 'utf8'), loader: 'css', resolveDir: join(root, 'web') }, outfile: 'web/style.min.css' });

// Thư viện tạo mã QR của bên thứ ba: nén, giữ nguyên dòng giấy phép ở đầu tệp
const qr = await transform(readFileSync(join(root, 'vendor/qrcode-generator.js'), 'utf8'), { minify: true, legalComments: 'inline', charset: 'utf8' });
const outputs = [['web/app.min.js', js.outputFiles[0].text], ['web/style.min.css', css.outputFiles[0].text], ['web/qrcode.min.js', qr.code]];
let stale = false;
for (const [file, text] of outputs) {
  const path = join(root, file), old = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (check) { if (old !== text) { console.error(`${file} đang cũ, hãy chạy npm run build:web rồi commit`); stale = true; } continue; }
  (await import('node:fs')).writeFileSync(path, text);
  console.log(`${file}: ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`);
}
if (stale) process.exit(1);
if (check) console.log('Tệp nén đang khớp với mã nguồn.');
