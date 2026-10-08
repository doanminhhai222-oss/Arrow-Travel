#!/usr/bin/env python3
"""Thêm điểm đến Đà Lạt: địa điểm (hồ, thác, đồi chè, kiến trúc, tâm linh, quán ăn, cà phê) vào data/da-nang.json và khách sạn MẪU vào data/travel-options.json.
Địa điểm là nơi có thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), khách sạn là dữ liệu MẪU. Chạy lại được, không trùng.
Chạy: python3 scripts/add-dalat.py"""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
CITY = "Đà Lạt"
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
 # ---- Thiên nhiên, cảnh quan
 place("ho-xuan-huong", "Hồ Xuân Hương", "park", "morning", 11.9430, 108.4420, 90, 0, "00:00", "23:59", "boat",
   H("Đi bộ hoặc đạp vịt quanh hồ, chu vi khoảng 5 km", "Sáng sớm sương mỏng, rất mát", "Thuê xe đạp đôi hoặc xe ngựa quanh hồ, hỏi giá trước"),
   "Hồ nhân tạo hình trăng lưỡi liềm nằm giữa trung tâm thành phố, là nơi người dân và du khách dạo bộ, đạp vịt và ngắm hoàng hôn, xung quanh là thông và những toà nhà kiểu Pháp.",
   "Trung tâm thành phố Đà Lạt", 1),
 place("quang-truong-lam-vien", "Quảng trường Lâm Viên", "checkin", "afternoon", 11.9440, 108.4430, 45, 0, "00:00", "23:59", "boat",
   H("Có công trình hoa dã quỳ và khối kính hình nụ hoa nổi tiếng, chụp ảnh đẹp", "Gần hồ Xuân Hương, đi kết hợp", "Tối có đèn và nhiều quán xung quanh"),
   "Quảng trường ngay cạnh hồ Xuân Hương với công trình kính hình nụ hoa dã quỳ khổng lồ, là biểu tượng mới của thành phố và nơi tụ tập của người dân vào chiều tối.",
   "Hồ Xuân Hương, trung tâm", 1),
 place("thac-datanla", "Thác Datanla", "park", "morning", 11.9000, 108.4510, 120, 50000, "07:30", "17:00", "mountain",
   H("Giá vào khoảng 50.000 đ (nguồn ghi khác nhau), máng trượt và cáp treo tính riêng, kiểm tra lại", "Đường xuống thác trơn, mang giày bám tốt", "Mùa mưa nước lớn, hỏi nhân viên trước khi xuống thác"),
   "Thác nằm trong rừng thông cách trung tâm khoảng 5 km, nổi tiếng với tuyến máng trượt dài xuyên rừng và đường đi bộ xuống thác, hợp ai thích vận động nhẹ.",
   "Đèo Prenn, cách trung tâm khoảng 5 km", 3, elderly=False),
 place("thac-prenn", "Thác Prenn", "park", "afternoon", 11.8980, 108.4650, 60, 30000, "07:00", "17:00", "mountain",
   H("Thác nằm sát đường đèo Prenn, đi bộ ngắn, có thể đi sau Datanla", "Giá vé là ước lượng, kiểm tra lại", "Có khu bán đồ lưu niệm và len"),
   "Thác Prenn rơi từ độ cao khoảng 10 m giữa rừng thông, gần đèo Prenn cửa ngõ vào Đà Lạt, có đường đi bộ ngắn và lối đi xuyên sau màn nước, phù hợp mọi lứa tuổi.",
   "Đèo Prenn", 1),
 place("langbiang", "Núi Langbiang", "park", "morning", 12.0440, 108.4400, 180, 50000, "07:30", "17:00", "mountain",
   H("Giá vào khoảng 50.000 đ, xe jeep lên đỉnh khoảng 120.000 đ khứ hồi (nguồn không rõ năm), kiểm tra lại", "Có thể đi bộ lên đỉnh mất khoảng 1 đến 1,5 giờ", "Mang nón, áo mưa, giày thể thao"),
   "Ngọn núi cao hơn 2.100 m phía bắc thành phố, gắn với truyền thuyết tình yêu của chàng K'Lang và nàng Hbiang. Từ đỉnh nhìn ra toàn cảnh cao nguyên.",
   "Lạc Dương, cách trung tâm khoảng 12 km", 3, elderly=False),
 place("doi-che-cau-dat", "Đồi chè Cầu Đất (săn mây)", "park", "morning", 11.8650, 108.5300, 120, 0, "05:00", "17:00", "field",
   H("Đi từ khoảng 5h sáng để săn mây, mang áo ấm", "Một số vườn thu phí chụp ảnh hoặc có quán cà phê, kiểm tra lại", "Đường tới khá xa, khoảng 25 km từ trung tâm"),
   "Vùng chè trên cao khoảng 1.500 m với những đồi chè xanh liền nhau, nổi tiếng với bình minh và biển mây vào buổi sáng sớm, cũng có nhà ga cũ Cầu Đất.",
   "Xã Xuân Trường, cách trung tâm khoảng 25 km", 2, elderly=False),
 place("thung-lung-tinh-yeu", "Thung lũng Tình Yêu", "park", "afternoon", 12.0100, 108.4400, 120, 100000, "07:00", "17:30", "field",
   H("Khu vui chơi, vườn hoa, có thể đi thuyền hoặc đạp vịt trên hồ", "Giá vé là ước lượng, kiểm tra lại", "Chụp ảnh cặp đôi, hợp đi buổi chiều"),
   "Thung lũng với hồ Đa Thiện, đồi hoa và nhiều tiểu cảnh lãng mạn, từ lâu là điểm hẹn của các cặp đôi.",
   "Phường 8, cách trung tâm khoảng 6 km", 2),
 place("doi-mong-mo", "Đồi Mộng Mơ", "checkin", "afternoon", 11.9780, 108.4180, 90, 40000, "07:00", "17:30", "field",
   H("Khu vui chơi và tiểu cảnh nhỏ, có thể thuê trang phục chụp ảnh", "Giá vé là ước lượng, kiểm tra lại"),
   "Đồi thông với nhiều tiểu cảnh nhỏ, hồ và cầu gỗ, thích hợp đi nhẹ nhàng và chụp ảnh.",
   "Phường 8", 2),
 place("ho-tuyen-lam", "Hồ Tuyền Lâm", "park", "afternoon", 11.8830, 108.4290, 120, 0, "00:00", "23:59", "boat",
   H("Hồ lớn giữa rừng thông, có thể chèo thuyền kayak, đi cáp treo hoặc ăn tối ven hồ", "Gần Thiền viện Trúc Lâm, đi kết hợp", "Dịch vụ tính phí riêng, hỏi giá trước"),
   "Hồ nhân tạo lớn nhất thành phố, bao quanh bởi đồi thông, có nhiều quán cà phê, khu nghỉ và hoạt động trên hồ.",
   "Phường 4, cách trung tâm khoảng 6 km", 1),
 # ---- Văn hoá, kiến trúc, tâm linh
 place("crazy-house", "Crazy House (Biệt thự Hằng Nga)", "culture", "morning", 11.9340, 108.4310, 60, 60000, "08:30", "19:00", "museum",
   H("Giá vé khoảng 60.000–80.000 đ (các nguồn ghi khác nhau), trẻ nhỏ dưới 120 cm thường miễn phí", "Có thang hẹp và dốc, đi giày bám tốt", "Giờ mở cửa các nguồn ghi khác nhau, kiểm tra lại"),
   "Công trình kiến trúc kỳ lạ do kiến trúc sư Đặng Việt Nga thiết kế, như một khu rừng nhân tạo với lối đi, cầu thang và phòng nghỉ uốn lượn theo hình thân cây, hang động.",
   "3 Huỳnh Thúc Kháng", 1, elderly=False),
 place("ga-da-lat", "Ga Đà Lạt", "culture", "morning", 11.9420, 108.4560, 60, 10000, "07:00", "17:00", "museum",
   H("Nhà ga cổ xây từ năm 1938 theo phong cách Art Deco, có tàu hơi nước cổ", "Có thể đi tàu du lịch Đà Lạt – Trại Mát, giá khoảng 150.000 đ, kiểm tra lại", "Vé tham quan ga khoảng 10.000 đ, ước lượng"),
   "Nhà ga cổ nổi tiếng với kiến trúc ba mái nhọn mô phỏng ba đỉnh núi Langbiang, là một trong những nhà ga đẹp nhất Việt Nam. Tuyến tàu răng cưa cũ nay chạy từ Đà Lạt tới Trại Mát.",
   "1 Quang Trung", 0),
 place("dinh-bao-dai-da-lat", "Dinh Bảo Đại (Dinh III)", "culture", "morning", 11.9300, 108.4510, 60, 30000, "07:30", "17:00", "museum",
   H("Giá vé khoảng 30.000 đ, ước lượng, kiểm tra lại", "Bên trong giữ nội thất và đồ dùng của gia đình Bảo Đại"),
   "Biệt thự nghỉ mát của hoàng đế Bảo Đại xây năm 1933 trên đồi thông, kiến trúc kiểu Pháp pha phong cách Á Đông, nay là điểm tham quan lịch sử.",
   "Triệu Việt Vương", 2),
 place("thien-vien-truc-lam", "Thiền viện Trúc Lâm", "culture", "morning", 11.8990, 108.4310, 75, 0, "05:00", "21:00", "temple",
   H("Vào cổng miễn phí, ăn mặc kín đáo, giữ yên lặng", "Có thể đi cáp treo Robin Hill từ trung tâm, khoảng 100.000 đ khứ hồi (nguồn cũ), kiểm tra lại", "Nhìn xuống hồ Tuyền Lâm từ sân thiền"),
   "Thiền viện lớn trên đồi Phụng Hoàng, kiến trúc cổ kính bao quanh bởi rừng thông và hoa, nhìn xuống hồ Tuyền Lâm, là nơi tĩnh tại hiếm có của thành phố.",
   "Đường Trần Hưng Đạo, phía nam hồ Tuyền Lâm", 2),
 place("chua-linh-phuoc", "Chùa Linh Phước (Chùa Ve Chai)", "culture", "afternoon", 11.9760, 108.4650, 45, 0, "07:00", "17:00", "temple",
   H("Tượng rồng khổng lồ làm từ mảnh sành và chai lọ, rất nổi bật", "Ăn mặc kín đáo, giữ yên lặng", "Vào cổng miễn phí"),
   "Ngôi chùa nổi tiếng với những tượng rồng và hoạ tiết khảm bằng hàng triệu mảnh sành, chai lọ, và tháp chuông nhiều tầng.",
   "120 Tự Phước", 1),
 place("nha-tho-con-ga", "Nhà thờ Chính toà Đà Lạt (Nhà thờ Con Gà)", "checkin", "afternoon", 11.9400, 108.4440, 30, 0, "06:00", "19:00", "temple",
   H("Chụp ảnh phía ngoài, vào trong theo giờ lễ", "Trên đỉnh tháp có con gà, nên được gọi tên Nhà thờ Con Gà"),
   "Nhà thờ xây từ năm 1931 theo kiến trúc Gothic, trên đỉnh tháp chuông có con gà trống, là một trong những biểu tượng kiến trúc của thành phố.",
   "15 Trần Phú", 1),
 place("duong-ham-dieu-khac", "Đường hầm Điêu khắc Đà Lạt", "checkin", "afternoon", 11.9040, 108.5040, 60, 80000, "07:00", "17:00", "museum",
   H("Giá vé là ước lượng, kiểm tra lại", "Một phần tuyến đường hầm đất sét nằm trong khu đồi", "Xa trung tâm, nên đi kết hợp cùng Cầu Đất"),
   "Công trình điêu khắc đất sét độc đáo trong đường hầm tự nhiên với những tượng người, con vật, hoạ tiết dân gian, mang tới trải nghiệm khác lạ.",
   "Phường 9, xa trung tâm", 2),
 place("cho-da-lat", "Chợ Đà Lạt", "checkin", "morning", 11.9435, 108.4375, 60, 0, "05:00", "20:00", "market",
   H("Chợ trung tâm, nhiều hàng rau củ, trái cây, mứt, len và quà lưu niệm", "Tầng trệt bán đặc sản, tầng trên có quán ăn", "Hỏi giá và trả giá nhẹ"),
   "Chợ lớn nhất thành phố, nằm giữa trung tâm, bán rau củ quả vùng cao, mứt, hoa, hạt và đồ lưu niệm, là nơi ăn vặt và mua quà quen thuộc của du khách.",
   "Nguyễn Thị Minh Khai, Phường 1", 1),
 place("cho-dem-da-lat", "Chợ đêm Đà Lạt", "food", "evening", 11.9440, 108.4380, 90, 100000, "17:00", "23:00", "market",
   H("Ăn vặt bánh tráng nướng, sữa đậu nành nóng, khoai nướng, mua len và đồ lưu niệm", "Buổi tối lạnh, mang áo khoác", "Giữ kỹ đồ cá nhân"),
   "Khu chợ đêm quanh chợ trung tâm với hàng ăn vặt và đồ len lưu niệm, bầu không khí lạnh, sương và đèn vàng là điểm nhấn ban đêm của Đà Lạt.",
   "Khu vực chợ Đà Lạt, đường Nguyễn Thị Minh Khai", 1, meal="dinner", desc="Chợ đêm, đồ ăn vặt và đồ len.", dishes=["Bánh tráng nướng", "Sữa đậu nành", "Khoai nướng"]),
 # ---- Quán ăn
 place("nem-nuong-ba-hung", "Nem nướng Bà Hùng", "food", "midday", 11.9460, 108.4480, 50, 70000, "10:00", "22:00", "food",
   H("Nem nướng cuốn bánh tráng với rau sống, chấm sốt đặc biệt", "Giờ trưa và tối đông, có thể phải đợi", "Quán có nhiều chi nhánh, địa chỉ 328 Phan Đình Phùng, giờ mở các nguồn ghi 9:30–21:00 hoặc 10:00–22:00, gọi trước"),
   "Nem nướng là món ăn đặc trưng của Đà Lạt, thịt heo xay nướng thơm, cuốn bánh tráng cùng rau sống và chả giò, chấm nước sốt đậu phộng.",
   "328 Phan Đình Phùng", 0, meal="lunch", desc="Quán nem nướng nổi tiếng.", dishes=["Nem nướng", "Chả giò", "Nước sốt"]),
 place("banh-uot-long-ga", "Bánh ướt lòng gà Đà Lạt", "food", "midday", 11.9420, 108.4420, 45, 45000, "06:00", "20:00", "food",
   H("Bánh ướt mềm ăn với lòng gà, chả lụa, hành phi", "Địa chỉ chưa xác minh, tra trên Google Maps", "Hợp bữa sáng hoặc trưa nhẹ"),
   "Bánh ướt lòng gà là món sáng quen thuộc của Đà Lạt, bánh tráng mỏng ăn kèm lòng gà, chả, rau thơm và nước mắm pha ngọt.",
   "Khu trung tâm (chưa xác minh số nhà)", 0, meal="lunch", desc="Quán bánh ướt lòng gà quen thuộc.", dishes=["Bánh ướt lòng gà", "Bánh ướt chả lụa"]),
 place("banh-can-da-lat", "Bánh căn Đà Lạt", "food", "midday", 11.9440, 108.4400, 45, 50000, "06:00", "21:00", "food",
   H("Bánh căn nhỏ nướng giòn, chấm nước mắm hoặc ăn với trứng cút, tôm, mực", "Địa chỉ chưa xác minh, tra trên Google Maps", "Hợp ăn sáng hoặc tối nhẹ"),
   "Bánh căn Đà Lạt nướng trong khuôn đất, giòn nhẹ, ăn nóng cùng nước chấm cá, nước dùng hoặc mắm, là món nhẹ cho buổi tối se lạnh.",
   "Khu trung tâm (chưa xác minh số nhà)", 0, meal="lunch", desc="Quán bánh căn quen thuộc.", dishes=["Bánh căn", "Bánh căn trứng", "Bánh căn tôm"]),
 place("lau-ga-la-e", "Lẩu gà lá é", "food", "evening", 11.9420, 108.4400, 90, 250000, "10:00", "22:00", "food",
   H("Lẩu gà nấu với lá é thơm đặc trưng của Đà Lạt, hợp tối lạnh", "Nên đi nhóm 3 đến 4 người", "Địa chỉ chưa xác minh, tra trên Google Maps"),
   "Lẩu gà lá é là món đặc sản của Đà Lạt, gà ta nấu nước dùng nhẹ với lá é, ăn cùng bún, rau và nấm.",
   "Khu trung tâm (chưa xác minh số nhà)", 0, meal="dinner", desc="Quán lẩu gà lá é nổi tiếng.", dishes=["Lẩu gà lá é", "Gà nướng", "Rau rừng"], aud=["nhom_ban", "gia_dinh", "cap_doi"]),
 place("rau-cu-nuong-da-lat", "Bữa tối nướng và rau củ Đà Lạt", "food", "evening", 11.9440, 108.4430, 90, 220000, "16:00", "22:00", "food",
   H("Nướng than tại bàn, thêm rau củ tươi và nấm vùng cao", "Quán mẫu, chưa phải quán thật"),
   "Đà Lạt nổi tiếng với rau củ sạch và thịt nướng, một bữa tối nướng nóng hổi là cách ấm lòng sau ngày dài.",
   "Khu trung tâm (quán mẫu)", 0, meal="dinner", desc="Quán nướng tại bàn.", dishes=["Thịt nướng", "Rau củ nướng", "Nấm"], aud=["nhom_ban", "gia_dinh", "cap_doi", "mot_minh"]),
 # ---- Cà phê
 place("me-linh-coffee-garden", "Mê Linh Coffee Garden", "cafe", "afternoon", 11.8800, 108.4560, 90, 60000, "07:00", "21:00", "cafe",
   H("Quán cà phê vườn nhìn xuống đồi, có thể ngắm hoàng hôn", "Đường tới hơi xa trung tâm, địa chỉ chưa xác minh", "Hợp đi chiều"),
   "Quán cà phê vườn nằm trên sườn đồi, không gian thoáng, nhìn xuống thung lũng và những dãy thông, ngồi lâu cũng không chán.",
   "Khu ngoại ô phía nam (chưa xác minh)", 2, desc="Quán cà phê vườn nhìn xuống đồi.", dishes=["Cà phê", "Trà", "Bánh ngọt"], aud=["cap_doi", "nhom_ban", "mot_minh"]),
 place("cf-san-may-da-lat", "Quán cà phê săn mây Đà Lạt (mẫu)", "cafe", "morning", 11.9300, 108.4600, 75, 60000, "05:00", "10:00", "cafe",
   H("Đến sớm để thấy mây tan, mang áo ấm", "Quán mẫu, chưa phải quán thật"),
   "Cà phê săn mây buổi sáng sớm là trải nghiệm quen thuộc của Đà Lạt, vừa uống cà phê nóng vừa ngắm biển mây.",
   "Đồi quanh thành phố (quán mẫu)", 1, desc="Quán cà phê ngắm mây buổi sáng.", dishes=["Cà phê nóng", "Sữa nóng", "Bánh mì"]),
 place("cf-vuon-da-lat", "Quán cà phê vườn hoa Đà Lạt (mẫu)", "cafe", "afternoon", 11.9400, 108.4400, 75, 65000, "07:00", "21:00", "cafe",
   H("Ngồi sân vườn hoa, thích hợp chụp ảnh", "Quán mẫu, chưa phải quán thật"),
   "Không gian vườn hoa với những chiếc ghế gỗ nhỏ và ly cà phê nóng là hình ảnh quen thuộc của Đà Lạt.",
   "Khu trung tâm (quán mẫu)", 0, desc="Quán cà phê vườn hoa.", dishes=["Cà phê", "Trà hoa", "Bánh ngọt"]),
]
for _p in NEW:
    if _p["id"].startswith("cf-"): _p["sample"] = True

