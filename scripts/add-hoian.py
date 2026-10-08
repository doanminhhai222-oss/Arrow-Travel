#!/usr/bin/env python3
"""Thêm điểm đến Hội An: địa điểm (di sản, check-in, làng nghề, biển, quán ăn, cà phê) vào data/da-nang.json và khách sạn MẪU vào data/travel-options.json.
Địa điểm là nơi có thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), khách sạn là dữ liệu MẪU. Chạy lại được, không trùng.
Chạy: python3 scripts/add-hoian.py"""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
CITY = "Hội An"
ALL = ["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]
CHECK = "Toạ độ, giá và giờ mở cửa là ước lượng, hãy kiểm tra lại trên Google Maps trước khi đi"
TICKET = "Nằm trong vé tham quan phố cổ (120.000 đ khách quốc tế, 80.000 đ khách Việt), vé chọn một số điểm trong danh sách di tích"

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
 # ---- Di sản và văn hoá trong phố cổ
 place("pho-co-hoi-an", "Phố cổ Hội An", "checkin", "afternoon", 15.8772, 108.3280, 150, 120000, "07:00", "22:00", "lantern",
   H("Mua vé tham quan phố cổ ở các quầy vé gần Chùa Cầu, góc Lê Lợi – Trần Phú hoặc gần chợ; vé có giá trị suốt thời gian lưu trú", "Giá 120.000 đ khách quốc tế, 80.000 đ khách Việt; vé cho vào một số di tích để chọn, hỏi quầy vé danh sách hiện hành", "Đi sớm hoặc sau 16h cho đỡ nắng và đỡ đông; buổi tối đèn lồng lên rất đẹp", "Khu trung tâm đi bộ, nhiều đoạn cấm xe máy ban ngày"),
   "Hội An là thương cảng quốc tế sầm uất thế kỷ 16–17, nơi thương nhân Nhật, Hoa, Hà Lan, Bồ Đào Nha qua lại buôn bán. Phố cổ được UNESCO công nhận Di sản văn hoá thế giới năm 1999 nhờ hơn một nghìn công trình kiến trúc cổ còn giữ nguyên dáng, từ nhà phố, hội quán đến chùa miếu.",
   "Khu phố cổ Hội An, Minh An", 2),
 place("chua-cau", "Chùa Cầu (Cầu Nhật Bản)", "checkin", "morning", 15.8774, 108.3260, 30, 0, "07:00", "21:00", "bridge",
   H("Biểu tượng của Hội An, đông nhất khoảng 9h–11h, nên đến sớm hoặc lúc chiều muộn", "Chụp ảnh ở bờ đường Trần Phú hoặc đứng trên bậc thềm nhìn cầu", TICKET),
   "Cầu có mái che do thương nhân Nhật xây từ thế kỷ 17, nối khu người Nhật với khu người Hoa. Hai đầu cầu có tượng chó và khỉ, gắn với tuổi của các vị vua và thời điểm khởi công. Hình ảnh Chùa Cầu được in trên tờ tiền 20.000 đồng.",
   "Giao lộ Trần Phú và Nguyễn Thị Minh Khai"),
 place("hoi-quan-phuc-kien", "Hội quán Phúc Kiến", "culture", "morning", 15.8774, 108.3277, 30, 0, "07:00", "17:30", "temple",
   H("Cổng tam quan, sân vườn có bình phong rồng đẹp để chụp ảnh", "Mặc kín đáo khi vào khu thờ", TICKET),
   "Hội quán của người Hoa gốc Phúc Kiến, xây từ cuối thế kỷ 17, thờ Thiên Hậu Thánh Mẫu, vị nữ thần che chở người đi biển. Trong sân có những cuộn hương lớn treo lơ lửng, mỗi cuộn là một lời cầu bình an.",
   "46 Trần Phú"),
 place("nha-co-tan-ky", "Nhà cổ Tấn Ký", "culture", "morning", 15.8769, 108.3288, 30, 0, "08:00", "17:30", "museum",
   H("Chủ nhà thường mời trà, hỏi han và giới thiệu ngôi nhà", "Nhìn kỹ các câu đối khảm xà cừ trên cột gỗ", TICKET),
   "Ngôi nhà hơn 200 năm tuổi của một dòng họ thương nhân, truyền qua nhiều thế hệ. Kiến trúc kết hợp Việt, Hoa, Nhật: cột gỗ lim, trần ba lớp, sân trời lấy sáng và thoát nước.",
   "101 Nguyễn Thái Học"),
 place("nha-co-phung-hung", "Nhà cổ Phùng Hưng", "culture", "morning", 15.8775, 108.3255, 30, 0, "08:00", "17:30", "museum",
   H("Gần Chùa Cầu, ghé trước hoặc sau khi chụp cầu", "Có thể lên tầng hai nhìn xuống phố", TICKET),
   "Ngôi nhà gỗ hai tầng nằm sát Chùa Cầu, lâu đời hơn hai thế kỷ, mang kiến trúc pha Nhật và Việt. Tầng trên có ban công nhìn ra phố, từng là nơi gia đình thương nhân vừa ở vừa buôn bán.",
   "4 Nguyễn Thị Minh Khai"),
 place("nha-co-quan-thang", "Nhà cổ Quân Thắng", "culture", "afternoon", 15.8775, 108.3283, 30, 0, "08:00", "17:30", "museum",
   H("Nhìn kỹ nội thất gỗ chạm khắc tinh xảo", TICKET),
   "Ngôi nhà gỗ của một thương nhân Hoa, hơn 150 năm tuổi, nổi bật với hệ thống cột kèo chạm trổ, sân trời và gian thờ trang nghiêm, cho thấy nếp sống khá giả của giới buôn bán Hội An xưa.",
   "77 Trần Phú"),
 place("hoi-quan-quang-dong", "Hội quán Quảng Đông", "culture", "afternoon", 15.8778, 108.3306, 30, 0, "07:00", "17:30", "temple",
   H("Sân trong có vườn non bộ và tượng cá chép hoá rồng bằng gốm", TICKET),
   "Hội quán của cộng đồng người Quảng Đông, dựng năm 1885, thờ Quan Công, biểu tượng của sự trung nghĩa. Mái ngói âm dương, gốm tượng rồng và cá chép rất công phu.",
   "176 Trần Phú"),
 place("hoi-quan-trieu-chau", "Hội quán Triều Châu", "culture", "afternoon", 15.8781, 108.3310, 25, 0, "07:30", "17:30", "temple",
   H("Chạm khắc gỗ sơn son thếp vàng rất đẹp, ít khách hơn các hội quán khác", TICKET),
   "Hội quán của người Hoa gốc Triều Châu, xây giữa thế kỷ 19, nổi bật với những bức chạm gỗ thếp vàng mô tả điển tích Trung Hoa và đôi cột kèo chạm nổi.",
   "157 Nguyễn Duy Hiệu"),
 place("chua-ong", "Chùa Ông (miếu Quan Công)", "culture", "morning", 15.8772, 108.3268, 25, 0, "07:00", "17:30", "temple",
   H("Có thể thắp hương cầu bình an, khói hương nghi ngút", TICKET),
   "Ngôi miếu thờ Quan Công, dựng từ giữa thế kỷ 17, là nơi người Hội An và người Hoa cầu bình an, buôn may bán đắt. Hai bên cổng có tượng linh vật và những bức tranh gỗ cổ.",
   "24 Trần Phú"),
 place("bao-tang-sa-huynh", "Bảo tàng Văn hoá Sa Huỳnh", "culture", "afternoon", 15.8778, 108.3299, 40, 0, "07:00", "17:30", "museum",
   H("Có máy lạnh, hợp nghỉ trưa nắng", TICKET),
   "Trưng bày hiện vật của nền văn hoá Sa Huỳnh, một nền văn hoá cổ ở miền Trung có niên đại cách nay hơn hai nghìn năm, nổi tiếng với mộ chum, đồ trang sức và đồ gốm. Giúp hiểu Hội An đã có người sinh sống từ rất sớm.",
   "149 Trần Phú"),
 place("bao-tang-gom-su", "Bảo tàng Gốm sứ Mậu dịch", "culture", "afternoon", 15.8773, 108.3284, 30, 0, "07:00", "17:30", "museum",
   H("Nhà cổ hai tầng, mát và yên tĩnh", TICKET),
   "Nơi trưng bày gốm sứ từ nhiều nước (Nhật, Trung Hoa, Việt Nam, Trung Đông) tìm thấy ở Hội An, minh chứng cho vị thế cảng buôn bán quốc tế của thành phố qua nhiều thế kỷ.",
   "80 Trần Phú"),
 place("bao-tang-dan-gian", "Bảo tàng Văn hoá dân gian Hội An", "culture", "afternoon", 15.8767, 108.3273, 35, 0, "07:00", "17:30", "museum",
   H("Có biểu diễn nghề thủ công, lễ hội và đời sống dân gian xưa", TICKET),
   "Ngôi nhà gỗ hai tầng giới thiệu đời sống thường ngày, nghề thủ công, lễ hội và tín ngưỡng của người Hội An. Cửa sổ tầng hai nhìn xuống sông Hoài.",
   "33 Nguyễn Thái Học"),
 place("nha-tho-toc-tran", "Nhà thờ tộc Trần", "culture", "afternoon", 15.8796, 108.3266, 30, 0, "08:00", "17:30", "temple",
   H("Mua vật lưu niệm nhỏ, chủ nhà thường gói quà tận tay", TICKET),
   "Nhà thờ của dòng họ Trần xây năm 1802, dành thờ tổ tiên, kết hợp kiến trúc Việt, Hoa và Nhật. Gian giữa còn giữ gia phả và nhiều đồ thờ cổ của dòng họ.",
   "21 Lê Lợi"),
 place("goc-pho-hoa-giay", "Góc phố vàng hoa giấy", "checkin", "morning", 15.8781, 108.3290, 30, 0, "00:00", "23:59", "lantern",
   H("Tường vàng rêu phong cùng giàn hoa giấy, đẹp nhất sáng sớm khi chưa đông khách", "Đi bộ qua các hẻm quanh Phan Châu Trinh, Nguyễn Thái Học", "Mùa hoa giấy rộ khoảng tháng 3 đến tháng 8"),
   "Những bức tường vàng cũ kỹ phủ hoa giấy hồng đã thành hình ảnh quen thuộc của Hội An, nhờ vôi vàng truyền thống và khí hậu nắng ấm miền Trung.",
   "Khu phố Phan Châu Trinh, Nguyễn Thái Học", 1),
 place("cau-an-hoi", "Cầu An Hội và bờ sông Hoài về đêm", "show", "evening", 15.8761, 108.3299, 60, 0, "17:00", "23:00", "lantern",
   H("Đèn lồng soi mặt nước sông Hoài từ khoảng 18h, đẹp nhất lúc chạng vạng", "Đêm rằm (14 âm lịch) phố cổ tắt đèn điện, chỉ thắp đèn lồng", "Cuối tuần và lễ rất đông, giữ gìn đồ cá nhân"),
   "Sông Hoài là mạch sống của Hội An từ thời thương cảng. Mỗi tối, những chiếc đèn lồng nhiều màu soi bóng xuống nước, người dân và du khách thả hoa đăng cầu may theo tập tục địa phương.",
   "Bờ sông Bạch Đằng"),
 place("tha-hoa-dang", "Thuyền thả hoa đăng sông Hoài", "show", "evening", 15.8765, 108.3296, 45, 50000, "18:00", "22:30", "boat",
   H("Mặc cả hoặc hỏi giá thuyền trước khi lên (giá thường tính theo thuyền, chia đều cho cả nhóm)", "Ước nguyện và thả đèn hoa đăng xuống sông", "Đi lúc chưa quá đông, tránh đỉnh điểm sau 19h"),
   "Thả hoa đăng là tập tục cầu bình an và ước nguyện của người Việt. Ở Hội An, đèn giấy có nến được thả xuống sông Hoài, tạo nên dòng sáng lung linh về đêm.",
   "Bến thuyền bờ sông Bạch Đằng", 0, aud=["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]),
 place("cho-hoi-an", "Chợ Hội An", "checkin", "morning", 15.8761, 108.3328, 60, 0, "05:30", "18:00", "market",
   H("Đi sáng sớm để thấy chợ nhộn nhịp nhất và ăn sáng tại các quầy", "Hỏi giá và trả giá nhẹ trước khi mua", "Giữ kỹ ví và điện thoại ở chỗ đông"),
   "Chợ truyền thống lâu đời gần bến sông, nơi bán rau củ, hải sản, đặc sản và quà lưu niệm. Khu ẩm thực trong chợ có cao lầu, mì Quảng, chè và nhiều món ăn vặt địa phương.",
   "Đường Trần Quý Cáp, gần bờ sông", 1),
 place("cho-dem-nguyen-hoang", "Chợ đêm Nguyễn Hoàng", "show", "evening", 15.8752, 108.3300, 75, 0, "17:00", "22:30", "market",
   H("Nhiều gian hàng quà lưu niệm, đèn lồng, đồ ăn vặt", "Thử bánh tráng nướng, chè, nước mía trước khi dạo", "Cẩn thận ví và hỏi giá trước khi mua"),
   "Khu chợ đêm bên kia cầu An Hội sáng đèn mỗi tối, bán đèn lồng thủ công, đồ lưu niệm và món ăn đường phố, là nơi dạo chơi quen thuộc của du khách sau bữa tối.",
   "Đường Nguyễn Hoàng, bên kia cầu An Hội"),
 place("xuong-den-long", "Xưởng làm đèn lồng Hội An", "checkin", "afternoon", 15.8764, 108.3318, 90, 150000, "09:00", "20:00", "lantern",
   H("Tự tay làm một chiếc đèn lồng nhỏ mang về", "Hỏi giá và thời lượng của lớp học trước khi đặt, mỗi nơi một khác", "Chọn xưởng gần phố cổ trên Google Maps"),
   "Đèn lồng Hội An làm từ khung tre bọc lụa hoặc vải, vốn là thủ công của người Hoa và người Việt ở thương cảng. Lớp học ngắn giúp du khách hiểu cách uốn khung và dán lụa.",
   "Khu phố cổ Hội An (nhiều xưởng, tự chọn trên Google Maps)", 0, elderly=True),
 place("lop-nau-an", "Lớp học nấu ăn Hội An (đi chợ, nấu món địa phương)", "culture", "morning", 15.8765, 108.3335, 180, 500000, "08:00", "13:00", "food",
   H("Thường gồm đi chợ cùng đầu bếp, rồi nấu 3 đến 4 món như cao lầu, gỏi, bánh xèo", "Đặt trước 1 ngày, hỏi rõ giá và thực đơn của từng lớp", "Hợp cặp đôi, nhóm bạn và gia đình có trẻ lớn"),
   "Ẩm thực Hội An là sự giao thoa giữa món Việt, Hoa và Nhật. Lớp nấu ăn là cách thú vị để tìm hiểu rau thơm Trà Quế, nước Bá Lễ và cách làm sợi cao lầu, mì Quảng.",
   "Nhiều lớp học trong và quanh phố cổ (tự chọn trên Google Maps)", 1, kids=False),
 place("rap-ky-uc", "Show Ký ức Hội An (Đảo Ký ức)", "show", "evening", 15.8700, 108.3390, 150, 600000, "15:00", "22:00", "boat",
   H("Vé thường gồm xem show ngoài trời với hơn 500 diễn viên và khu phố cổ mô phỏng", "Đặt vé trước, hỏi khung giờ mỗi buổi tối", "Cách phố cổ vài km, đi xe điện hoặc taxi"),
   "Chương trình nghệ thuật lớn tái hiện lịch sử thương cảng Hội An bằng âm nhạc, múa và sân khấu ngoài trời bên bờ sông Thu Bồn, hợp ai muốn tìm hiểu lịch sử qua nghệ thuật biểu diễn.",
   "Đảo Ký ức Hội An, Cẩm Châu", 1),
 # ---- Làng nghề, thiên nhiên, biển
 place("lang-rau-tra-que", "Làng rau Trà Quế", "park", "morning", 15.9030, 108.3330, 100, 50000, "07:00", "17:30", "field",
   H("Đạp xe qua các luống rau xanh mướt, đẹp nhất sáng sớm", "Có thể thuê xe đạp ở phố cổ (khoảng 2 km)", "Thường có hoạt động tưới rau, làm vườn hoặc nấu ăn tại làng, hỏi giá trước"),
   "Làng trồng rau thơm hữu cơ hơn 300 năm, nổi tiếng vì rau thơm được tưới bằng rong tảo nên thơm đậm, là nguồn rau cho nhiều món ăn Hội An như cao lầu, mì Quảng. Du khách có thể xuống ruộng làm nông dân một buổi.",
   "Xã Cẩm Hà, cách phố cổ khoảng 2 km", 2),
 place("rung-dua-bay-mau", "Rừng dừa nước Bảy Mẫu (Cẩm Thanh)", "park", "morning", 15.8690, 108.3720, 120, 150000, "07:00", "17:30", "boat",
   H("Ngồi thuyền thúng, xem biểu diễn quay thuyền và hát bài chòi", "Mang nón, kem chống nắng", "Giá thuyền thúng thường tính theo thuyền, hỏi trước khi lên thuyền", "Trẻ nhỏ phải mặc áo phao"),
   "Rừng dừa nước ven sông Thu Bồn ở Cẩm Thanh, nơi người dân chèo thuyền thúng lách qua các tán dừa, bắt cua, đan lát và biểu diễn quay thuyền thúng, gắn với đời sống làng chài và đồng bãi.",
   "Cẩm Thanh, cách phố cổ khoảng 5 km", 1, elderly=False),
 place("lang-gom-thanh-ha", "Làng gốm Thanh Hà", "culture", "morning", 15.8760, 108.3060, 90, 35000, "07:00", "17:00", "museum",
   H("Có thể tự tay nặn gốm trên bàn xoay", "Có công viên đất nung với các mô hình nhỏ nổi tiếng của làng", "Thích hợp đi cùng trẻ em"),
   "Làng gốm hơn 500 năm tuổi bên sông Thu Bồn, nổi tiếng với đồ gốm đất nung, gạch ngói và đồ chơi gốm. Nghề gốm Thanh Hà từng cung cấp ngói cho nhiều công trình trong phố cổ.",
   "Phường Thanh Hà, cách phố cổ khoảng 3 km", 1),
 place("lang-moc-kim-bong", "Làng mộc Kim Bồng", "culture", "afternoon", 15.8680, 108.3140, 75, 0, "08:00", "17:00", "boat",
   H("Đi đò từ bến phố cổ khoảng 10 phút, thường kèm thăm xưởng mộc và nhà dân", "Có thể xem thợ chạm khắc, ghé nhà cổ trong làng", "Hỏi giá đò khứ hồi trước khi đi"),
   "Làng nghề mộc của những người thợ nổi tiếng, nhiều thế hệ góp tay dựng nên phố cổ Hội An và các công trình ở Huế. Sản phẩm là đồ gỗ chạm khắc, tượng gỗ và mô hình nhà cổ.",
   "Xã Cẩm Kim, bên kia sông Thu Bồn", 1),
 place("bien-an-bang", "Biển An Bàng", "beach", "morning", 15.9010, 108.3570, 150, 0, "00:00", "23:59", "beach",
   H("Hợp tắm biển, thư giãn ở quán ven biển, cách phố cổ khoảng 3 km", "Chỉ tắm trong khu có cờ và nhân viên cứu hộ", "Mùa bão (tháng 9 đến 12) sóng có thể mạnh, xem dự báo"),
   "Bãi biển hiền hoà gần phố cổ, nhiều quán ăn, quán cà phê và nhà hàng hải sản ngay trên cát, được cả người địa phương và khách quốc tế yêu thích để thư giãn sau những ngày tham quan.",
   "An Bàng, cách phố cổ khoảng 3 km", 1),
 place("bien-cua-dai", "Biển Cửa Đại", "beach", "morning", 15.8786, 108.3880, 120, 0, "00:00", "23:59", "beach",
   H("Bến tàu đi Cù Lao Chàm nằm ở khu Cửa Đại", "Có đoạn bờ bị xói lở, đi vào khu bãi có biển báo và nơi an toàn", "Chỉ tắm trong khu có cờ và cứu hộ"),
   "Bãi biển nằm ở cửa sông Thu Bồn đổ ra biển Đông, nơi từng là cửa ngõ buôn bán của thương cảng. Từ đây có tàu đi Cù Lao Chàm.",
   "Cửa Đại, cách phố cổ khoảng 5 km", 1),
 place("cu-lao-cham", "Cù Lao Chàm", "park", "morning", 15.9520, 108.5120, 450, 400000, "07:00", "17:00", "boat",
   H("Đi ca nô từ bến Cửa Đại khoảng 30 phút, nên đặt tour trong ngày", "Tour thường gồm lặn ngắm san hô, bãi biển và bữa trưa hải sản, hỏi rõ trước khi đặt", "Không đi khi biển động hoặc có bão, hỏi thời tiết trước", "Mang áo phao cho trẻ nhỏ"),
   "Cụm đảo ngoài khơi Hội An được UNESCO công nhận là Khu dự trữ sinh quyển thế giới năm 2009. Nổi tiếng với san hô, bãi biển trong xanh, rừng nguyên sinh và làng chài yên bình.",
   "Bến tàu Cửa Đại, cách đảo khoảng 18 km đường biển", 3, elderly=False),
 place("thanh-dia-my-son", "Thánh địa Mỹ Sơn", "culture", "morning", 15.7640, 108.1240, 210, 150000, "06:30", "16:30", "temple",
   H("Cách phố cổ khoảng 40 km, đi xe khoảng 1 giờ, nên đi sáng sớm cho mát và đỡ đông", "Mang nón, nước uống và giày thoải mái, có đoạn đi bộ trong rừng", "Thường có biểu diễn múa Chăm ở khu giữa, hỏi giờ", "Giá vé khoảng 150.000 đ, kiểm tra lại khi đi"),
   "Quần thể đền tháp Chăm Pa được UNESCO công nhận Di sản văn hoá thế giới năm 1999, được xây từ thế kỷ 4 đến khoảng thế kỷ 14 để thờ các vị thần Ấn Độ giáo như Shiva. Gạch nung kết dính bằng kỹ thuật cổ vẫn là điều khiến nhiều nhà nghiên cứu ngạc nhiên.",
   "Xã Duy Phú, Duy Xuyên, cách Hội An khoảng 40 km", 3, kids=True, elderly=False),
 # ---- Quán ăn
 place("cao-lau-thanh", "Cao lầu Thanh", "food", "midday", 15.8800, 108.3258, 50, 45000, "07:00", "19:30", "food",
   H("Cao lầu là món phải thử ở Hội An, ăn lúc còn nóng với rau sống", "Trưa đông, nên đến trước 11h30 hoặc sau 13h30"),
   "Cao lầu có sợi mì dày, dai, vàng nâu nhờ ngâm nước tro cây và nấu từ nước giếng Bá Lễ theo tương truyền, ăn với thịt xíu, bánh tráng giòn và rau sống Trà Quế. Đây là món đặc sản chỉ có ở Hội An.",
   "26 Thái Phiên", 0, meal="lunch", desc="Quán cao lầu quen thuộc, mở từ sáng.", dishes=["Cao lầu", "Mì Quảng", "Hoành thánh"]),
 place("banh-mi-phuong", "Bánh mì Phượng", "food", "midday", 15.8786, 108.3285, 30, 25000, "07:00", "20:00", "food",
   H("Rất đông, đến sớm hoặc chấp nhận xếp hàng", "Có thể gọi nhiều loại nhân, hỏi nhân viên nhân đặc biệt"),
   "Bánh mì Hội An nổi tiếng nhờ vỏ giòn, nhân đa dạng và nước sốt đặc trưng. Quán được nhiều thực khách nước ngoài nhắc tới và là điểm dừng quen thuộc khi đi dạo phố cổ.",
   "2B Phan Châu Trinh", 0, meal="lunch", desc="Tiệm bánh mì nổi tiếng nhất nhì Hội An.", dishes=["Bánh mì thịt", "Bánh mì trứng", "Nước ép"]),
 place("banh-mi-madam-khanh", "Bánh mì Madam Khánh", "food", "midday", 15.8803, 108.3231, 30, 25000, "06:30", "19:30", "food",
   H("Bánh mì lớn, nhiều nhân, ăn tại chỗ hoặc mang đi", "Hỏi trước nếu không ăn được một số loại nhân"),
   "Tiệm bánh mì nổi tiếng được gọi là \"Nữ hoàng bánh mì\", phục vụ ổ bánh nhiều nhân, kèm đồ chua và nước chấm đậm đà.",
   "115 Trần Cao Vân", 0, meal="lunch", desc="Bánh mì ổ lớn đầy nhân, giá bình dân.", dishes=["Bánh mì thịt nướng", "Bánh mì pate"]),
 place("com-ga-ba-buoi-hoi-an", "Cơm gà Bà Buội (Hội An)", "food", "midday", 15.8789, 108.3277, 50, 40000, "10:00", "21:00", "food",
   H("Quán có từ những năm 1950, món cơm gà xé phay nổi tiếng", "Giờ trưa đông, chấp nhận chờ một chút"),
   "Cơm gà Hội An nấu bằng nước luộc gà, hạt cơm vàng thơm, ăn với gà xé, hành tây, rau răm và nước mắm gừng, là món ăn dân dã của người Quảng Nam.",
   "22 Phan Châu Trinh", 0, meal="lunch", desc="Quán cơm gà lâu đời, nằm trong phố cổ.", dishes=["Cơm gà xé", "Gỏi gà", "Canh gà"]),
 place("banh-bao-banh-vac", "Nhà hàng Hoa Hồng Trắng (bánh bao, bánh vạc)", "food", "midday", 15.8832, 108.3208, 60, 90000, "09:00", "21:00", "food",
   H("Nổi tiếng với bánh bao, bánh vạc, hoành thánh chiên", "Có thể ăn tại quán hoặc mua mang về"),
   "Bánh bao bánh vạc (hay \"white rose\") là món đặc sản Hội An làm từ bột gạo trong, gói tôm thịt hình bông hồng, ăn kèm nước chấm. Công thức được giữ kín qua nhiều năm.",
   "533 Hai Bà Trưng", 0, meal="lunch", desc="Quán chuyên các loại bánh đặc sản của Hội An.", dishes=["Bánh bao bánh vạc", "Hoành thánh chiên", "Cao lầu"]),
 place("mi-quang-ong-hai", "Mì Quảng Ông Hai", "food", "midday", 15.8798, 108.3335, 45, 45000, "07:00", "20:00", "food",
   H("Mì Quảng ít nước đậm đà, ăn với rau sống và bánh tráng", "Địa chỉ chỉ có một nguồn ghi, nên kiểm tra lại trên bản đồ"),
   "Mì Quảng là món đặc sản miền Trung, sợi mì bản to, ít nước, ăn kèm đậu phộng và bánh tráng nướng. Mỗi quán có nước nhân và cách trình bày riêng.",
   "6A Trương Minh Lượng", 0, meal="lunch", desc="Quán mì Quảng bình dân gần phố cổ.", dishes=["Mì Quảng gà", "Mì Quảng tôm thịt", "Bánh tráng"]),
 place("morning-glory", "Nhà hàng Morning Glory", "food", "evening", 15.8769, 108.3290, 90, 250000, "10:00", "22:00", "food",
   H("Thực đơn ẩm thực Hội An trong ngôi nhà cổ, hợp ăn tối nhẹ nhàng", "Nên đặt bàn trước vào tối cuối tuần"),
   "Nhà hàng của đầu bếp Trịnh Diễm Vy, giới thiệu các món Hội An và Việt Nam trong ngôi nhà cổ, từ cao lầu, bánh xèo đến cá nướng lá chuối, nổi tiếng với du khách quốc tế.",
   "106 Nguyễn Thái Học", 0, meal="dinner", desc="Nhà hàng món Hội An trong nhà cổ, không gian ấm cúng.", dishes=["Cao lầu", "Bánh xèo", "Cá nướng lá chuối"], aud=["cap_doi", "nhom_ban", "gia_dinh", "mot_minh"]),
 # ---- Cà phê
 place("faifo-coffee", "Faifo Coffee", "cafe", "afternoon", 15.8777, 108.3300, 60, 55000, "07:00", "22:00", "cafe",
   H("Lên sân thượng nhìn mái ngói phố cổ, đẹp nhất lúc chiều muộn", "Cuối tuần đông, nên đến sớm để chọn chỗ"),
   "Quán cà phê trong nhà cổ, nổi tiếng vì sân thượng nhìn ra những mái ngói rêu phong của phố cổ, nơi ngắm hoàng hôn buông trên Hội An.",
   "130 Trần Phú", 0, desc="Quán cà phê có sân thượng nhìn toàn cảnh phố cổ.", dishes=["Cà phê muối", "Cà phê sữa", "Trà"]),
 place("reaching-out", "Reaching Out Tea House", "cafe", "afternoon", 15.8777, 108.3297, 60, 50000, "08:00", "21:00", "cafe",
   H("Quán yên tĩnh, nhân viên là người khiếm thính, giao tiếp bằng thẻ và cử chỉ", "Có thể mua đồ thủ công của các nghệ nhân ở cửa hàng cạnh bên"),
   "Quán trà do doanh nghiệp xã hội điều hành, tạo việc làm cho người khiếm thính và khuyết tật, không gian chậm rãi, ít ồn, thích hợp nghỉ chân giữa buổi tham quan.",
   "131 Trần Phú", 0, desc="Tiệm trà yên tĩnh, mang ý nghĩa xã hội.", dishes=["Trà", "Cà phê", "Bánh ngọt"]),
 place("hoi-an-roastery", "Hội An Roastery", "cafe", "afternoon", 15.8778, 108.3299, 50, 55000, "07:00", "21:00", "cafe",
   H("Cà phê rang xay tại chỗ, có thể mua hạt về làm quà", "Quán nhỏ, đông giờ chiều"),
   "Thương hiệu cà phê rang xay từ hạt Việt Nam, có nhiều chi nhánh ở Hội An. Quán nhỏ gọn, hương rang thơm đậm.",
   "135 Trần Phú", 0, desc="Quán cà phê rang xay tại chỗ.", dishes=["Cà phê phin", "Cà phê muối", "Cold brew"]),
 place("cong-ca-phe-hoi-an", "Cộng Cà Phê (Hội An)", "cafe", "afternoon", 15.8775, 108.3320, 60, 45000, "07:00", "22:00", "cafe",
   H("Cà phê cốt dừa là món nổi tiếng của Cộng", "Chọn chi nhánh gần phố cổ trên Google Maps"),
   "Chuỗi cà phê phong cách thời bao cấp, nổi tiếng với cà phê cốt dừa. Không gian cũ kỹ, màu xanh quân đội, hợp chụp ảnh và nghỉ chân.",
   "Khu phố cổ Hội An (xem chi nhánh gần nhất)", 0, desc="Cà phê phong cách bao cấp, cốt dừa đặc trưng.", dishes=["Cà phê cốt dừa", "Cà phê sữa", "Sinh tố"]),
]

# Khách sạn MẪU cho Hội An, nhân bản từ khách sạn mẫu cùng hạng của Đà Nẵng
HOTELS = [
 ("hoian-hostel", "hostel-bien", "Hostel phố cổ Hội An (mẫu)", "Phố cổ", 300000, 15.8790, 108.3270, "Hostel nhỏ cách Chùa Cầu vài phút đi bộ, phòng đơn giản, phù hợp đi tiết kiệm.", ["Wifi", "Bếp chung"]),
 ("hoian-homestay", "homestay", "Homestay vườn Cẩm Châu (mẫu)", "Cẩm Châu", 450000, 15.8690, 108.3420, "Homestay có vườn và xe đạp miễn phí, cách phố cổ khoảng 2 km.", ["Wifi", "Xe đạp", "Ăn sáng"]),
 ("hoian-3sao-pc", "3sao-tt", "Khách sạn 3 sao phố cổ (mẫu)", "Phố cổ", 800000, 15.8780, 108.3285, "Khách sạn 3 sao nằm trong khu phố cổ, đi bộ tới Chùa Cầu và chợ.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("hoian-3sao-ab", "3sao-bien", "Khách sạn 3 sao An Bàng (mẫu)", "An Bàng", 700000, 15.9000, 108.3590, "Khách sạn 3 sao cách biển An Bàng vài phút đi bộ, có hồ bơi.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("hoian-4sao-pc", "4sao-tt", "Khách sạn 4 sao ven sông gần phố cổ (mẫu)", "Phố cổ", 1500000, 15.8750, 108.3320, "Khách sạn 4 sao ven sông Hoài, có hồ bơi và nhà hàng, cách Chùa Cầu khoảng 10 phút đi bộ.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa"]),
 ("hoian-4sao-ab", "4sao-bien", "Khách sạn 4 sao An Bàng (mẫu)", "An Bàng", 1400000, 15.9020, 108.3600, "Khách sạn 4 sao gần biển An Bàng, có hồ bơi và xe đưa đón phố cổ.", ["Wifi", "Ăn sáng", "Hồ bơi", "Đưa đón phố cổ"]),
 ("hoian-resort", "resort-nhs", "Resort 5 sao ven sông (mẫu)", "Cẩm Châu", 3000000, 15.8700, 108.3450, "Resort 5 sao yên tĩnh ven sông Thu Bồn, có hồ bơi lớn, spa và xe điện đưa đón phố cổ.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa", "Đưa đón phố cổ"]),
 ("hoian-villa", "villa", "Villa hồ bơi riêng gần Cửa Đại (mẫu)", "Cửa Đại", 4500000, 15.8800, 108.3830, "Villa riêng có hồ bơi, gần biển Cửa Đại, hợp nhóm bạn hoặc gia đình đông người.", ["Wifi", "Ăn sáng", "Hồ bơi riêng", "Bếp"]),
]

# Điểm thuộc "vé tham quan phố cổ": mua một vé (120.000 đ khách quốc tế) dùng cho cả chuyến, nên giá từng điểm để 0 và costing cộng vé một lần
TICKET_GROUP = ["pho-co-hoi-an", "chua-cau", "hoi-quan-phuc-kien", "nha-co-tan-ky", "nha-co-phung-hung", "nha-co-quan-thang", "hoi-quan-quang-dong", "hoi-quan-trieu-chau",
                "chua-ong", "bao-tang-sa-huynh", "bao-tang-gom-su", "bao-tang-dan-gian", "nha-tho-toc-tran"]
for _p in NEW:
    if _p["id"] in TICKET_GROUP: _p["ticketGroup"] = "pho-co"; _p["price"] = 0

def main():
    dp = root / "data" / "da-nang.json"; data = json.loads(dp.read_text(encoding="utf-8"))
    ids = {p["id"] for p in data["places"]}
    for p in data["places"]: p.setdefault("city", "Đà Nẵng")
    data["places"] = [p for p in data["places"] if p["id"] not in {n["id"] for n in NEW}] + NEW
    dp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    op = root / "data" / "travel-options.json"; opts = json.loads(op.read_text(encoding="utf-8"))
    for h in opts["hotels"]: h.setdefault("city", "Đà Nẵng")
    base = {h["id"]: h for h in opts["hotels"]}
    mine = {x[0] for x in HOTELS}
    opts["hotels"] = [h for h in opts["hotels"] if h["id"] not in mine]
    for hid, src, name, area, price, lat, lng, desc, am in HOTELS:
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=CITY,
                                              googleQuery=name.replace(" (mẫu)", "") + " Hội An")
        for rt in h.get("roomTypes", []):
            rt["view"] = {"Mỹ Khê": area, "Biển": "Vườn"}.get(rt.get("view"), rt.get("view"))
        h["reviews"] = [dict(r, text=r["text"].replace("biển", "khu vực").replace("Đà Nẵng", "Hội An")) for r in h.get("reviews", [])]
        opts["hotels"].append(h)
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Hội An:", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))

main()
