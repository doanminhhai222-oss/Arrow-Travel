#!/usr/bin/env python3
"""Thêm điểm đến Hà Nội: địa điểm (di sản, bảo tàng, phố cổ, làng nghề, quán ăn, cà phê) vào data/da-nang.json và khách sạn MẪU vào data/travel-options.json.
Địa điểm là nơi có thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), khách sạn là dữ liệu MẪU. Chạy lại được, không trùng.
Chạy: python3 scripts/add-hanoi.py"""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
CITY = "Hà Nội"
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
 # ---- Hồ Gươm, phố cổ và trung tâm
 place("ho-hoan-kiem", "Hồ Hoàn Kiếm và Tháp Rùa", "checkin", "morning", 21.0285, 105.8523, 60, 0, "00:00", "23:59", "bridge",
   H("Dạo quanh hồ khoảng 1,7 km, đẹp nhất sáng sớm khi người Hà Nội tập thể dục", "Cuối tuần phố quanh hồ cấm xe và thành phố đi bộ", "Hoàng hôn và buổi tối đèn hồ rất đẹp"),
   "Hồ nằm giữa lòng thủ đô, gắn với truyền thuyết vua Lê Lợi trả gươm thần cho rùa vàng nên có tên Hoàn Kiếm (trả gươm). Giữa hồ là Tháp Rùa nhỏ nhắn, là biểu tượng quen thuộc của Hà Nội.",
   "Quận Hoàn Kiếm, trung tâm Hà Nội", 1),
 place("den-ngoc-son", "Đền Ngọc Sơn và Cầu Thê Húc", "culture", "morning", 21.0309, 105.8525, 40, 50000, "07:30", "18:00", "temple",
   H("Cầu Thê Húc sơn đỏ nổi bật, đi sáng sớm hoặc cuối chiều để chụp ảnh", "Giá vé khoảng 50.000 đ, kiểm tra lại khi đi", "Ăn mặc lịch sự khi vào khu thờ"),
   "Ngôi đền nằm trên đảo Ngọc ở phía bắc hồ Hoàn Kiếm, nối với bờ bằng cầu Thê Húc (nghĩa là nơi đậu ánh sáng buổi sớm), thờ Văn Xương Đế Quân và Trần Hưng Đạo, cùng nhiều nhà văn hoá cổ.",
   "Hồ Hoàn Kiếm, đảo Ngọc", 1),
 place("pho-co-ha-noi", "Phố cổ Hà Nội (36 phố phường)", "checkin", "afternoon", 21.0340, 105.8500, 150, 0, "00:00", "23:59", "market",
   H("Đi bộ qua các phố Hàng Bạc, Hàng Đào, Hàng Gai, Mã Mây, nên đi bộ hơn đi xe", "Tránh giờ cao điểm 17h–19h, xe máy đông và hẹp", "Giữ kỹ điện thoại và ví khi băng qua đường"),
   "Khu phố cổ mang tên 36 phố phường, mỗi phố từng chuyên một nghề hay một mặt hàng như bạc, đường, thiếc, lược, kể từ thời Thăng Long xưa. Nhiều tên phố bắt đầu bằng \"Hàng\" vẫn giữ dấu tích ấy.",
   "Quận Hoàn Kiếm, quanh chợ Đồng Xuân", 2),
 place("cho-dong-xuan", "Chợ Đồng Xuân", "checkin", "morning", 21.0388, 105.8497, 60, 0, "06:00", "18:00", "market",
   H("Chợ đầu mối vải, đồ gia dụng, quà lưu niệm, buổi tối có chợ đêm cuối tuần quanh đây", "Hỏi giá và trả giá nhẹ", "Giữ kỹ đồ cá nhân"),
   "Chợ lớn nhất của khu phố cổ, được xây từ cuối thế kỷ 19, nơi bán buôn bán lẻ nhiều mặt hàng và là một ký ức quen thuộc của người Hà Nội.",
   "Phố Đồng Xuân, phố cổ", 1),
 place("pho-ta-hien", "Phố Tạ Hiện và phố đi bộ Hồ Gươm", "show", "evening", 21.0345, 105.8520, 90, 0, "17:00", "23:59", "lantern",
   H("Phố bia hơi, quán nhậu đông vui, nhộn nhịp nhất tối cuối tuần", "Phố đi bộ quanh Hồ Gươm hoạt động từ chiều thứ Sáu đến Chủ nhật", "Giữ kỹ đồ cá nhân, uống có trách nhiệm"),
   "Con phố nhỏ ngay trong phố cổ nổi tiếng với bia hơi, đồ nhắm và không khí đường phố về đêm. Cùng với phố đi bộ quanh hồ, đây là nơi thấy rõ nhịp sống về đêm của thủ đô.",
   "Phố Tạ Hiện, phố cổ", 1, kids=False),
 place("nha-hat-mua-roi", "Nhà hát Múa rối nước Thăng Long", "show", "evening", 21.0309, 105.8537, 60, 150000, "09:00", "21:30", "boat",
   H("Vé khoảng 100.000–200.000 đ tuỳ hạng ghế, nên đặt trước mùa đông khách (tháng 11 đến tháng 3)", "Mỗi suất khoảng 50 phút, xem tới đâu hiểu tới đó nhờ có thuyết minh nhiều thứ tiếng", "Trẻ em thích"),
   "Múa rối nước là nghệ thuật dân gian của vùng đồng bằng sông Hồng, có từ hơn một nghìn năm, người điều khiển đứng trong nước sau bức mành, con rối \"múa\" trên mặt nước với nhạc dân tộc.",
   "57B Đinh Tiên Hoàng, cạnh Hồ Gươm", 0),
 place("nha-tho-lon", "Nhà thờ Lớn Hà Nội", "checkin", "afternoon", 21.0289, 105.8489, 40, 0, "08:00", "19:00", "temple",
   H("Chụp ảnh phía ngoài, vào trong theo giờ lễ, ăn mặc kín đáo", "Các quán cà phê quanh nhà thờ là nơi ngồi ngắm", "Giờ mở cửa có thể thay đổi, kiểm tra lại"),
   "Nhà thờ Chính toà thánh Giuse xây năm 1886–1887 theo kiến trúc Gothic, hai tháp chuông vuông nổi bật giữa khu phố sầm uất, là một trong những điểm chụp ảnh quen thuộc của Hà Nội.",
   "40 Nhà Chung, Hoàn Kiếm", 0),
 place("nha-hat-lon", "Nhà hát Lớn Hà Nội", "checkin", "evening", 21.0243, 105.8573, 40, 0, "00:00", "23:59", "museum",
   H("Chụp ảnh phía ngoài, quảng trường phía trước đẹp lúc tối", "Có thể xem biểu diễn nếu có lịch, đặt vé trước", "Gần các quán cà phê và bảo tàng"),
   "Công trình kiến trúc Pháp khánh thành năm 1911, lấy cảm hứng từ Nhà hát Garnier ở Paris. Nơi diễn ra các chương trình nghệ thuật lớn và là biểu tượng của khu phố Pháp.",
   "1 Tràng Tiền, Hoàn Kiếm", 0),
 place("cau-long-bien", "Cầu Long Biên", "checkin", "evening", 21.0436, 105.8587, 60, 0, "00:00", "23:59", "bridge",
   H("Đi lúc hoàng hôn, ngắm sông Hồng và nhịp sống hai bên cầu", "Cầu còn dành cho tàu hoả, xe thô sơ, người đi bộ, luôn đi đúng làn và cẩn thận", "Nên đi nhóm, tránh đi một mình quá muộn"),
   "Cây cầu thép bắc qua sông Hồng do người Pháp xây (1899–1902), dài khoảng 1,7 km, từng là cây cầu dài nhất Đông Dương và là chứng nhân nhiều biến cố lịch sử của thủ đô.",
   "Nối quận Hoàn Kiếm và Long Biên", 2, elderly=False),
 place("pho-duong-tau", "Phố đường tàu Hà Nội", "checkin", "afternoon", 21.0295, 105.8440, 45, 0, "00:00", "23:59", "bridge",
   H("Đường ray chạy sát nhà dân, an toàn là trên hết: không đứng trên đường ray khi tàu sắp qua", "Quy định cho khách vào và quán ven đường ray đã thay đổi nhiều lần, kiểm tra tình trạng trước khi đi", "Tuỳ lịch tàu, hỏi người dân giờ tàu chạy"),
   "Khu dân cư mà đường sắt Bắc – Nam chạy xuyên qua với nhà hai bên sát đường ray, nổi tiếng nhờ cảnh tàu chạy sát nhà dân, phản ánh cuộc sống thường ngày độc đáo của thủ đô.",
   "Phố Phùng Hưng và khu vực lân cận, Hoàn Kiếm", 1, kids=False, elderly=False),
 # ---- Di sản, bảo tàng, tâm linh
 place("van-mieu", "Văn Miếu – Quốc Tử Giám", "culture", "morning", 21.0277, 105.8355, 90, 70000, "08:00", "17:00", "temple",
   H("Giá vé khoảng 70.000 đ, kiểm tra lại khi đi", "Đi sáng sớm cho vắng, cuối tuần thường có sinh viên chụp ảnh tốt nghiệp", "Đừng bỏ qua vườn bia đá tiến sĩ"),
   "Xây từ năm 1070 thời nhà Lý để thờ Khổng Tử, đến năm 1076 mở Quốc Tử Giám, trường đại học đầu tiên của Việt Nam. Trong khuôn viên có 82 bia đá khắc tên các tiến sĩ, được UNESCO ghi nhận là Di sản tư liệu thế giới.",
   "58 Quốc Tử Giám, Đống Đa", 1),
 place("hoang-thanh-thang-long", "Hoàng thành Thăng Long", "culture", "morning", 21.0367, 105.8404, 100, 100000, "08:00", "17:00", "museum",
   H("Vé khoảng 100.000 đ (giảm 50% cho người cao tuổi), kiểm tra lại khi đi", "Thường đóng cửa thứ Hai, hỏi lại trước khi đi", "Đi bộ khá nhiều, mang nón và nước"),
   "Trung tâm quyền lực của nhiều triều đại từ khi vua Lý Thái Tổ dời đô về Thăng Long năm 1010, được UNESCO công nhận Di sản văn hoá thế giới năm 2010. Khu di tích có Đoan Môn, điện Kính Thiên và những dấu tích khảo cổ nhiều lớp.",
   "19C Hoàng Diệu, Ba Đình", 2),
 place("lang-bac", "Lăng Chủ tịch Hồ Chí Minh và Quảng trường Ba Đình", "culture", "morning", 21.0368, 105.8346, 90, 0, "07:30", "11:00", "temple",
   H("Lăng tu bổ định kỳ hằng năm; theo thông báo, năm 2026 tạm ngừng đón khách từ ngày 4/9 đến hết ngày 2/11, mở lại từ 3/11. Kiểm tra lại lịch trước khi đi", "Thường mở sáng thứ Ba, Tư, Năm, Bảy và Chủ nhật, nghỉ thứ Hai và thứ Sáu", "Ăn mặc lịch sự, gửi điện thoại và máy ảnh, giữ trật tự nghiêm"),
   "Lăng nơi an nghỉ của Chủ tịch Hồ Chí Minh, khánh thành năm 1975, nằm trên Quảng trường Ba Đình, nơi ngày 2/9/1945 Người đọc bản Tuyên ngôn độc lập. Khuôn viên còn có Phủ Chủ tịch và Nhà sàn Bác Hồ.",
   "2 Hùng Vương, Ba Đình", 2, kids=True),
 place("chua-mot-cot", "Chùa Một Cột", "culture", "morning", 21.0359, 105.8336, 25, 0, "07:00", "18:00", "temple",
   H("Gần Lăng Bác, ghép được trong một buổi sáng", "Ăn mặc kín đáo, vào chùa nhẹ nhàng", "Rất nhỏ, chỉ mất khoảng 20 phút"),
   "Ngôi chùa dựng năm 1049 dưới thời vua Lý Thái Tông, kiến trúc độc đáo như một đoá sen nở trên một cột đá giữa hồ, là biểu tượng của Hà Nội.",
   "Phố Chùa Một Cột, Ba Đình", 1),
 place("chua-tran-quoc", "Chùa Trấn Quốc", "culture", "afternoon", 21.0482, 105.8368, 45, 0, "07:30", "18:00", "temple",
   H("Ngôi chùa trên một đảo nhỏ ở hồ Tây, đẹp lúc chiều muộn", "Ăn mặc kín đáo", "Có thể kết hợp đi dạo hồ Tây"),
   "Chùa được cho là cổ nhất Hà Nội, có lịch sử hơn 1.500 năm, nằm trên đảo nhỏ nhô ra hồ Tây. Tháp Bảo Tháp cao 11 tầng với tượng Phật trong ánh sáng ấm áp là hình ảnh quen thuộc của chùa.",
   "Đường Thanh Niên, Tây Hồ", 1),
 place("phu-tay-ho", "Phủ Tây Hồ", "culture", "afternoon", 21.0600, 105.8230, 40, 0, "06:00", "18:00", "temple",
   H("Điểm tâm linh nổi tiếng, đông vào ngày rằm và mùng một", "Ăn mặc lịch sự, giữ trật tự", "Có thể ăn bánh tôm Hồ Tây gần đó"),
   "Phủ thờ Mẫu Liễu Hạnh, một trong Tứ bất tử của tín ngưỡng dân gian Việt Nam, nằm ngay bên hồ Tây và là nơi người Hà Nội đến cầu may đầu năm.",
   "Phố Thanh Niên, Tây Hồ", 1),
 place("ho-tay", "Hồ Tây (dạo đường Thanh Niên)", "park", "afternoon", 21.0585, 105.8270, 90, 0, "00:00", "23:59", "boat",
   H("Dạo hoặc đạp xe quanh hồ, đẹp nhất lúc chiều muộn", "Nhiều quán cà phê và nhà hàng ven hồ", "Có thể đi thuyền vịt hoặc xe điện quanh hồ (hỏi giá)"),
   "Hồ nước ngọt lớn nhất Hà Nội, chu vi khoảng 17 km, là nơi người dân đi dạo, tập thể dục và thưởng thức hoàng hôn, xung quanh có nhiều đền chùa cổ.",
   "Quận Tây Hồ", 1),
 place("nha-tu-hoa-lo", "Nhà tù Hỏa Lò", "culture", "afternoon", 21.0253, 105.8466, 60, 50000, "08:00", "17:00", "museum",
   H("Giá vé khoảng 50.000 đ, kiểm tra lại khi đi", "Di tích lịch sử nặng nề, trẻ nhỏ có thể thấy khó chịu", "Có thuyết minh nhiều thứ tiếng"),
   "Nhà tù do người Pháp xây từ năm 1896 để giam người yêu nước, về sau còn giam các phi công Mỹ trong chiến tranh và được gọi là \"Hanoi Hilton\". Nay là bảo tàng lịch sử.",
   "1 Hoả Lò, Hoàn Kiếm", 1, kids=False),
 place("bao-tang-dan-toc-hoc", "Bảo tàng Dân tộc học Việt Nam", "culture", "morning", 21.0408, 105.7984, 120, 40000, "08:30", "17:30", "museum",
   H("Có khu ngoài trời với nhà rông, nhà dài của nhiều dân tộc", "Giá vé là ước lượng (các nguồn ghi khác nhau), kiểm tra khi đi", "Cách trung tâm khoảng 7 km, đi taxi hoặc xe công nghệ"),
   "Bảo tàng giới thiệu đời sống, văn hoá của 54 dân tộc Việt Nam qua hiện vật, trang phục, ảnh và khu trưng bày ngoài trời với các ngôi nhà truyền thống dựng lại nguyên bản.",
   "Nguyễn Văn Huyên, Cầu Giấy", 1),
 place("bao-tang-phu-nu", "Bảo tàng Phụ nữ Việt Nam", "culture", "afternoon", 21.0227, 105.8546, 75, 40000, "08:00", "17:00", "museum",
   H("Có máy lạnh, mát vào buổi trưa nóng", "Giá vé là ước lượng, kiểm tra lại"),
   "Bảo tàng kể về vai trò, đời sống và đóng góp của người phụ nữ Việt Nam qua nhiều thời kỳ, từ nghề thủ công, phong tục cưới hỏi đến những người phụ nữ trong chiến tranh.",
   "36 Lý Thường Kiệt, Hoàn Kiếm", 0),
 place("bao-tang-my-thuat", "Bảo tàng Mỹ thuật Việt Nam", "culture", "afternoon", 21.0290, 105.8350, 75, 40000, "08:30", "17:00", "museum",
   H("Tranh, điêu khắc và đồ gốm từ thời cổ đến hiện đại", "Gần Văn Miếu, ghép trong một buổi", "Giá vé là ước lượng, kiểm tra lại"),
   "Bảo tàng nằm trong một toà nhà kiến trúc Pháp pha nét Á Đông, trưng bày nhiều bức tranh sơn mài, tranh lụa và điêu khắc nổi tiếng của mỹ thuật Việt Nam.",
   "66 Nguyễn Thái Học, Ba Đình", 0),
 # ---- Làng nghề, ngoại ô
 place("lang-gom-bat-trang", "Làng gốm Bát Tràng", "culture", "morning", 20.9772, 105.9108, 150, 0, "07:00", "17:30", "museum",
   H("Có thể tự tay nặn gốm trên bàn xoay, hỏi giá lớp trước khi đặt", "Cách trung tâm khoảng 13 km, đi xe buýt hoặc xe công nghệ", "Mua gốm làm quà, hỏi cách đóng gói khi bay"),
   "Làng nghề gốm lâu đời ven sông Hồng, có lịch sử hàng trăm năm với những sản phẩm bát đĩa, bình lọ, đồ trang trí men trắng, men lam, rất được du khách mua làm quà.",
   "Gia Lâm, cách trung tâm khoảng 13 km", 1),
 place("lang-lua-van-phuc", "Làng lụa Vạn Phúc", "culture", "afternoon", 20.9760, 105.7780, 75, 0, "08:00", "17:30", "museum",
   H("Phố nhỏ bán lụa tơ tằm, có thể mua khăn, áo dài làm quà", "Hỏi rõ lụa thật hay lụa pha trước khi mua", "Đi tắc xi hoặc xe công nghệ, gần Hà Đông"),
   "Làng lụa có truyền thống hơn nghìn năm ở Hà Đông, nổi tiếng với lụa tơ tằm mềm mại, mát, từng được dùng làm cống phẩm cho cung đình.",
   "Hà Đông, cách trung tâm khoảng 10 km", 1),
 place("chua-huong", "Chùa Hương (Hương Sơn)", "culture", "morning", 20.6170, 105.7440, 480, 150000, "06:00", "17:00", "boat",
   H("Cách Hà Nội khoảng 60 km, đi xe khoảng 2 giờ, nên đi trong ngày từ sáng sớm", "Đi đò suối Yến rồi leo núi hoặc đi cáp treo, hỏi giá đò và vé cáp kỹ", "Mùa lễ hội đầu năm (từ khoảng mùng 6 tháng Giêng) rất đông", "Mang giày thoải mái, nước và nón"),
   "Quần thể chùa trong hang động núi đá vôi bên suối Yến, nổi tiếng với lễ hội kéo dài vài tháng đầu năm. Hành trình ngồi đò qua núi non rồi leo lên động Hương Tích là một trải nghiệm tâm linh và thiên nhiên.",
   "Mỹ Đức, cách Hà Nội khoảng 60 km", 3, elderly=False),
 # ---- Quán ăn
 place("pho-thin-lo-duc", "Phở Thìn Lò Đúc", "food", "midday", 21.0155, 105.8570, 45, 70000, "06:00", "21:30", "food",
   H("Phở bò tái lăn, nướng xào thơm mùi hành", "Giờ cao điểm đông, nên đi sớm", "Quán chỉ phục vụ một món chính"),
   "Quán phở nổi tiếng do ông Nguyễn Trọng Thìn mở từ năm 1979, phở bò tái lăn: thịt bò xào nóng với tỏi rồi chan nước dùng, vị đậm đà đặc trưng.",
   "13 Lò Đúc, Hai Bà Trưng", 0, meal="lunch", desc="Quán phở bò tái lăn nổi tiếng.", dishes=["Phở tái lăn", "Phở chín", "Quẩy"]),
 place("pho-bat-dan", "Phở Bát Đàn (Phở gia truyền)", "food", "midday", 21.0340, 105.8470, 40, 60000, "06:00", "10:00", "food",
   H("Tự chọn món, gọi và trả tiền tại quầy, nhận tô phở, chỉ nhận tiền mặt", "Xếp hàng khá lâu giờ cao điểm", "Thường mở sáng sớm, kiểm tra giờ"),
   "Quán phở gia truyền nằm trên phố Bát Đàn, được Michelin Bib Gourmand ghi nhận, nổi tiếng với nước dùng trong ngọt và thịt bò mềm; nhiều người coi đây là hương vị phở truyền thống Hà Nội.",
   "Phố Bát Đàn, phố cổ (chưa xác minh số nhà)", 0, meal="lunch", desc="Phở gia truyền, xếp hàng tự phục vụ.", dishes=["Phở bò chín", "Phở bò tái", "Quẩy"]),
 place("bun-cha-huong-lien", "Bún chả Hương Liên", "food", "midday", 21.0150, 105.8515, 50, 85000, "08:00", "20:30", "food",
   H("Quán nổi tiếng vì Tổng thống Mỹ ghé ăn năm 2016, gọi combo bún chả, nem cua bể và bia Hà Nội", "Giờ trưa rất đông", "Chả nướng than hoa thơm đặc trưng"),
   "Bún chả là món đặc trưng của Hà Nội: chả thịt lợn nướng than hoa ăn kèm bún sợi và nước chấm chua ngọt thơm, thêm rau sống và nem cua bể.",
   "24 Lê Văn Hưu, Hai Bà Trưng", 0, meal="lunch", desc="Quán bún chả nổi tiếng nhất nhì Hà Nội.", dishes=["Bún chả", "Nem cua bể", "Bia Hà Nội"]),
 place("bun-cha-dac-kim", "Bún chả Đắc Kim", "food", "midday", 21.0330, 105.8505, 45, 70000, "10:00", "20:00", "food",
   H("Quán bún chả lâu đời ở phố cổ, chả viên và chả miếng", "Địa chỉ chưa xác minh, tra \"bún chả Đắc Kim\" trên Google Maps"),
   "Quán bún chả truyền thống giữa phố cổ, nổi tiếng nhờ mùi chả nướng than bay ra phố và nước chấm cân bằng chua ngọt.",
   "Phố Hàng Mành, phố cổ (chưa xác minh số nhà)", 0, meal="lunch", desc="Bún chả phố cổ, nướng than hoa.", dishes=["Bún chả", "Nem rán", "Chả chả"]),
 place("cha-ca-thang-long", "Chả cá Thăng Long", "food", "evening", 21.0340, 105.8470, 75, 180000, "11:00", "21:30", "food",
   H("Cá lăng ướp nghệ, nướng rồi áp chảo tại bàn với thì là, hành", "Michelin ghi địa chỉ 6B Đường Thành, nguồn khác ghi số khác, kiểm tra lại", "Hợp ăn tối, nên đặt bàn"),
   "Chả cá là món Hà Nội nổi tiếng: cá lăng ướp nghệ, riềng, nướng và rán nóng tại bàn với thì là và hành lá, ăn với bún, đậu phộng và mắm tôm.",
   "6B Đường Thành, Hoàn Kiếm", 0, meal="dinner", desc="Quán chả cá nổi tiếng, được Michelin ghi nhận.", dishes=["Chả cá", "Bún", "Mắm tôm"], aud=["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]),
 place("xoi-yen", "Xôi Yến", "food", "midday", 21.0225, 105.8488, 30, 40000, "05:00", "23:59", "food",
   H("Xôi xéo, xôi thịt kho, xôi pate nóng hổi, chỉ nhận tiền mặt", "Hợp bữa sáng hoặc bữa nhẹ", "Quán trên phố Nguyễn Hữu Huân"),
   "Xôi là món sáng bình dân của người Hà Nội, hạt nếp dẻo thơm ăn kèm nhân đậu xanh, hành phi, thịt kho, trứng.",
   "35B Nguyễn Hữu Huân, Hoàn Kiếm", 0, meal="lunch", desc="Quán xôi nổi tiếng khu phố cổ.", dishes=["Xôi xéo", "Xôi thịt kho", "Xôi pate"]),
 place("banh-mi-25", "Bánh mì 25", "food", "midday", 21.0335, 105.8510, 20, 35000, "06:30", "20:30", "food",
   H("Bánh mì nóng giòn, nhân đa dạng, giá khoảng 30.000–40.000 đ", "Quán có ba quầy gần nhau trên phố Hàng Cá", "Rất đông giờ trưa, hợp ăn nhanh"),
   "Bánh mì Hà Nội thường mỏng ruột, giòn vỏ, nhân thịt nướng, pate, dưa góp, được nhiều người chọn làm bữa nhẹ khi dạo phố cổ.",
   "25 Hàng Cá, phố cổ", 0, meal="lunch", desc="Tiệm bánh mì quen thuộc của phố cổ.", dishes=["Bánh mì thịt", "Bánh mì pate", "Bánh mì trứng"]),
 place("bun-thang-ba-duc", "Bún thang Bà Đức", "food", "midday", 21.0338, 105.8499, 45, 65000, "07:00", "21:00", "food",
   H("Bún thang cầu kỳ: gà xé, trứng thái chỉ, giò lụa, tôm khô, nước dùng trong", "Hợp bữa sáng hoặc trưa nhẹ", "Hỏi giờ mở cửa trước khi đi"),
   "Bún thang là món ăn cầu kỳ của Hà Nội, nước dùng trong ngọt từ xương, nấm hương và tôm khô, thêm nhiều lớp topping thái chỉ.",
   "48 Cầu Gỗ, Hoàn Kiếm", 0, meal="lunch", desc="Quán bún thang quen thuộc ở phố cổ.", dishes=["Bún thang", "Nem rán", "Chè"]),
 # ---- Cà phê
 place("ca-phe-giang", "Cà phê Giảng (cà phê trứng)", "cafe", "afternoon", 21.0310, 105.8535, 45, 50000, "07:00", "22:00", "cafe",
   H("Cà phê trứng, quán chen giữa những ngôi nhà nhỏ, lên tầng để có chỗ ngồi", "Nơi đầu tiên pha cà phê trứng, có từ năm 1946", "Đông giờ chiều, nên đi sớm"),
   "Cà phê trứng ra đời năm 1946, khi thiếu sữa, người pha chế thử đánh lòng đỏ trứng với đường và cà phê, tạo nên lớp kem béo mịn, ngọt ngào, trở thành nét đặc sắc của Hà Nội.",
   "39 Nguyễn Hữu Huân, Hoàn Kiếm", 0, desc="Quán cà phê trứng nổi tiếng, mở từ năm 1946.", dishes=["Cà phê trứng", "Cà phê nâu", "Trà"]),
 place("ca-phe-dinh", "Cà phê Đinh", "cafe", "afternoon", 21.0305, 105.8530, 45, 45000, "07:00", "22:00", "cafe",
   H("Lên tầng 2 nhìn Hồ Gươm, cà phê trứng và cà phê muối", "Ngõ vào hơi nhỏ, nhìn kỹ biển hiệu", "Rất đông cuối tuần"),
   "Quán cà phê trong một căn nhà cũ ven Hồ Gươm, nổi tiếng với món cà phê trứng và không gian quen thuộc của người Hà Nội và khách quốc tế.",
   "13 Đinh Tiên Hoàng, Hoàn Kiếm", 0, desc="Quán cà phê trứng nhìn ra Hồ Gươm.", dishes=["Cà phê trứng", "Cà phê muối", "Cà phê nâu"]),
 place("cafe-pho-co", "Cafe Phố Cổ", "cafe", "afternoon", 21.0335, 105.8508, 60, 55000, "08:00", "23:00", "cafe",
   H("Lên sân thượng nhìn ra Hồ Gươm, cà phê trứng", "Đi vào ngõ nhỏ qua một tiệm bán đồ, nhìn kỹ biển hiệu", "Rất đông, đi sớm"),
   "Quán cà phê trong căn nhà cổ giữa phố cổ, từ sân thượng nhìn ra Hồ Gươm, là nơi nghỉ chân quen thuộc khi dạo phố.",
   "11 Hàng Gai, Hoàn Kiếm", 0, desc="Quán cà phê nhà cổ với sân thượng nhìn hồ.", dishes=["Cà phê trứng", "Cà phê sữa", "Trà"]),
 place("kem-trang-tien", "Kem Tràng Tiền", "cafe", "afternoon", 21.0250, 105.8570, 30, 20000, "08:00", "22:00", "cafe",
   H("Ăn kem que đi dạo quanh Hồ Gươm, hương dừa, sô-cô-la, đậu xanh", "Đông nhất vào tối cuối tuần", "Địa chỉ chưa xác minh, tra trên Google Maps"),
   "Kem Tràng Tiền là hương vị tuổi thơ của nhiều thế hệ người Hà Nội, kem que giản dị ăn khi đi dạo quanh hồ, được yêu thích từ thập niên 1960.",
   "Phố Tràng Tiền, Hoàn Kiếm (chưa xác minh số nhà)", 0, desc="Quán kem lâu đời cạnh Hồ Gươm.", dishes=["Kem dừa", "Kem sô-cô-la", "Kem đậu xanh"]),
]

HOTELS = [
 ("hn-hostel", "hostel-bien", "Hostel phố cổ Hà Nội (mẫu)", "Phố cổ", 250000, 21.0340, 105.8500, "Hostel nhỏ trong phố cổ, đi bộ tới Hồ Gươm và chợ đêm.", ["Wifi", "Bếp chung"]),
 ("hn-homestay", "homestay", "Homestay ngõ nhỏ Hoàn Kiếm (mẫu)", "Hoàn Kiếm", 400000, 21.0300, 105.8470, "Homestay trong ngõ nhỏ, phòng gọn, chủ nhà thân thiện.", ["Wifi", "Ăn sáng"]),
 ("hn-3sao", "3sao-tt", "Khách sạn 3 sao phố cổ (mẫu)", "Phố cổ", 850000, 21.0335, 105.8510, "Khách sạn 3 sao trong phố cổ, cách Hồ Gươm khoảng 5 phút đi bộ.", ["Wifi", "Ăn sáng"]),
 ("hn-3sao-ho", "3sao-bien", "Khách sạn 3 sao gần Hồ Tây (mẫu)", "Tây Hồ", 800000, 21.0620, 105.8250, "Khách sạn 3 sao yên tĩnh gần Hồ Tây, ít ồn hơn phố cổ.", ["Wifi", "Ăn sáng"]),
 ("hn-4sao", "4sao-tt", "Khách sạn 4 sao Hoàn Kiếm (mẫu)", "Hoàn Kiếm", 1600000, 21.0270, 105.8530, "Khách sạn 4 sao cạnh Hồ Gươm, có nhà hàng và hồ bơi.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("hn-4sao-bd", "4sao-bien", "Khách sạn 4 sao Ba Đình (mẫu)", "Ba Đình", 1500000, 21.0360, 105.8330, "Khách sạn 4 sao gần Lăng Bác và Hoàng thành, đi bộ tới nhiều di tích.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("hn-resort", "resort-nhs", "Khách sạn 5 sao sang trọng (mẫu)", "Hoàn Kiếm", 3200000, 21.0250, 105.8560, "Khách sạn 5 sao cạnh Nhà hát Lớn, có spa và nhà hàng.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa"]),
 ("hn-villa", "villa", "Khách sạn boutique 5 sao ven Hồ Tây (mẫu)", "Tây Hồ", 4200000, 21.0580, 105.8300, "Khách sạn boutique 5 sao ven Hồ Tây với view hồ, phù hợp cặp đôi và nhóm nhỏ.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa"]),
]