HOTELS = [
 ("dl-hostel", "hostel-bien", "Hostel trung tâm Đà Lạt (mẫu)", "Trung tâm", 220000, 11.9430, 108.4380, "Hostel nhỏ gần chợ Đà Lạt, phù hợp đi tiết kiệm.", ["Wifi", "Bếp chung"]),
 ("dl-homestay", "homestay", "Homestay vườn hoa (mẫu)", "Phường 1", 400000, 11.9380, 108.4400, "Homestay có vườn hoa nhỏ, ấm cúng, gần hồ Xuân Hương.", ["Wifi", "Ăn sáng"]),
 ("dl-3sao", "3sao-tt", "Khách sạn 3 sao gần chợ (mẫu)", "Trung tâm", 700000, 11.9425, 108.4390, "Khách sạn 3 sao gần chợ đêm và hồ Xuân Hương, có lò sưởi trong phòng.", ["Wifi", "Ăn sáng"]),
 ("dl-3sao-ho", "3sao-bien", "Khách sạn 3 sao view hồ (mẫu)", "Hồ Xuân Hương", 880000, 11.9450, 108.4420, "Khách sạn 3 sao nhìn ra hồ Xuân Hương, ban công thoáng.", ["Wifi", "Ăn sáng"]),
 ("dl-4sao", "4sao-tt", "Khách sạn 4 sao trung tâm (mẫu)", "Trung tâm", 1500000, 11.9410, 108.4410, "Khách sạn 4 sao gần hồ, có nhà hàng và spa.", ["Wifi", "Ăn sáng", "Spa"]),
 ("dl-4sao-doi", "4sao-bien", "Khách sạn 4 sao trên đồi (mẫu)", "Đồi thông", 1750000, 11.9350, 108.4470, "Khách sạn 4 sao trên đồi thông, nhìn ra thành phố.", ["Wifi", "Ăn sáng", "Spa"]),
 ("dl-resort", "resort-nhs", "Resort 5 sao rừng thông (mẫu)", "Hồ Tuyền Lâm", 3400000, 11.8850, 108.4300, "Resort 5 sao giữa rừng thông, gần hồ Tuyền Lâm, có spa và nhà hàng.", ["Wifi", "Ăn sáng", "Spa", "Hồ bơi nóng"]),
 ("dl-villa", "villa", "Villa nguyên căn có lò sưởi (mẫu)", "Đồi thông", 4200000, 11.9330, 108.4500, "Villa riêng có lò sưởi và sân vườn, hợp nhóm bạn hoặc gia đình đông người.", ["Wifi", "Ăn sáng", "Lò sưởi", "Bếp"]),
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
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=CITY, googleQuery=name.replace(" (mẫu)", "") + " Đà Lạt")
        for rt in h.get("roomTypes", []): rt["view"] = {"Mỹ Khê": area}.get(rt.get("view"), rt.get("view"))
        h["reviews"] = [dict(r, text=r["text"].replace("Đà Nẵng", "Đà Lạt")) for r in h.get("reviews", [])]
        opts["hotels"].append(h)
    # thêm nơi khởi hành Đà Nẵng (dùng khi đi tới Nha Trang, Phú Quốc, Đà Lạt)
    if not any(o["id"] == "da-nang" for o in opts["origins"]): opts["origins"].append({"id": "da-nang", "name": "Đà Nẵng"})
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Đà Lạt:", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))

main()
