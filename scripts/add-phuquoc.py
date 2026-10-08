#!/usr/bin/env python3
"""Thêm điểm đến Phú Quốc: địa điểm (biển, đảo, vui chơi, tâm linh, làng chài, quán ăn, cà phê) vào data/da-nang.json và khách sạn MẪU vào data/travel-options.json.
Địa điểm là nơi có thật nhưng toạ độ, giá, giờ mở cửa là ƯỚC LƯỢNG (cờ "approx"), khách sạn là dữ liệu MẪU. Chạy lại được, không trùng.
Chạy: python3 scripts/add-phuquoc.py"""
import json, pathlib, copy
root = pathlib.Path(__file__).resolve().parent.parent
CITY = "Phú Quốc"
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
 place("bai-sao", "Bãi Sao", "beach", "morning", 10.0560, 104.0350, 180, 0, "00:00", "23:59", "beach",
   H("Cát trắng mịn, nước trong, nên đi sáng sớm cho mát và đỡ đông", "Có dịch vụ ghế, dù, quán ăn nhỏ trên bãi", "Chỉ tắm trong khu có cờ và nhân viên cứu hộ, mùa mưa (tháng 5 đến 10) sóng mạnh hơn"),
   "Bãi biển nổi tiếng nhất phía nam đảo, cát trắng mịn như bột, nước trong xanh. Từ đây nhìn thấy các hòn đảo nhỏ của quần đảo An Thới.",
   "Phía nam đảo, cách Dương Đông khoảng 25 km", 1),
 place("bai-khem", "Bãi Khem", "beach", "afternoon", 10.0330, 104.0400, 150, 0, "00:00", "23:59", "beach",
   H("Nước xanh ngọc, bãi nhỏ yên tĩnh hơn Bãi Sao", "Có quán cà phê và khu nghỉ trên bãi", "Mùa mưa biển động, xem dự báo trước khi tắm"),
   "Bãi biển nhỏ xinh ở phía nam đảo với làn nước xanh ngọc bích, cát mịn và hàng dừa nghiêng ra biển, hợp nghỉ dưỡng yên tĩnh.",
   "Phía nam đảo, gần An Thới", 1),
 place("bai-dai", "Bãi Dài", "beach", "morning", 10.3100, 103.8500, 180, 0, "00:00", "23:59", "beach",
   H("Bãi hoang sơ ở phía tây bắc, nước êm, hợp đi với trẻ nhỏ", "Gần khu VinWonders và Safari nên có thể ghép trong một ngày", "Hoàng hôn ở đây rất đẹp"),
   "Bãi biển dài ở phía tây bắc đảo, hàng dừa và cát vàng, nằm gần các khu vui chơi lớn của đảo. Bãi chưa quá đông nên khá yên tĩnh.",
   "Phía tây bắc đảo, gần Gành Dầu", 1),
 place("bai-truong", "Bãi Trường (Long Beach)", "beach", "afternoon", 10.2000, 103.9570, 150, 0, "00:00", "23:59", "beach",
   H("Bãi dài ven trung tâm Dương Đông, nhiều khách sạn và quán ăn ngay bên bờ", "Đi bộ ngắm hoàng hôn chiều muộn", "Chỉ tắm trong khu có cờ và nhân viên cứu hộ"),
   "Bãi biển dài nhất trên đảo chạy dọc bờ tây từ Dương Đông về phía nam, nơi tập trung nhiều khách sạn, resort và quán ăn, được coi là bãi ngắm hoàng hôn đẹp nhất của Phú Quốc.",
   "Bờ tây, từ Dương Đông về phía nam", 1),
 place("bai-ong-lang", "Bãi Ông Lang", "beach", "morning", 10.2650, 103.9380, 150, 0, "00:00", "23:59", "beach",
   H("Bãi yên tĩnh, có rừng dừa và nhiều homestay, cách Dương Đông khoảng 7 km", "Hợp ai thích nơi vắng, thư giãn", "Không có nhiều dịch vụ, mang theo nước uống"),
   "Bãi biển phía tây bắc đảo, nổi tiếng yên bình với những hàng dừa soi bóng xuống mặt nước và các quán nhỏ ven biển, ít khách hơn các bãi phía nam.",
   "Cách Dương Đông khoảng 7 km, bờ tây bắc", 1),
 place("tour-4-dao", "Tour 4 đảo và lặn ngắm san hô An Thới", "park", "morning", 10.0000, 104.0250, 420, 800000, "08:00", "16:00", "boat",
   H("Thường gồm đi ca nô qua các đảo (như Hòn Gầm Ghì, Hòn Móng Tay, Hòn Mây Rút), lặn ngắm san hô, bữa trưa trên tàu", "Đặt trước 1 ngày, hỏi rõ giá, lịch trình và bảo hiểm", "Không đi khi biển động hoặc có bão", "Trẻ nhỏ phải mặc áo phao"),
   "Quần đảo An Thới ở phía nam Phú Quốc gồm hơn chục hòn đảo nhỏ, biển trong, san hô và bãi cát trắng. Tour trong ngày là cách phổ biến nhất để khám phá đảo.",
   "Cảng An Thới, phía nam đảo", 2, elderly=False),
 # ---- Vui chơi và cảnh đẹp
 place("cap-treo-hon-thom", "Cáp treo Hòn Thơm và Sun World Hòn Thơm", "park", "morning", 10.0300, 104.0150, 360, 850000, "09:00", "17:00", "mountain",
   H("Tuyến cáp treo vượt biển dài nhất thế giới theo ghi nhận Guinness (khoảng 7,9 km), ngắm biển và các đảo từ trên cao", "Giá vé tham khảo 750.000–850.000 đ, thường gồm công viên nước, kiểm tra lại khi đi", "Mùa lễ và cuối tuần rất đông, nên đặt vé trước và đi sớm"),
   "Tuyến cáp treo ba dây nối đảo chính với đảo Hòn Thơm qua mặt biển, dài khoảng 7,9 km, là một trong những điểm nhấn của khu nam đảo. Trên đảo có công viên nước, bãi biển và khu vui chơi.",
   "Ga đi tại An Thới, phía nam đảo", 1, elderly=True, kids=True),
 place("thi-tran-hoang-hon", "Thị trấn Hoàng Hôn và Cầu Hôn (Sunset Town)", "checkin", "evening", 10.0185, 104.0230, 120, 0, "15:00", "22:30", "lantern",
   H("Kiến trúc kiểu Địa Trung Hải ven biển, Cầu Hôn (Kiss Bridge) là điểm ngắm hoàng hôn nổi tiếng", "Vào cổng thường miễn phí, show và một số hoạt động tính phí riêng", "Đến trước giờ lặn 30 đến 45 phút để chọn chỗ đẹp"),
   "Khu phố ven biển lấy cảm hứng từ các thị trấn Địa Trung Hải ở mũi nam đảo, nổi tiếng với Cầu Hôn gồm hai nhánh gặp nhau ở một điểm, phía trước là biển mở rộng như vô tận.",
   "An Thới, mũi nam đảo", 1),
 place("vinwonders-phu-quoc", "VinWonders Phú Quốc", "park", "morning", 10.3380, 103.8590, 360, 880000, "09:00", "21:00", "wheel",
   H("Công viên chủ đề rộng khoảng 50 ha, hơn 100 trò chơi, nên đi từ sáng", "Giá vé tham khảo khoảng 880.000 đ, kiểm tra lại và đặt trước", "Mang nón, kem chống nắng và giày thoải mái"),
   "Công viên giải trí lớn ở phía bắc đảo gồm nhiều khu chủ đề, trò chơi cảm giác mạnh và khu vui chơi cho trẻ em.",
   "Gành Dầu, phía bắc đảo", 2),
 place("vinpearl-safari", "Vinpearl Safari Phú Quốc", "park", "morning", 10.3445, 103.8490, 240, 650000, "09:00", "16:00", "field",
   H("Khu bảo tồn và vườn thú bán hoang dã rộng khoảng 380 ha", "Giá vé tham khảo khoảng 650.000 đ, mở đến 16h nên vào sớm", "Có xe buýt thăm quan trong khu, hợp trẻ em và người lớn tuổi"),
   "Công viên bảo tồn động vật bán hoang dã lớn ở bắc đảo với hàng nghìn cá thể nhiều loài, có xe tham quan đi qua các khu sinh cảnh.",
   "Gành Dầu, phía bắc đảo", 1),
 place("grand-world", "Grand World Phú Quốc", "checkin", "evening", 10.3365, 103.8545, 150, 0, "00:00", "23:59", "lantern",
   H("Khu phố kiểu Venice có kênh đào, thuyền gondola và show phun nước, vào cổng miễn phí", "Đẹp nhất sau hoàng hôn, nhiều quán ăn và cửa hàng", "Một số trò chơi, show và thuyền tính phí riêng"),
   "Tổ hợp giải trí ven biển phía bắc, mô phỏng thành phố kênh đào Venice với nhà cửa nhiều màu, thuyền trên kênh và các màn trình diễn về đêm.",
   "Gành Dầu, phía bắc đảo", 1),
 place("rach-vem", "Làng chài Rạch Vẹm", "checkin", "afternoon", 10.3800, 103.9800, 120, 0, "00:00", "23:59", "boat",
   H("Nổi tiếng với cầu gỗ, nhà bè và những chú sao biển đỏ trên bãi, hãy ngắm và chụp ảnh nhẹ nhàng, không mang sao biển lên khỏi nước", "Cách Dương Đông hơn 20 km, đi sáng sớm hoặc xế chiều", "Nước rút theo giờ thuỷ triều, hỏi người địa phương"),
   "Làng chài nhỏ ở bắc đảo với những ngôi nhà bè, thuyền cá và bãi biển sao biển, là nơi hiểu thêm đời sống ngư dân Phú Quốc.",
   "Bắc đảo, cách Dương Đông hơn 20 km", 2),
 place("suoi-tranh", "Suối Tranh", "park", "morning", 10.1850, 104.0100, 90, 40000, "07:00", "17:00", "field",
   H("Suối nhiều nước vào mùa mưa (khoảng tháng 6 đến 10), mùa khô gần như cạn", "Đường vào suối có đoạn dốc trơn, mang giày bám", "Giá vé là ước lượng"),
   "Dòng suối chảy qua rừng nhiệt đới và những tảng đá lớn ở trung tâm đảo, một trong những điểm ngắm thác nhỏ đẹp nhất Phú Quốc.",
   "Khu vực Dương Tơ, trung tâm đảo", 3, elderly=False),
 place("lang-chai-ham-ninh", "Làng chài Hàm Ninh", "checkin", "afternoon", 10.1750, 104.0430, 120, 0, "06:00", "21:00", "boat",
   H("Làng chài ở bờ đông, nổi tiếng với ghẹ tươi, nhiều quán hải sản trên cầu cảng và ven biển", "Đi chiều muộn ngắm hoàng hôn trên mặt nước phía đông, thích hợp ăn tối", "Hỏi giá hải sản theo cân trước khi gọi"),
   "Làng chài cổ ở phía đông đảo với những chiếc thuyền và cầu cảng gỗ, nơi cung cấp ghẹ Hàm Ninh, đặc sản có thịt chắc ngọt.",
   "Bờ đông đảo, cách Dương Đông khoảng 10 km", 1),
 # ---- Văn hoá, lịch sử, làng nghề
 place("dinh-cau", "Dinh Cậu", "culture", "evening", 10.2189, 103.9566, 40, 0, "05:00", "22:00", "temple",
   H("Điểm ngắm hoàng hôn gần trung tâm, ngay cạnh chợ đêm", "Giữ trật tự và ăn mặc lịch sự, hạn chế chụp ảnh ở khu thờ", "Ngư dân thường đến cầu bình an trước khi ra khơi"),
   "Ngôi đền thờ nằm trên mỏm đá nhô ra biển ngay giữa thị trấn Dương Đông, nơi ngư dân cầu bình an cho những chuyến đi biển. Bên cạnh có ngọn hải đăng nhỏ, hoàng hôn nhìn từ đây rất đẹp.",
   "Dương Đông, cạnh chợ đêm", 1),
 place("chua-ho-quoc", "Chùa Hộ Quốc", "culture", "morning", 10.1500, 103.9700, 60, 0, "06:00", "18:00", "temple",
   H("Mặc kín đáo (che vai, che gối) khi vào chùa", "Đi sáng sớm cho mát và vắng", "Có thể thấy rõ biển và đồi từ khuôn viên"),
   "Ngôi chùa lớn quay mặt ra biển ở phía nam Dương Đông, nổi bật với kiến trúc nhiều tầng và không gian yên tĩnh, là điểm tâm linh nổi tiếng của đảo.",
   "Dương Tơ, phía nam Dương Đông", 2),
 place("nha-tu-phu-quoc", "Nhà tù Phú Quốc (Cây Dừa)", "culture", "morning", 10.0230, 104.0130, 75, 0, "07:30", "17:00", "museum",
   H("Bảo tàng lịch sử, nên đọc bảng giải thích và đi với tâm thế trang nghiêm", "Trẻ nhỏ có thể thấy các cảnh nặng nề", "Giờ mở cửa và phí là ước lượng"),
   "Nhà tù do chính quyền Pháp xây từ năm 1949 rồi tiếp tục sử dụng trong chiến tranh, từng giam giữ nhiều người tù chính trị. Nay là di tích lịch sử, có mô hình tái hiện cảnh giam giữ.",
   "An Thới, phía nam đảo", 1, kids=False),
 place("nha-thung-nuoc-mam", "Nhà thùng nước mắm Phú Quốc", "culture", "morning", 10.2120, 103.9660, 45, 0, "07:00", "17:00", "museum",
   H("Có thể xem các thùng gỗ lớn ủ cá cơm, nếm thử và mua về làm quà", "Mùi nước mắm khá nồng, hỏi trước nếu đi cùng trẻ nhỏ", "Chọn nước mắm có nhãn rõ nguồn gốc, độ đạm ghi trên chai"),
   "Nước mắm Phú Quốc làm từ cá cơm ủ muối nhiều tháng trong thùng gỗ lớn, được bảo hộ chỉ dẫn địa lý ở nhiều thị trường, là đặc sản và niềm tự hào của đảo.",
   "Khu vực Dương Đông (nhiều nhà thùng, tự chọn trên Google Maps)", 0),
 place("vuon-tieu", "Vườn tiêu Phú Quốc", "culture", "morning", 10.2050, 104.0050, 50, 0, "07:00", "17:00", "field",
   H("Xem cây tiêu leo trụ, nếm thử và mua tiêu sọ, tiêu xanh làm quà", "Mang nón, vườn khá nắng", "Giá tiêu mỗi nơi một khác, hỏi trước khi mua"),
   "Tiêu Phú Quốc nổi tiếng thơm cay đậm, hạt chắc, là một trong những đặc sản của đảo. Các vườn tiêu mở cửa đón du khách tham quan miễn phí, nơi mua tiêu trực tiếp từ chủ vườn.",
   "Khu Tượng, Cửa Dương (nhiều vườn, tự chọn trên Google Maps)", 1),
 place("cho-dem-phu-quoc", "Chợ đêm Phú Quốc (Dinh Cậu)", "food", "evening", 10.2183, 103.9585, 90, 150000, "17:00", "23:30", "market",
   H("Khu hải sản nướng và khu bán đặc sản, nên đi sau 18h", "Hỏi giá món theo cân hoặc theo phần trước khi gọi", "Mang tiền mặt, giữ kỹ đồ cá nhân"),
   "Chợ đêm sát Dinh Cậu là nơi du khách ăn hải sản nướng, ghẹ, sá sùng và mua đặc sản làm quà, nhộn nhịp từ chập tối đến khuya.",
   "Đường Bạch Đằng, Dương Đông, cạnh Dinh Cậu", 0, meal="dinner", desc="Chợ đêm hải sản và đặc sản gần trung tâm.", dishes=["Hải sản nướng", "Ghẹ", "Chè", "Đặc sản làm quà"]),
 # ---- Quán ăn
 place("quan-viet-goi-ca-trich", "Quán Việt (gỏi cá trích)", "food", "midday", 10.2160, 103.9575, 60, 150000, "09:00", "22:00", "food",
   H("Gỏi cá trích cuốn bánh tráng với rau thơm và nước chấm đặc trưng", "Quán chuyển địa chỉ nhiều lần, kiểm tra trên bản đồ", "Có thể ăn cả buổi trưa lẫn buổi tối"),
   "Gỏi cá trích là món đặc trưng Phú Quốc: cá trích tươi bóc xương trộn dừa nạo, đậu phộng và rau thơm, cuốn bánh tráng chấm nước chấm đậm đà.",
   "24 Trần Hưng Đạo, Dương Đông", 0, meal="lunch", desc="Quán chuyên gỏi cá trích và các món hải sản địa phương.", dishes=["Gỏi cá trích", "Hải sản nướng", "Bún quậy"]),
 place("nha-hang-xin-chao", "Nhà hàng Xin Chào (ngắm hoàng hôn)", "food", "evening", 10.2140, 103.9565, 90, 220000, "11:00", "21:30", "food",
   H("Không gian mở sát biển Dương Đông, có view hoàng hôn", "Nên đặt bàn trước vào tối cuối tuần", "Có gỏi cá trích, gỏi cá nhồng và lẩu hải sản"),
   "Nhà hàng hải sản nằm sát biển Dương Đông, được nhiều du khách chọn để ăn tối và ngắm hoàng hôn.",
   "66 Trần Hưng Đạo, Dương Đông", 0, meal="dinner", desc="Nhà hàng hải sản sát biển, không gian thoáng.", dishes=["Gỏi cá trích", "Gỏi cá nhồng", "Lẩu hải sản"]),
 place("nha-hang-ra-khoi", "Nhà hàng Ra Khơi", "food", "evening", 10.2200, 103.9650, 90, 200000, "10:00", "23:00", "food",
   H("Không gian rộng, phục vụ nhanh, hợp nhóm bạn và gia đình đông", "Có món gỏi cá trích truyền thống"),
   "Nhà hàng chuyên hải sản và món Phú Quốc, không gian rộng rãi, thường chọn cho các bữa ăn nhóm đông.",
   "131 đường 30/4, Dương Đông", 0, meal="dinner", desc="Nhà hàng rộng rãi, phục vụ nhanh, món hải sản đa dạng.", dishes=["Gỏi cá trích", "Hải sản nướng", "Cá nướng"]),
 place("bun-quay-phu-quoc", "Bún quậy Phú Quốc (quán Kiến Xây)", "food", "midday", 10.2170, 103.9640, 45, 60000, "06:30", "21:00", "food",
   H("Tự pha nước chấm gồm tiêu, ớt, chanh rồi \"quậy\" cho đều trước khi ăn", "Địa chỉ chưa xác minh được, tra \"bún quậy\" trên Google Maps", "Hợp bữa sáng hoặc trưa"),
   "Bún quậy là món đặc trưng Phú Quốc: tô bún nước dùng với chả, thịt và tôm viên, thực khách tự pha chén nước chấm từ tiêu, ớt, chanh rồi quậy thật đều.",
   "Dương Đông (chưa xác minh địa chỉ)", 0, meal="lunch", desc="Quán bún quậy nổi tiếng ở Dương Đông.", dishes=["Bún quậy", "Bún quậy hải sản"]),
 place("ghe-ham-ninh", "Quán ghẹ Hàm Ninh (hải sản ven biển)", "food", "midday", 10.1750, 104.0420, 75, 300000, "10:00", "21:00", "food",
   H("Ghẹ hấp, hải sản chọn theo cân, hỏi giá trước khi gọi", "Nên đi nhóm 3 đến 4 người để gọi được nhiều món", "Hợp ăn trưa sau khi ghé làng chài"),
   "Ghẹ Hàm Ninh nổi tiếng thịt chắc ngọt, thường hấp nguyên con, chấm muối tiêu chanh, bên bờ biển phía đông đảo.",
   "Làng chài Hàm Ninh, bờ đông đảo", 0, meal="lunch", desc="Quán hải sản ven biển ở làng chài Hàm Ninh.", dishes=["Ghẹ hấp", "Ốc", "Tôm nướng"], aud=["nhom_ban", "gia_dinh", "cap_doi"]),
 # ---- Cà phê (quán mẫu)
 place("cf-hoang-hon-bai-truong", "Quán cà phê ngắm hoàng hôn Bãi Trường (mẫu)", "cafe", "afternoon", 10.1950, 103.9560, 75, 80000, "07:00", "22:00", "cafe",
   H("Đến trước giờ lặn khoảng 30 phút để có chỗ đẹp", "Quán mẫu, chưa phải quán thật"),
   "Ngắm hoàng hôn bên bờ biển là nếp thư giãn quen thuộc của du khách ở Phú Quốc.",
   "Bãi Trường (quán mẫu)", 0, desc="Quán cà phê thoáng nhìn ra biển, hợp ngồi lâu.", dishes=["Cà phê muối", "Nước dừa", "Trà đào"]),
 place("cf-vuon-duong-dong", "Quán cà phê vườn Dương Đông (mẫu)", "cafe", "afternoon", 10.2130, 103.9690, 60, 55000, "06:30", "21:30", "cafe",
   H("Quán có vườn cây, nghỉ trưa mát", "Quán mẫu, chưa phải quán thật"),
   "Phú Quốc có nhiều quán cà phê vườn, nhìn ra cây xanh, ít ồn, thích hợp nghỉ chân giữa buổi đi tham quan.",
   "Dương Đông (quán mẫu)", 0, desc="Quán cà phê vườn yên tĩnh gần trung tâm.", dishes=["Cà phê phin", "Sinh tố", "Trà trái cây"]),
]
for _p in NEW:
    if _p["id"].startswith("cf-"): _p["sample"] = True  # quán mẫu

