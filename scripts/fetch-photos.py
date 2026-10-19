#!/usr/bin/env python3
"""Tải ảnh địa điểm từ Wikimedia Commons theo danh sách đã chọn, ghi nguồn vào data/photo-credits.json.
Danh sách là tệp JSON: [{"id": "<id địa điểm>", "file": "<tên tệp trên Commons>", "illustrative": "<mô tả nếu chỉ là ảnh minh hoạ>"}].
Mỗi ảnh: tải bản rộng 900 px vào assets-src/images/<id>.jpg, ghi tác giả, giấy phép, trang gốc. Chỉ nhận giấy phép CC0, CC BY, CC BY-SA, miền công cộng.
Sau đó chạy: python3 scripts/optimize-images.py && python3 scripts/apply-photos.py
Chạy: python3 scripts/fetch-photos.py data/photo-picks-2026-10.json"""
import json, pathlib, re, sys, time, urllib.parse, urllib.request, urllib.error
root = pathlib.Path(__file__).resolve().parent.parent
UA = {"User-Agent": "ArrowTravel/1.0 (https://github.com/doanminhhai222-oss/Arrow-Travel)"}
OK = ("CC0", "CC BY", "CC BY-SA", "Public domain", "PD")
strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()

def get(url, raw=False):
    for i in range(8):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
            return d if raw else json.loads(d)
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            wait = min(90, int(e.headers.get("retry-after", "20")) + 3)  # chờ theo máy chủ nhưng không quá 90 giây một lần
            print(f"  bị giới hạn tốc độ, chờ {wait}s", flush=True); time.sleep(wait)
        except Exception: time.sleep(5)
    return None

picks = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
cp = root / "data" / "photo-credits.json"; credits = json.loads(cp.read_text(encoding="utf-8"))
(root / "assets-src" / "images").mkdir(parents=True, exist_ok=True)
for p in picks:
    if (root / "assets-src" / "images" / f"{p['id']}.jpg").exists() and p['id'] in credits and credits[p['id']].get('file') == p['file']:
        print('đã có', p['id'], flush=True); continue  # chạy lại thì bỏ qua ảnh đã tải
    r = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": "File:" + p["file"], "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 900, "format": "json"}))
    if not r: print('BỎ QUA (không gọi được API):', p['id'], flush=True); continue
    pg = list(r["query"]["pages"].values())[0]
    if "imageinfo" not in pg: print("KHÔNG CÓ TỆP:", p["id"], p["file"]); continue
    ii = pg["imageinfo"][0]; m = ii["extmetadata"]; lic = m.get("LicenseShortName", {}).get("value", "?")
    if not lic.startswith(OK): print("GIẤY PHÉP KHÔNG DÙNG ĐƯỢC:", p["id"], lic); continue
    data = get(ii["thumburl"], raw=True)
    if not data: print('BỎ QUA (không tải được ảnh):', p['id'], flush=True); continue
    from PIL import Image; import io
    Image.open(io.BytesIO(data)).convert("RGB").save(root / "assets-src" / "images" / f"{p['id']}.jpg", quality=88)  # luôn lưu JPEG
    author = strip(m.get("Artist", {}).get("value"))
    entry = dict(file=p["file"], author=author, license=lic, page=ii["descriptionurl"])
    if p.get("illustrative"): entry["note"] = f"Ảnh minh hoạ {p['illustrative']}, không phải ảnh tại địa điểm này · {author}, {lic}, Wikimedia Commons"
    credits[p["id"]] = entry
    print("OK", p["id"], lic, flush=True); cp.write_text(json.dumps(credits, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"); time.sleep(2)
cp.write_text(json.dumps(credits, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
