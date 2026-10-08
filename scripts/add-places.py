#!/usr/bin/env python3
"""Thêm quán ăn và quán cà phê/trà sữa nổi tiếng ở Đà Nẵng vào data/da-nang.json (chạy lại được, không trùng).
Quán thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), app ghi rõ để người dùng kiểm tra lại trên Google Maps.
Không có điểm đánh giá hay lượt đánh giá vì chưa có dữ liệu thật.
Chạy: python3 scripts/add-places.py"""
import json, pathlib
path = pathlib.Path(__file__).resolve().parent.parent / "data" / "da-nang.json"
data = json.loads(path.read_text(encoding="utf-8"))
ALL = ["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]
CHECK = "Toạ độ, giá và giờ mở cửa là ước lượng, hãy kiểm tra lại trên Google Maps trước khi đi"

def food(id, name, meal, lat, lng, price, open, close, address, desc, dishes, highlights, culture, dur=60, kids=True, elderly=True, aud=ALL, scene="food"):
    return dict(id=id, name=name, type="food", meal=meal, lat=lat, lng=lng, duration=dur, open=open, close=close, price=price, walking=0,
        slot="midday" if meal == "lunch" else "evening", audiences=aud, kids=kids, elderly=elderly, status="open", freshness="fresh", scene=scene,
        highlights=highlights + [CHECK], culture=culture, desc=desc, dishes=dishes, address=address, approx=True)

def cafe(id, name, lat, lng, price, open, close, address, desc, dishes, highlights, slot="afternoon", dur=60, aud=ALL):
    return dict(id=id, name=name, type="cafe", lat=lat, lng=lng, duration=dur, open=open, close=close, price=price, walking=0,
        slot=slot, audiences=aud, kids=True, elderly=True, status="open", freshness="fresh", scene="cafe",
        highlights=highlights + [CHECK], culture="Cà phê và trà là thói quen của người Đà Nẵng: ngồi lâu, trò chuyện, nghỉ chân giữa buổi đi chơi.",
        desc=desc, dishes=dishes, address=address, approx=True)

NEW = [
 food("an-thoi", "Ăn Thôi", "dinner", 16.0712, 108.2241, 150000, "10:30", "21:30", "114 Bạch Đằng, Hải Châu",
      "Quán Việt gần sông Hàn và chợ Hàn, nổi tiếng với bánh xèo giòn, được Michelin Guide ghi nhận (Bib Gourmand).",
      ["Bánh xèo giòn", "Món Việt theo thực đơn quán"], ["Dễ ghép với chợ Hàn và đi dạo sông Hàn", "Giờ cao điểm đông, nên đến sớm hoặc đặt chỗ"],
      "Bánh xèo miền Trung nhỏ, vỏ giòn, ăn cuốn với bánh tráng và rau sống chấm nước mắm hoặc tương.", dur=75),
 food("banh-xeo-ba-duong", "Bánh xèo Bà Dưỡng", "lunch", 16.0497, 108.2185, 80000, "09:00", "21:30", "K280/23 Hoàng Diệu, Hải Châu (trong hẻm)",
      "Quán bánh xèo và nem lụi lâu năm trong hẻm, đông khách địa phương lẫn khách du lịch.",
      ["Bánh xèo", "Nem lụi"], ["Quán nằm trong hẻm, nhìn kỹ bản đồ", "Cao điểm thường hết chỗ ngồi, nên đi trước 11h30 hoặc sau 14h"],
      "Bánh xèo Đà Nẵng nhỏ, giòn, cuốn rau sống, chấm nước lèo đặc trưng cùng nem lụi nướng."),
 food("mi-quang-ba-mua", "Mì Quảng Bà Mua", "lunch", 16.0636, 108.2162, 50000, "06:00", "21:00", "19 Trần Bình Trọng, Hải Châu",
      "Quán mì Quảng quen thuộc trong trung tâm, sợi mì to, nước nhân đậm đà.",
      ["Mì Quảng gà", "Mì Quảng tôm thịt", "Bánh tráng mè"], ["Ăn kèm bánh tráng mè và rau sống", "Trưa đông, nên đến trước 12h"],
      "Mì Quảng là món đặc sản Quảng Nam – Đà Nẵng, sợi mì bản to, ít nước, ăn với đậu phộng và bánh tráng."),
 food("banh-trang-thit-heo-tran", "Bánh tráng cuốn thịt heo Trần", "lunch", 16.0716, 108.2210, 120000, "10:00", "21:00", "4 Lê Duẩn, Hải Châu",
      "Quán chuyên bánh tráng cuốn thịt heo luộc với rau sống và mắm nêm đặc trưng.",
      ["Bánh tráng cuốn thịt heo", "Mắm nêm", "Bánh xèo"], ["Mắm nêm hơi nặng mùi, hỏi quán nếu lần đầu ăn", "Gọi theo suất, nhóm đông nên gọi nhiều phần"],
      "Thịt heo luộc cuốn bánh tráng, rau sống và chấm mắm nêm là món ăn dân dã rất riêng của miền Trung."),
 food("bun-cha-ca-109", "Bún chả cá 109", "lunch", 16.0652, 108.2200, 40000, "06:00", "20:00", "109 Nguyễn Chí Thanh, Hải Châu",
      "Quán bún chả cá nước lèo ngọt thanh từ xương và cá, bình dân.",
      ["Bún chả cá", "Bún chả cá giò"], ["Hợp bữa sáng hoặc trưa nhẹ", "Thêm ớt sa tế nếu thích cay"],
      "Bún chả cá Đà Nẵng nấu từ cá biển, nước dùng ngọt, ăn cùng rau sống và ớt."),
 food("com-ga-ba-buoi", "Cơm gà Bà Buội", "lunch", 16.0625, 108.2140, 60000, "09:00", "20:00", "22 Thái Phiên, Hải Châu",
      "Quán cơm gà xé phay kiểu Hội An - Đà Nẵng, cơm nấu nước luộc gà, ăn với rau răm và gỏi.",
      ["Cơm gà xé", "Gỏi gà", "Canh"], ["Phần ăn vừa, hợp bữa trưa", "Giờ cao điểm hơi đông"],
      "Cơm gà miền Trung nấu bằng nước luộc gà, vàng thơm, ăn với hành tây, rau răm và nước mắm gừng."),
 food("banh-mi-ba-lan", "Bánh mì Bà Lan", "lunch", 16.0681, 108.2000, 25000, "06:00", "20:00", "62 Trần Cao Vân, Thanh Khê",
      "Tiệm bánh mì nổi tiếng với pate và nhân đầy, hợp ăn nhanh hoặc mang đi.",
      ["Bánh mì thịt nướng", "Bánh mì pate"], ["Hợp ăn nhanh, mang đi", "Có thể đông giờ ăn sáng"],
      "Bánh mì Việt Nam vỏ giòn, nhân thịt, rau, pate là món ăn đường phố được yêu thích khắp cả nước.", dur=30, scene="food"),
 food("hai-san-be-man", "Hải sản Bé Mặn", "dinner", 16.0578, 108.2468, 300000, "16:00", "23:00", "Võ Nguyên Giáp, Sơn Trà (khu ven biển)",
      "Quán hải sản ven biển, chọn hải sản tươi tại bể và nhờ quán chế biến.",
      ["Ghẹ hấp", "Tôm nướng", "Ốc các loại"], ["Hỏi giá theo cân và chốt giá trước khi chế biến", "Nên đi nhóm 3 đến 4 người để gọi được nhiều món"],
      "Hải sản tươi là thế mạnh của thành phố biển, thường chọn trực tiếp rồi nhờ quán nấu theo ý.", dur=90, aud=["nhom_ban", "gia_dinh", "cap_doi"]),
 cafe("highlands-coffee", "Highlands Coffee", 16.0718, 108.2236, 55000, "07:00", "22:00", "Khu ven sông Hàn, Hải Châu (nhiều chi nhánh)",
      "Chuỗi cà phê Việt quen thuộc, có nhiều chi nhánh trong thành phố.", ["Phin sữa đá", "Trà sen vàng", "Freeze trà xanh"], ["Có nhiều chi nhánh, chọn chi nhánh gần bạn trên Google Maps", "Điều hoà mát, hợp nghỉ trưa"]),
 cafe("starbucks", "Starbucks", 16.0734, 108.2330, 85000, "07:30", "22:00", "Khu Vincom Plaza, Sơn Trà (nhiều chi nhánh)",
      "Chuỗi cà phê quốc tế, không gian yên tĩnh, có wifi, hợp ngồi làm việc hoặc nghỉ chân.", ["Cà phê latte", "Frappuccino", "Trà trái cây"], ["Có nhiều chi nhánh, chọn chi nhánh gần bạn trên Google Maps"]),
 cafe("phe-la", "Phê La", 16.0690, 108.2210, 65000, "08:00", "22:30", "Khu trung tâm Hải Châu (xem chi nhánh gần nhất)",
      "Thương hiệu trà và cà phê đặc sản, nổi tiếng với trà ô long và các món dùng nguyên liệu Việt.", ["Trà ô long nhài sữa", "Trà ô long", "Cà phê đặc sản"], ["Chưa xác minh được địa chỉ chi nhánh, tra Phê La trên Google Maps để chọn chi nhánh gần bạn", "Giờ cao điểm cuối tuần khá đông"]),
 cafe("ca-phe-trinh", "Cà phê Trình", 16.0710, 108.2158, 45000, "06:30", "23:30", "25 Phạm Hồng Thái, Hải Châu",
      "Quán cà phê lâu năm, nổi tiếng với cà phê bơ, mở đến rạng sáng.", ["Cà phê bơ", "Cà phê sữa đá"], ["Mở từ sáng sớm đến khuya (theo một số nguồn đến 1h30 sáng)", "Hợp ghé sau bữa tối"], slot="evening"),
]
ids = {p["id"] for p in data["places"]}
added = [p["id"] for p in NEW if p["id"] not in ids]
for p in NEW:
    if p["id"] in ids:
        data["places"] = [p if q["id"] == p["id"] else q for q in data["places"]]
    else:
        data["places"].append(p)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("thêm", len(added), "quán, tổng", len(data["places"]))
