"""Đọc và ghi dữ liệu địa điểm, khách sạn theo từng điểm đến: data/places/<slug>.json, data/hotels/<slug>.json.
Danh sách điểm đến và tên tệp ở data/destinations.json. Các script thêm điểm đến dùng load_data/save_data, load_options/save_options
để làm việc với toàn bộ dữ liệu như một danh sách (places, hotels), còn hàm này lo việc tách ra từng tệp."""
import json, pathlib, re, unicodedata
root = pathlib.Path(__file__).resolve().parent.parent
D = root / "data"

def _read(p): return json.loads(p.read_text(encoding="utf-8"))
def _write(p, o):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def slugify(city):
    s = unicodedata.normalize("NFD", city.replace("đ", "d").replace("Đ", "D"))
    return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in s if unicodedata.category(c) != "Mn").lower()).strip("-")

def destinations(): return _read(D / "destinations.json")["destinations"]

def _group(items, key="city", default="Đà Nẵng"):
    out = {}
    for it in items: out.setdefault(it.get(key) or default, []).append(it)
    return out

def _save_split(folder, field, items, note):
    dests = destinations(); known = {d["city"] for d in dests}
    groups = _group(items)
    for city in groups:  # điểm đến mới: thêm vào danh sách
        if city not in known: dests.append({"city": city, "slug": slugify(city)})
    _write(D / "destinations.json", {"_note": _read(D / "destinations.json")["_note"], "destinations": dests})
    for d in dests:
        f = D / folder / (d["slug"] + ".json")
        if d["city"] in groups: _write(f, {"_note": note, "city": d["city"], field: groups[d["city"]]})
        elif f.exists(): f.unlink()

def load_data():
    places = []
    for d in destinations():
        f = D / "places" / (d["slug"] + ".json")
        if f.exists(): places += _read(f)["places"]
    return {"places": places}

def save_data(data):
    for p in data["places"]: p.setdefault("city", "Đà Nẵng")
    _save_split("places", "places", data["places"], "Địa điểm của một điểm đến. Sửa bằng script trong scripts/ hoặc sửa tay, app ghép các tệp theo data/destinations.json.")

def load_options():
    o = _read(D / "travel-options.json"); hotels = []
    for d in destinations():
        f = D / "hotels" / (d["slug"] + ".json")
        if f.exists(): hotels += _read(f)["hotels"]
    return {**o, "hotels": hotels}

def save_options(opts):
    hotels = opts["hotels"]
    for h in hotels: h.setdefault("city", "Đà Nẵng")
    _write(D / "travel-options.json", {k: v for k, v in opts.items() if k != "hotels"})
    _save_split("hotels", "hotels", hotels, "Khách sạn MẪU của một điểm đến (dữ liệu giả để chạy thử).")
