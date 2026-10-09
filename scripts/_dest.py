"""Phần dùng chung của các script thêm điểm đến (Huế, Sa Pa, Ninh Bình): tạo địa điểm, khách sạn mẫu, ghi vào data/*.json."""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
ALL = ["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]
CHECK = "Toạ độ, giá và giờ mở cửa là ước lượng, hãy kiểm tra lại trên Google Maps trước khi đi"

def make_place(city):
    def place(id, name, type, slot, lat, lng, dur, price, open, close, scene, highlights, culture, address="", walking=1, kids=True, elderly=True, aud=ALL, meal=None, desc=None, dishes=None):
        p = dict(id=id, name=name, type=type, city=city, lat=lat, lng=lng, duration=dur, open=open, close=close, price=price, walking=walking, slot=slot,
                 audiences=aud, kids=kids, elderly=elderly, status="open", freshness="fresh", scene=scene, highlights=highlights + [CHECK], culture=culture, approx=True)
        if address: p["address"] = address
        if meal: p["meal"] = meal
        if desc: p["desc"] = desc
        if dishes: p["dishes"] = dishes
        if id.startswith("cf-"): p["sample"] = True
        return p
    return place

def run(city, NEW, HOTELS):
    dp = root / "data" / "da-nang.json"; data = json.loads(dp.read_text(encoding="utf-8"))
    for p in data["places"]: p.setdefault("city", "Đà Nẵng")
    mine = {n["id"] for n in NEW}
    data["places"] = [p for p in data["places"] if p["id"] not in mine] + NEW
    dp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    op = root / "data" / "travel-options.json"; opts = json.loads(op.read_text(encoding="utf-8"))
    for h in opts["hotels"]: h.setdefault("city", "Đà Nẵng")
    base = {h["id"]: h for h in opts["hotels"] if h["city"] == "Đà Nẵng"}
    hm = {x[0] for x in HOTELS}
    opts["hotels"] = [h for h in opts["hotels"] if h["id"] not in hm]
    for hid, src, name, area, price, lat, lng, desc, am in HOTELS:
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=city, googleQuery=name.replace(" (mẫu)", "") + " " + city)
        for rt in h.get("roomTypes", []): rt["view"] = {"Mỹ Khê": area}.get(rt.get("view"), rt.get("view"))
        h["reviews"] = [dict(r, text=r["text"].replace("Đà Nẵng", city)) for r in h.get("reviews", [])]
        opts["hotels"].append(h)
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(city + ":", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))
