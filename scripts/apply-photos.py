#!/usr/bin/env python3
"""Gắn ảnh địa điểm (web/images/<id>.jpg) và thông tin nguồn từ data/photo-credits.json vào data/da-nang.json,
rồi viết web/images/CREDITS.md. Chạy lại sau scripts/enrich-places.py nếu có chạy lại script đó.
Chạy: python3 scripts/apply-photos.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
credits = json.loads((root / "data" / "photo-credits.json").read_text(encoding="utf-8"))
path = root / "data" / "da-nang.json"
data = json.loads(path.read_text(encoding="utf-8"))
places = data["places"] if isinstance(data, dict) and "places" in data else data
lines = ["# Nguồn ảnh", "", "Ảnh lấy từ Wikimedia Commons theo giấy phép ghi bên dưới (CC BY / CC BY-SA bắt buộc ghi tác giả, app hiện dòng này dưới ảnh). Ảnh `my-khe.jpg` do chủ dự án cung cấp.", ""]
for p in places:
    c = credits.get(p["id"])
    if not c or not (root / "web" / "images" / f"{p['id']}.jpg").exists(): continue
    p["image"] = f"images/{p['id']}.jpg"
    p["imageAlt"] = p.get("imageAlt") or p["name"]
    p["imageCredit"] = f"Ảnh: {c['author']} · {c['license']} · Wikimedia Commons"
    lines.append(f"- **{p['name']}** (`{p['id']}.jpg`): {c['author']}, {c['license']}, [{c['file']}]({c['page']})")
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(root / "web" / "images" / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("đã gắn", len(lines) - 4, "ảnh")