HOTELS = [
 ("pq-hostel", "hostel-bien", "Hostel Dương Đông (mẫu)", "Dương Đông", 280000, 10.2170, 103.9650, "Hostel nhỏ gần chợ đêm và Dinh Cậu, phòng đơn giản, phù hợp đi tiết kiệm.", ["Wifi", "Bếp chung"]),
 ("pq-homestay", "homestay", "Homestay vườn Cửa Lấp (mẫu)", "Cửa Lấp", 400000, 10.2000, 103.9850, "Homestay có vườn cây và xe máy cho thuê, cách trung tâm khoảng 3 km.", ["Wifi", "Xe máy", "Ăn sáng"]),
 ("pq-3sao", "3sao-tt", "Khách sạn 3 sao gần chợ đêm (mẫu)", "Dương Đông", 750000, 10.2185, 103.9600, "Khách sạn 3 sao đi bộ tới chợ đêm và Dinh Cậu.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("pq-3sao-bien", "3sao-bien", "Khách sạn 3 sao Bãi Trường (mẫu)", "Bãi Trường", 800000, 10.2000, 103.9560, "Khách sạn 3 sao sát bãi Trường, có hồ bơi.", ["Wifi", "Ăn sáng", "Hồ bơi"]),
 ("pq-4sao", "4sao-tt", "Khách sạn 4 sao Bãi Trường (mẫu)", "Bãi Trường", 1500000, 10.1900, 103.9570, "Khách sạn 4 sao ven biển, có hồ bơi và nhà hàng.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa"]),
 ("pq-4sao-bai-dai", "4sao-bien", "Khách sạn 4 sao Bãi Dài (mẫu)", "Bãi Dài", 1600000, 10.3100, 103.8550, "Khách sạn 4 sao gần Bãi Dài, tiện đi VinWonders và Safari.", ["Wifi", "Ăn sáng", "Hồ bơi", "Đưa đón khu vui chơi"]),
 ("pq-resort", "resort-nhs", "Resort 5 sao Bãi Trường (mẫu)", "Bãi Trường", 3500000, 10.1750, 103.9570, "Resort 5 sao ven biển với hồ bơi lớn, spa và bãi biển riêng.", ["Wifi", "Ăn sáng", "Hồ bơi", "Spa", "Bãi biển riêng"]),
 ("pq-villa", "villa", "Villa hồ bơi riêng Bãi Sao (mẫu)", "Bãi Sao", 5000000, 10.0600, 104.0330, "Villa riêng có hồ bơi gần Bãi Sao, hợp nhóm bạn hoặc gia đình đông người.", ["Wifi", "Ăn sáng", "Hồ bơi riêng", "Bếp"]),
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
        h = copy.deepcopy(base[src]); h.update(id=hid, name=name, area=area, pricePerRoom=price, lat=lat, lng=lng, description=desc, amenities=am, city=CITY, googleQuery=name.replace(" (mẫu)", "") + " Phú Quốc")
        for rt in h.get("roomTypes", []): rt["view"] = {"Mỹ Khê": area}.get(rt.get("view"), rt.get("view"))
        h["reviews"] = [dict(r, text=r["text"].replace("Đà Nẵng", "Phú Quốc")) for r in h.get("reviews", [])]
        opts["hotels"].append(h)
    op.write_text(json.dumps(opts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Phú Quốc:", len(NEW), "địa điểm,", len(HOTELS), "khách sạn mẫu; tổng địa điểm", len(data["places"]))

main()
