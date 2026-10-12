#!/usr/bin/env python3
"""Gắn ảnh địa điểm (web/images/<id>.webp) và thông tin nguồn từ data/photo-credits.json vào data/places/<điểm đến>.json,
rồi viết web/images/CREDITS.md. Chạy lại sau scripts/enrich-places.py nếu có chạy lại script đó.
Chạy: python3 scripts/apply-photos.py"""
import json, pathlib
from _data import load_data, save_data, load_options, save_options
root = pathlib.Path(__file__).resolve().parent.parent
credits = json.loads((root / "data" / "photo-credits.json").read_text(encoding="utf-8"))
data = load_data()
places = data["places"] if isinstance(data, dict) and "places" in data else data
lines = ["# Nguồn ảnh", "", "Ảnh lấy từ Wikimedia Commons theo giấy phép ghi bên dưới, hoặc do chủ dự án gửi (ghi rõ từng ảnh) (CC BY / CC BY-SA bắt buộc ghi tác giả, app hiện dòng này dưới ảnh). Ảnh `my-khe.webp` do chủ dự án cung cấp.", ""]
for p in places:
    c = credits.get(p["id"])
    if not c or not (root / "web" / "images" / f"{p['id']}.webp").exists(): continue
    p["image"] = f"images/{p['id']}.webp"
    p["imageAlt"] = p.get("imageAlt") or p["name"]
    if "note" in c:  # ảnh do chủ dự án gửi, hoặc ảnh minh hoạ có ghi chú riêng
        p["imageCredit"] = c["note"]
        lines.append(f"- **{p['name']}** (`{p['id']}.webp`): {c['note']}" + (f", [{c['file']}]({c['page']})" if c.get("page") else ""))
        continue
    p["imageCredit"] = f"Ảnh: {c['author']} · {c['license']} · Wikimedia Commons"
    lines.append(f"- **{p['name']}** (`{p['id']}.webp`): {c['author']}, {c['license']}, [{c['file']}]({c['page']})")
save_data(data)
(root / "web" / "images" / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("đã gắn", len(lines) - 4, "ảnh")