# Lăng Bác nghỉ thứ Hai và thứ Sáu, tu bổ định kỳ 2026 từ 4/9 đến hết 2/11 (theo thông báo); lịch xếp tự tránh những ngày này
for _p in NEW:
    if _p["id"] == "lang-bac":
        _p["closedWeekdays"] = [1, 5]; _p["closedBetween"] = [["2026-09-04", "2026-11-02"]]

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
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=CITY, googleQuery=name.replace(" (mẫu)", "") + " Hà Nội")
        for rt in h.get("roomTypes", []): rt["view"] = {"Mỹ Khê": area, "Biển": "Phố", "Một phần hướng biển": "Một phần hướng hồ", "Phòng Deluxe hướng biển": "Phòng Deluxe"}.get(rt.get("view"), rt.get("view"))
        for rt in h.get("roomTypes", []): rt["name"] = rt["name"].replace("hướng biển", "view đẹp")
        h["reviews"] = [dict(r, text=r["text"].replace("biển", "khu vực").replace("Đà Nẵng", "Hà Nội")) for r in h.get("reviews", [])]
        h["description"] = desc
        opts["hotels"].append(h)
    # thêm nơi khởi hành Đà Nẵng (dùng khi đi tới Hà Nội, Phú Quốc)
    if not any(o["id"] == "da-nang" for o in opts["origins"]): opts["origins"].append({"id": "da-nang", "name": "Đà Nẵng"})
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Hà Nội:", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))

main()
