#!/usr/bin/env python3
"""Kiểm kê toàn bộ ảnh trong app: nguồn, tác giả, giấy phép, và trạng thái quyền sử dụng thương mại.
Ghi docs/KIEM-KE-ANH.md (đọc) và docs/kiem-ke-anh.csv (mở bằng Excel để điền cột còn trống).
Phân loại:
  wikimedia  Ảnh Wikimedia Commons có giấy phép CC0, CC BY, CC BY-SA hoặc miền công cộng: dùng thương mại được nếu ghi nguồn đúng điều kiện
  chu-du-an  Ảnh do chủ dự án gửi: CHƯA xác nhận quyền thương mại, cần chủ dự án điền nguồn và giấy phép
  chua-ro    Có tệp ảnh nhưng không có thông tin nguồn
Chạy: python3 scripts/photo-inventory.py"""
import csv, glob, json, pathlib, collections, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _data import load_data
root = pathlib.Path(__file__).resolve().parent.parent
credits = json.loads((root / "data" / "photo-credits.json").read_text(encoding="utf-8"))
places = {p["id"]: p for p in load_data()["places"]}
src = sorted(p.stem for p in (root / "assets-src" / "images").glob("*.jpg"))
used_by_place = {pid: p for pid, p in places.items() if p.get("image")}
rows = []
for name in src:
    p = places.get(name)
    c = credits.get(name)
    kind = "địa điểm" if p else "giao diện"
    where = f"{p['name']} ({p['city']})" if p else {"splash": "màn hình mở app", "my-khe": "ảnh đầu trang Đà Nẵng"}.get(name, "ảnh nền thẻ trong app" if name.startswith(("aud-", "book-")) else "")
    if c and "file" in c:
        note = c.get("note", "")
        author, lic = c.get("author"), c.get("license")
        if not author:  # mục cũ chỉ có ghi chú dạng "...: tác giả · giấy phép · Wikimedia Commons" hoặc "..., tác giả, giấy phép, Wikimedia Commons"
            parts = [x.strip() for x in note.replace(" · ", ", ").rsplit(", ", 3)] if note else []
            author, lic = (parts[-3].split(": ")[-1], parts[-2]) if len(parts) >= 3 else ("", "")
        cat, link = "wikimedia", c["page"]
        illus = "có" if "minh hoạ" in note else "không"
        status = "Dùng được, giữ ghi nguồn" + (" (ảnh minh hoạ, đã ghi rõ trong app)" if illus == "có" else "")
    elif c:
        cat, author, lic, link, illus = "chu-du-an", "", "", "", "có" if "minh hoạ" in c.get("note", "") else "không"
        note = c["note"]; status = "CẦN XÁC NHẬN: ai chụp, có quyền dùng thương mại không"
    else:
        cat, author, lic, link, illus, note = "chua-ro", "", "", "", "", ""
        status = "CẦN XÁC NHẬN: không có thông tin nguồn" if name != "my-khe" else "CẦN XÁC NHẬN: ảnh chủ dự án gửi"
        if name in ("my-khe",): cat = "chu-du-an"
        elif name.startswith(("aud-", "book-", "splash")): cat = "chu-du-an"
    rows.append(dict(id=name, loai=kind, vi_tri=where, nhom=cat, tac_gia=author, giay_phep=lic, lien_ket=link, minh_hoa=illus, ghi_chu=note, trang_thai=status,
                     chu_du_an_xac_nhan_quyen=""))
# địa điểm có ảnh trong dữ liệu nhưng thiếu tệp gốc
orphan = [pid for pid in used_by_place if pid not in src]
with open(root / "docs" / "kiem-ke-anh.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
cnt = collections.Counter(r["nhom"] for r in rows)
need = [r for r in rows if r["trang_thai"].startswith("CẦN")]
no_img = [p for p in places.values() if not p.get("image")]
sample = [p for p in no_img if p.get("sample")]
by_city = collections.defaultdict(lambda: [0, 0])
for p in places.values(): by_city[p["city"]][0] += 1; by_city[p["city"]][1] += bool(p.get("image"))
def lic_group(l):
    for g in ("CC BY-SA", "CC BY", "CC0", "Public domain"):
        if l.startswith(g): return g
    return l or "chưa rõ"
lic = collections.Counter(lic_group(r["giay_phep"]) for r in rows if r["nhom"] == "wikimedia")
md = ["# Kiểm kê ảnh", "", f"Tạo bằng `scripts/photo-inventory.py`. Bảng đầy đủ: `docs/kiem-ke-anh.csv` (cột cuối để chủ dự án điền).", "",
      f"- Tổng số ảnh: **{len(rows)}** ({cnt['wikimedia']} từ Wikimedia Commons, {cnt['chu-du-an']} do chủ dự án gửi, {cnt['chua-ro']} chưa rõ nguồn).",
      f"- Địa điểm có ảnh thật: **{sum(v[1] for v in by_city.values())}/{len(places)}**; còn lại dùng hình minh hoạ vẽ bằng mã (không vướng bản quyền).",
      f"- Cần chủ dự án xác nhận quyền: **{len(need)}** ảnh.", "", "## Theo điểm đến", "", "| Điểm đến | Có ảnh | Tổng địa điểm |", "|---|---|---|"]
md += [f"| {c} | {v[1]} | {v[0]} |" for c, v in sorted(by_city.items(), key=lambda x: -x[1][0])]
md += ["", "## Giấy phép ảnh Wikimedia", ""] + [f"- {k}: {v}" for k, v in sorted(lic.items())]
md += ["", "Điều kiện cần giữ: ghi tác giả, giấy phép và nguồn (app hiện dòng ghi nguồn dưới ảnh, tệp `web/images/CREDITS.md` liệt kê đầy đủ). CC BY-SA yêu cầu ảnh đã chỉnh sửa (thu nhỏ, nén) giữ nguyên giấy phép đó.", "",
       "## Ảnh cần chủ dự án xác nhận quyền", "", "| Tệp | Dùng ở | Ghi chú | Trạng thái |", "|---|---|---|---|"]
md += [f"| `{r['id']}.jpg` | {r['vi_tri']} | {r['ghi_chu'] or '(chưa có ghi chú)'} | {r['trang_thai']} |" for r in need]
md += ["", f"## Địa điểm chưa có ảnh ({len(no_img)})", "", f"Trong đó {len(sample)} là quán mẫu ghi rõ \"(mẫu)\" (không phải địa điểm thật, nên không dùng ảnh).", ""]
for city in sorted({p['city'] for p in no_img}):
    md.append(f"- **{city}**: " + ", ".join(p["name"] for p in no_img if p["city"] == city and not p.get("sample")))
if orphan: md += ["", "Cảnh báo: địa điểm có ảnh trong dữ liệu nhưng thiếu tệp gốc trong assets-src/images: " + ", ".join(orphan)]
(root / "docs" / "KIEM-KE-ANH.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(f"{len(rows)} ảnh: {dict(cnt)}; cần xác nhận {len(need)}; địa điểm chưa có ảnh {len(no_img)}")
