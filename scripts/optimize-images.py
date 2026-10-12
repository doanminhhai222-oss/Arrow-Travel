#!/usr/bin/env python3
"""Tạo ảnh WebP cho app từ ảnh gốc trong assets-src/images/ (JPEG hoặc PNG):
  web/images/<tên>.webp     cạnh dài tối đa 800 px, dùng cho ảnh lớn (hero, chi tiết địa điểm)
  web/images/<tên>-s.webp   cạnh dài tối đa 400 px, dùng cho thẻ nhỏ và ảnh nền thẻ (tải nhanh hơn trên điện thoại)
Chỉ làm lại ảnh nào gốc mới hơn bản WebP. Thêm ảnh mới: bỏ ảnh gốc vào assets-src/images/ rồi chạy
  python3 scripts/optimize-images.py        (cần Pillow có WebP)
Sau đó chạy python3 scripts/apply-photos.py nếu là ảnh địa điểm.
Lưu ý: dùng Pillow (pip install pillow) vì ImageMagick ở một số máy bỏ qua mức chất lượng khi ghi WebP."""
import pathlib
from PIL import Image, ImageOps
root = pathlib.Path(__file__).resolve().parent.parent
src, out = root / "assets-src" / "images", root / "web" / "images"
SIZES = (("", 800, 60), ("-s", 400, 55))
done = skipped = 0
before = after = 0
for f in sorted(list(src.glob("*.jpg")) + list(src.glob("*.jpeg")) + list(src.glob("*.png"))):
    for suffix, side, q in SIZES:
        dst = out / f"{f.stem}{suffix}.webp"
        before += f.stat().st_size if suffix == "" else 0
        if dst.exists() and dst.stat().st_mtime >= f.stat().st_mtime:
            skipped += 1; after += dst.stat().st_size if suffix == "" else 0; continue
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im.thumbnail((side, side), Image.LANCZOS)  # chỉ thu nhỏ, không phóng to
        im.save(dst, "WEBP", quality=q, method=6)
        done += 1; after += dst.stat().st_size if suffix == "" else 0
print(f"đã tạo {done} ảnh, bỏ qua {skipped} (còn mới). Ảnh lớn: {before/1048576:.1f} MB (gốc) -> {after/1048576:.1f} MB (WebP)")
