#!/usr/bin/env python3
"""Thêm điểm đến Nha Trang: địa điểm (biển, đảo, tháp Chăm, vui chơi, tắm bùn khoáng, quán ăn, cà phê) vào data/da-nang.json và khách sạn MẪU vào data/travel-options.json.
Địa điểm là nơi có thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), khách sạn là dữ liệu MẪU. Chạy lại được, không trùng.
Chạy: python3 scripts/add-nhatrang.py"""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
CITY = "Nha Trang"
ALL = ["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]
CHECK = "Toạ độ, giá và giờ mở cửa là ước lượng, hãy kiểm tra lại trên Google Maps trước khi đi"

def place(id, name, type, slot, lat, lng, dur, price, open, close, scene, highlights, culture, address="", walking=1, kids=True, elderly=True, aud=ALL, meal=None, desc=None, dishes=None):
    p = dict(id=id, name=name, type=type, city=CITY, lat=lat, lng=lng, duration=dur, open=open, close=close, price=price, walking=walking, slot=slot,
             audiences=aud, kids=kids, elderly=elderly, status="open", freshness="fresh", scene=scene, highlights=highlights + [CHECK], culture=culture, approx=True)
    if address: p["address"] = address
    if meal: p["meal"] = meal
    if desc: p["desc"] = desc
    if dishes: p["dishes"] = dishes
    return p


H = lambda *a: list(a)
NEW = [
 # ---- Biển và đảo
 place("bien-nha-trang", "Biển Nha Trang (Trần Phú)", "beach", "morning", 12.2470, 109.1955, 150, 0, "00:00", "23:59", "beach",
   H("Bãi cát dài ngay trung tâm, đi sớm cho nước êm và đỡ nắng", "Đường Trần Phú ven biển nhiều quán ăn, quán cà phê", "Chỉ tắm trong khu có cờ và nhân viên cứu hộ, mùa mưa bão sóng lớn"),
   "Bãi biển trung tâm thành phố dài khoảng 6 km, nước xanh, cát mịn, nằm sát đường Trần Phú với hàng dừa và nhiều khách sạn, là nơi người dân và du khách tắm biển, đi dạo.",
   "Đường Trần Phú, trung tâm Nha Trang", 1),
 place("tour-4-dao-nha-trang", "Tour đảo Vịnh Nha Trang (Hòn Mun, Hòn Tằm…)", "park", "morning", 12.1700, 109.2900, 420, 600000, "08:00", "16:30", "boat",
   H("Thường đi tàu hoặc ca nô ra các đảo, lặn ngắm san hô ở Hòn Mun, ăn trưa trên đảo hoặc trên tàu, giá tham khảo khoảng 600.000–700.000 đ, hỏi rõ trọn gói và đặt trước", "Không đi khi biển động hoặc có bão", "Mang đồ bơi, kem chống nắng, trẻ nhỏ phải mặc áo phao"),
   "Vịnh Nha Trang được công nhận là một trong những vịnh biển đẹp nhất thế giới, với hơn chục hòn đảo lớn nhỏ. Hòn Mun là khu bảo tồn biển đầu tiên của Việt Nam, nổi tiếng với san hô và đa dạng sinh học.",
   "Bến tàu Cầu Đá hoặc Vĩnh Trường", 2, elderly=False),
 place("bai-dai-cam-ranh", "Bãi Dài (Cam Ranh)", "beach", "morning", 12.0700, 109.2150, 150, 0, "00:00", "23:59", "beach",
   H("Bãi dài, vắng hơn biển trung tâm, gần sân bay Cam Ranh", "Mang theo nước uống, ít quán trên bãi", "Mùa mưa bão sóng lớn, xem dự báo"),
   "Bãi biển dài ở phía nam thành phố, gần sân bay Cam Ranh, nổi tiếng với cát trắng, nước trong và không gian yên tĩnh hơn khu trung tâm; nhiều resort lớn nằm dọc bãi.",
   "Cam Lâm, gần sân bay Cam Ranh", 1),
 place("doc-let", "Bãi Dốc Lết", "beach", "afternoon", 12.3400, 109.2450, 150, 0, "00:00", "23:59", "beach",
   H("Bãi cát trắng dài ở phía bắc, cách trung tâm khoảng 40 km", "Có thể thu phí vào bãi hoặc khu vực dịch vụ, kiểm tra khi đến", "Hợp nghỉ dưỡng yên tĩnh"),
   "Bãi biển hoang sơ ở phía bắc Nha Trang với cát trắng, nước trong và hàng dương, ít đông đúc, hợp ai thích nghỉ dưỡng yên tĩnh.",
   "Ninh Hoà, cách trung tâm khoảng 40 km", 1),
 # ---- Vui chơi, tắm bùn
 place("vinwonders-nha-trang", "VinWonders Nha Trang (Hòn Tre)", "park", "morning", 12.2160, 109.2380, 360, 950000, "09:00", "21:00", "wheel",
   H("Đi cáp treo vượt biển Vịnh Nha Trang tới đảo Hòn Tre, vé cáp khứ hồi khoảng 200.000 đ và miễn phí nếu đã mua vé VinWonders", "Giá vé VinWonders là ước lượng, chưa xác minh được, kiểm tra và đặt trước", "Mang nón, kem chống nắng"),
   "Công viên giải trí lớn trên đảo Hòn Tre, nối với đất liền bằng tuyến cáp treo vượt vịnh. Có khu vui chơi, công viên nước, thuỷ cung và các show buổi tối.",
   "Đảo Hòn Tre, vượt biển bằng cáp treo từ bến Trần Phú", 2),
 place("tam-bun-thap-ba", "Suối khoáng nóng và tắm bùn Tháp Bà", "park", "afternoon", 12.2680, 109.1930, 150, 150000, "07:00", "19:00", "field",
   H("Tắm bùn khoáng nóng, ngâm thư giãn, giá khoảng 150.000 đ/người lớn cho dịch vụ tập thể, kiểm tra lại", "Nên mang đồ thay, khăn, tránh ăn quá no trước khi tắm", "Phụ nữ mang thai, người có bệnh tim và huyết áp nên hỏi ý kiến bác sĩ"),
   "Khu suối khoáng nóng gần Tháp Bà Ponagar nổi tiếng với dịch vụ tắm bùn khoáng, một trải nghiệm thư giãn riêng của Nha Trang sau những ngày đi biển.",
   "Gần Tháp Bà Ponagar, Vĩnh Phương", 1, kids=False),
 # ---- Văn hoá, tâm linh, kiến trúc
 place("thap-ba-ponagar", "Tháp Bà Ponagar", "culture", "morning", 12.2655, 109.1953, 60, 30000, "06:00", "17:30", "temple",
   H("Giá vé khoảng 30.000 đ (các nguồn ghi khác nhau), kiểm tra lại", "Cởi giày khi vào tháp, ăn mặc kín đáo", "Đi sáng sớm hoặc chiều muộn cho mát và đỡ đông"),
   "Quần thể tháp Chăm xây từ thế kỷ 8, thờ nữ thần Thiên Y A Na (Po Nagar), mẹ xứ sở của người Chăm. Gạch nung đỏ và các hoạ tiết chạm khắc cho thấy kỹ thuật kiến trúc tinh xảo, đến nay vẫn là nơi hành lễ của người Chăm.",
   "2 Tháng 4, Vĩnh Phước", 1),
 place("hon-chong", "Hòn Chồng", "checkin", "afternoon", 12.2750, 109.2110, 60, 22000, "06:00", "18:00", "mountain",
   H("Cụm đá lớn nhô ra biển, đẹp lúc bình minh và hoàng hôn", "Giá vé là ước lượng, kiểm tra lại khi đến", "Mang giày bám tốt khi leo lên các tảng đá"),
   "Cụm đá granit khổng lồ xếp chồng nhau nhô ra biển ở phía bắc thành phố, gắn với truyền thuyết người khổng lồ để lại dấu bàn tay trên đá, là điểm ngắm biển và bình minh quen thuộc.",
   "Vĩnh Phước, phía bắc trung tâm", 2),
 place("vien-hai-duong-hoc", "Viện Hải dương học Nha Trang", "culture", "morning", 12.2058, 109.2125, 90, 40000, "06:00", "18:00", "museum",
   H("Giá vé người lớn khoảng 40.000 đ, trẻ em dưới 6 tuổi miễn phí, kiểm tra lại", "Khu đáy kính ngoài biển có giờ riêng (khoảng 9h–11h)", "Hợp trẻ em, có mái che, đỡ nắng"),
   "Một trong những viện nghiên cứu biển lâu đời của Việt Nam, bảo tàng và hồ thuỷ sinh trưng bày hàng nghìn mẫu vật biển, từ san hô, cá mập nhỏ đến bộ xương cá voi.",
   "1 Cầu Đá, Vĩnh Nguyên", 0),
 place("chua-long-son", "Chùa Long Sơn (tượng Phật trắng)", "culture", "morning", 12.2510, 109.1820, 45, 0, "07:00", "17:30", "temple",
   H("Có tượng Phật trắng lớn và hơn 150 bậc thang lên đỉnh, ngắm toàn cảnh thành phố", "Ăn mặc kín đáo, giữ yên lặng", "Leo bậc thang vất vả nếu người lớn tuổi hoặc trời nắng"),
   "Ngôi chùa nổi tiếng với tượng Phật Thích Ca ngồi thiền bằng bê tông trắng cao 24 m trên đồi Trại Thuỷ, nhìn xuống thành phố và vịnh, là điểm tâm linh và ngắm cảnh quen thuộc.",
   "22 Yersin, Phước Đồng", 3, elderly=False),
 place("nha-tho-nui", "Nhà thờ Chính toà Nha Trang (Nhà thờ Đá)", "checkin", "afternoon", 12.2470, 109.1920, 30, 0, "06:00", "19:00", "temple",
   H("Chụp ảnh phía ngoài, vào trong theo giờ lễ và ăn mặc kín đáo", "Trên một ngọn đồi nhỏ, nhìn xuống đường tàu và phố", "Giờ mở cửa có thể thay đổi, kiểm tra lại"),
   "Nhà thờ xây bằng đá, theo kiến trúc Gothic, hoàn thành năm 1934, nằm trên ngọn đồi nhỏ giữa trung tâm thành phố với tháp chuông nhìn ra phố.",
   "31 Thái Nguyên, Phước Tân", 1),
 place("dinh-bao-dai", "Dinh Bảo Đại (Villa Bảo Đại)", "culture", "afternoon", 12.2080, 109.2155, 60, 40000, "07:00", "17:30", "museum",
   H("Ngắm biển từ khuôn viên đồi, có thể thuê trang phục chụp ảnh", "Giá vé là ước lượng, kiểm tra lại khi đến", "Khu vực nhiều bậc thang"),
   "Biệt thự nghỉ mát của cựu hoàng Bảo Đại, vị vua cuối cùng triều Nguyễn, xây trên đồi ven biển, nay là điểm tham quan với nội thất, đồ dùng sinh hoạt thời bấy giờ.",
   "Đường Trần Phú, phía nam trung tâm", 2),
 place("thap-tram-huong", "Quảng trường 2/4 và Tháp Trầm Hương", "checkin", "evening", 12.2465, 109.1975, 60, 0, "00:00", "23:59", "lantern",
   H("Tháp hình đoá sen và đèn sáng về đêm", "Cạnh biển, đi dạo hoặc ăn kem buổi tối", "Cuối tuần có sự kiện và nhạc đường phố"),
   "Quảng trường ven biển với Tháp Trầm Hương cao khoảng 40 m hình đoá sen khép, biểu tượng của sự thanh cao, là nơi tụ tập của người dân và du khách mỗi tối.",
   "Đường Trần Phú, trung tâm", 1),
 place("cho-dam", "Chợ Đầm", "checkin", "morning", 12.2527, 109.1916, 60, 0, "05:00", "18:00", "market",
   H("Chợ lớn của thành phố, bán hải sản khô, đặc sản, quà lưu niệm", "Hỏi giá và trả giá nhẹ, giữ kỹ đồ cá nhân", "Đi sáng sớm cho nhiều hàng tươi"),
   "Chợ truyền thống lớn nhất Nha Trang với mái vòm tròn đặc trưng, nơi bán hải sản tươi và khô, nước mắm, yến sào, trái cây và quà lưu niệm.",
   "Đường Hai Bà Trưng, Xương Huân", 1),
 # ---- Quán ăn
 place("nem-nuong-dang-van-quyen", "Nem nướng Đặng Văn Quyên", "food", "midday", 12.2390, 109.1965, 50, 70000, "07:30", "20:30", "food",
   H("Nem nướng cuốn bánh tráng với rau sống, chấm sốt đậu phộng", "Có hai chi nhánh gần nhau (Lãn Ông và Phan Bội Châu), các nguồn ghi địa chỉ khác nhau", "Giờ trưa đông, nên đi sớm"),
   "Nem nướng Ninh Hoà là đặc sản vùng Khánh Hoà: nem thịt heo nướng thơm, cuốn bánh tráng cùng bún, rau sống, chả giò, chấm nước sốt đặc biệt.",
   "16A Lãn Ông, Xương Huân", 0, meal="lunch", desc="Quán nem nướng nổi tiếng.", dishes=["Nem nướng", "Chả giò", "Nước sốt"]),
 place("hoa-suong-cha-ca", "Hòa Sương – Chả cá Nha Trang", "food", "midday", 12.2430, 109.1955, 45, 50000, "06:30", "20:00", "food",
   H("Bún chả cá nước dùng ngọt thanh, chả cá chiên giòn", "Hợp bữa sáng hoặc trưa nhẹ", "Giờ cao điểm đông"),
   "Chả cá Nha Trang làm từ cá thu, cá nục, giã nhỏ, chiên hoặc nấu bún, là món ăn quen thuộc của người địa phương, thường ăn với rau sống và bún.",
   "81 Phan Bội Châu, Xương Huân", 0, meal="lunch", desc="Quán bún và chả cá quen thuộc ở trung tâm.", dishes=["Bún chả cá", "Chả cá chiên", "Bánh canh chả cá"]),
 place("banh-can-hoang-van-thu", "Bánh căn 151 Hoàng Văn Thụ", "food", "midday", 12.2530, 109.1850, 45, 50000, "06:00", "21:00", "food",
   H("Bánh căn nhỏ nướng giòn, ăn với nước chấm cá, tôm, mực", "Địa chỉ là theo một số nguồn, kiểm tra lại", "Hợp ăn sáng hoặc tối nhẹ"),
   "Bánh căn là món bánh gạo nhỏ nướng trong khuôn đất, vỏ giòn, ăn kèm trứng cút, mực hoặc tôm, chấm nước mắm, một trong những món quen thuộc của miền Trung.",
   "151 Hoàng Văn Thụ", 0, meal="lunch", desc="Quán bánh căn quen thuộc.", dishes=["Bánh căn", "Bánh căn mực", "Bánh căn tôm"]),
 place("banh-xeo-to-hien-thanh", "Bánh xèo chảo 85 Tô Hiến Thành", "food", "midday", 12.2580, 109.1920, 50, 60000, "09:00", "21:00", "food",
   H("Bánh xèo chảo nhỏ giòn tan cuốn rau sống", "Địa chỉ theo một số nguồn, kiểm tra lại"),
   "Bánh xèo Nha Trang nhỏ, vỏ giòn, nhân tôm thịt, cuốn bánh tráng chấm nước chấm đậm, là món ăn nhẹ phổ biến.",
   "85 Tô Hiến Thành", 0, meal="lunch", desc="Quán bánh xèo chảo nổi tiếng.", dishes=["Bánh xèo", "Nem nướng", "Bánh ướt"]),
 place("bun-sua-han-thuyen", "Bún sứa Hàn Thuyên", "food", "midday", 12.2440, 109.1930, 40, 40000, "06:00", "20:00", "food",
   H("Bún sứa là món đặc trưng Nha Trang, thanh nhẹ, hợp ngày nóng", "Nếu lần đầu thử, hỏi nhân viên về độ giòn của sứa", "Địa chỉ là theo một số nguồn, kiểm tra lại"),
   "Bún sứa Nha Trang có nước dùng ngọt thanh nấu từ cá và hải sản, sứa biển giòn giòn, ăn cùng bún, rau thơm và mắm tôm.",
   "Phố Hàn Thuyên", 0, meal="lunch", desc="Quán bún sứa quen thuộc.", dishes=["Bún sứa", "Bún cá", "Bánh canh"]),
 place("bo-nuong-lac-canh", "Bò nướng Lạc Cảnh", "food", "evening", 12.2480, 109.1930, 75, 180000, "10:00", "22:00", "food",
   H("Bò nướng tự nướng tại bàn, nhiều món kèm", "Giờ tối đông, nên đặt bàn", "Địa chỉ chưa xác minh, tra trên Google Maps"),
   "Bò nướng là món ăn tối phổ biến ở Nha Trang, thịt bò ướp sả, tỏi, nướng than tại bàn, cuốn rau sống và bánh tráng.",
   "Khu phố Lạc Cảnh (chưa xác minh số nhà)", 0, meal="dinner", desc="Quán bò nướng nổi tiếng.", dishes=["Bò nướng", "Bò lá lốt", "Lẩu"], aud=["nhom_ban", "gia_dinh", "cap_doi", "mot_minh"]),
 place("hai-san-bo-ke", "Hải sản Bờ Kè", "food", "evening", 12.2420, 109.1960, 90, 300000, "16:00", "23:00", "food",
   H("Chọn hải sản tại bể theo cân, hỏi giá và chốt giá trước khi chế biến", "Nên đi nhóm 3 đến 4 người để gọi được nhiều món", "Địa chỉ chưa xác minh, tra trên Google Maps"),
   "Hải sản Nha Trang nổi tiếng tươi, thường chọn trực tiếp từ bể rồi nhờ quán nấu theo ý như hấp, nướng, xào me hoặc nấu lẩu.",
   "Khu vực bờ kè ven biển, Nha Trang (chưa xác minh)", 0, meal="dinner", desc="Quán hải sản ven biển.", dishes=["Tôm hùm", "Ghẹ", "Ốc", "Mực"], aud=["nhom_ban", "gia_dinh", "cap_doi"]),
 # ---- Cà phê và quán bar
 place("louisiane-brewhouse", "Louisiane Brewhouse", "cafe", "afternoon", 12.2430, 109.1960, 90, 120000, "07:00", "24:00", "cafe",
   H("Quán bia thủ công ven biển với hồ bơi và bãi cát riêng, đẹp lúc chiều muộn", "Có thể dùng hồ bơi và ghế bãi khi gọi món (hỏi chính sách)", "Cuối tuần và chiều tối đông"),
   "Quán bia, nhà hàng nằm sát biển Trần Phú, nổi tiếng với bia tươi thủ công, đồ ăn Âu – Á và không gian nghỉ chân kiểu resort ven biển.",
   "29 Trần Phú", 0, desc="Quán bia và nhà hàng ven biển, có hồ bơi.", dishes=["Bia thủ công", "Cà phê", "Sinh tố"], aud=["cap_doi", "nhom_ban", "mot_minh"], kids=False),
 place("sailing-club", "Sailing Club Nha Trang", "cafe", "evening", 12.2410, 109.1965, 90, 150000, "08:00", "24:00", "cafe",
   H("Quán bar ven biển quen thuộc, nhạc sống buổi tối, ngồi ngoài trời ngắm biển", "Hỏi lịch sự kiện và chi phí trước", "Tối cuối tuần rất đông"),
   "Quán bar và nhà hàng ven biển nổi tiếng của Nha Trang, từ lâu là điểm hẹn của người đi du lịch với không gian mở nhìn ra biển và những buổi tiệc đêm.",
   "72–74 Trần Phú", 0, desc="Quán bar ven biển nổi tiếng.", dishes=["Cocktail", "Bia", "Đồ ăn nhẹ"], aud=["cap_doi", "nhom_ban", "mot_minh"], kids=False, elderly=False),
 place("cf-bien-nha-trang", "Quán cà phê ngắm biển Nha Trang (mẫu)", "cafe", "afternoon", 12.2450, 109.1960, 75, 70000, "07:00", "22:00", "cafe",
   H("Chọn chỗ ngồi gần cửa sổ nhìn ra biển", "Quán mẫu, chưa phải quán thật"),
   "Cà phê ven biển là thói quen quen thuộc của người Nha Trang và du khách vào buổi chiều.",
   "Đường Trần Phú (quán mẫu)", 0, desc="Quán cà phê thoáng nhìn ra biển.", dishes=["Cà phê", "Nước dừa", "Sinh tố"]),
]
for _p in NEW:
    if _p["id"].startswith("cf-"): _p["sample"] = True

HOTELS = [
 ("nt-hostel", "hostel-bien", "Hostel trung tâm Nha Trang (mẫu)", "Trung tâm", 250000, 12.2400, 109.1960, "Hostel nhỏ cách biển vài phút đi bộ, phù hợp đi tiết kiệm.", ["Wifi", "Bếp chung"]),
 ("nt-homestay", "homestay", "Homestay gần biển (mẫu)", "Trần Phú", 380000, 12.2380, 109.1950, "Homestay gọn, chủ nhà thân thiện, đi bộ ra biển.", ["Wifi", "Ăn sáng"]),
 ("nt-3sao", "3sao-tt", "Khách sạn 3 sao trung tâm (mẫu)", "Trung tâm", 700000, 12.2435, 109.1940, "Khách sạn 3 sao gần phố ẩm thực, cách biển khoảng 300 m.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("nt-3sao-bien", "3sao-bien", "Khách sạn 3 sao ven biển (mẫu)", "Trần Phú", 850000, 12.2460, 109.1960, "Khách sạn 3 sao ngay đường biển Trần Phú, có hồ bơi tầng thượng.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("nt-4sao", "4sao-tt", "Khách sạn 4 sao trung tâm (mẫu)", "Trung tâm", 1400000, 12.2420, 109.1950, "Khách sạn 4 sao gần biển, có hồ bơi và nhà hàng.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("nt-4sao-bien", "4sao-bien", "Khách sạn 4 sao sát biển (mẫu)", "Trần Phú", 1650000, 12.2450, 109.1965, "Khách sạn 4 sao hướng biển, có hồ bơi và quán bar tầng thượng.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa"]),
 ("nt-resort", "resort-nhs", "Resort 5 sao bãi dài Cam Ranh (mẫu)", "Bãi Dài", 3500000, 12.0700, 109.2150, "Resort 5 sao sát bãi Dài, có hồ bơi lớn, spa và bãi biển riêng, cách trung tâm khoảng 30 km.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa", "Bãi biển riêng"]),
 ("nt-villa", "villa", "Villa hồ bơi riêng ven vịnh (mẫu)", "Vịnh Nha Trang", 4800000, 12.2000, 109.2250, "Villa riêng có hồ bơi nhìn ra vịnh, hợp nhóm bạn hoặc gia đình đông người.", ["Wifi", "Ăn sáng", "Hồ bơi riêng", "Bếp"]),
]

def main():
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
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=CITY, googleQuery=name.replace(" (mẫu)", "") + " Nha Trang")
        for rt in h.get("roomTypes", []): rt["view"] = {"Mỹ Khê": area}.get(rt.get("view"), rt.get("view"))
        h["reviews"] = [dict(r, text=r["text"].replace("Đà Nẵng", "Nha Trang")) for r in h.get("reviews", [])]
        opts["hotels"].append(h)
    # thêm nơi khởi hành Đà Nẵng (dùng khi đi tới Nha Trang, Phú Quốc)
    if not any(o["id"] == "da-nang" for o in opts["origins"]): opts["origins"].append({"id": "da-nang", "name": "Đà Nẵng"})
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Nha Trang:", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))

main()
