#!/usr/bin/env python3
"""Gộp nội dung chi tiết (chú ý nổi bật, nét văn hoá, mô tả quán...) vào data/da-nang.json.
Chạy: python3 scripts/enrich-places.py
Phần văn hoá/lịch sử của điểm tham quan là kiến thức phổ biến. Quán ăn và đánh giá là DỮ LIỆU MẪU, phải thay bằng dữ liệu thật."""
import json, pathlib

path = pathlib.Path(__file__).resolve().parent.parent / "data" / "da-nang.json"
data = json.loads(path.read_text(encoding="utf-8"))

E = {
  "ba-na": dict(scene="mountain",
    highlights=["Đi sớm (trước 9h) để tránh hàng chờ cáp treo", "Trên núi mát hơn dưới phố khoảng 5-6 độ, nên mang áo khoác mỏng", "Dành ít nhất 4-5 tiếng để đi hết Cầu Vàng, Làng Pháp và khu vui chơi"],
    culture="Cầu Vàng có đôi bàn tay đá khổng lồ nâng đỡ. Làng Pháp dựng lại theo khu nghỉ mát của người Pháp từ thập niên 1920, khi Bà Nà được khai phá làm nơi tránh nóng. Trên núi còn có chùa Linh Ứng Bà Nà và tượng Phật Thích Ca."),
  "cau-rong": dict(scene="bridge",
    highlights=["Cầu phun lửa và phun nước vào tối thứ Bảy, Chủ nhật (khoảng 21h), nên kiểm tra lại giờ trước khi đi", "Đứng ở bờ đông sông Hàn để chụp trọn cả thân cầu", "Buổi tối đông, giữ gìn đồ cá nhân"],
    culture="Cầu dài khoảng 666 m, hình con rồng uốn lượn. Rồng là biểu tượng của quyền uy và may mắn trong văn hoá Việt, nên được chọn làm hình ảnh đại diện cho sự vươn lên của thành phố."),
  "my-khe": dict(scene="beach", image="images/my-khe.jpg", imageAlt="Hoàng hôn trên biển Mỹ Khê, Đà Nẵng",
    highlights=["Sáng sớm biển êm, hợp tắm và đi dạo; trưa nắng gắt nên thoa kem chống nắng", "Chỉ tắm trong khu có cờ và nhân viên cứu hộ", "Mùa bão (khoảng tháng 9 đến tháng 12) sóng có thể mạnh, xem dự báo trước"],
    culture="Từng được tạp chí Forbes nêu tên trong danh sách các bãi biển đẹp của thế giới. Buổi sáng có thể thấy ngư dân kéo lưới và thuyền thúng, nét sinh hoạt quen thuộc của làng chài ven biển miền Trung."),
  "linh-ung": dict(scene="temple",
    highlights=["Mặc trang phục kín đáo (che vai, che gối) khi vào chùa", "Tượng Quan Thế Âm cao khoảng 67 m, nhìn thấy từ xa trên đường lên bán đảo Sơn Trà", "Đường lên dốc, nên đi xe máy hoặc ô tô, tránh đi bộ"],
    culture="Chùa thờ Quan Thế Âm Bồ Tát, biểu tượng của lòng từ bi. Tượng quay mặt ra biển với ý nghĩa che chở cho ngư dân và tàu thuyền, người dân địa phương thường đến cầu bình an."),
  "ngu-hanh-son": dict(scene="mountain",
    highlights=["Có thang máy lên một đoạn, phần còn lại leo bậc đá, nên mang giày đế bám", "Động Huyền Không tối, mang đèn điện thoại", "Đi buổi sáng cho mát, ghé làng đá mỹ nghệ Non Nước ở chân núi"],
    culture="Năm ngọn núi đá vôi mang tên ngũ hành Kim, Mộc, Thuỷ, Hoả, Thổ theo quan niệm phương Đông. Trong núi có nhiều chùa và hang động thờ Phật, dưới chân là làng nghề điêu khắc đá Non Nước nổi tiếng."),
  "bao-tang-cham": dict(scene="museum",
    highlights=["Mát, ít đi bộ, hợp tránh nắng buổi chiều", "Nên xem theo từng phòng trưng bày: Mỹ Sơn, Trà Kiệu, Đồng Dương", "Thường có thuyết minh hoặc bảng giải thích song ngữ"],
    culture="Nơi lưu giữ bộ sưu tập điêu khắc Chăm lớn nhất cả nước. Vương quốc Chăm Pa phát triển từ khoảng thế kỷ 4 đến thế kỷ 15, chịu ảnh hưởng Ấn Độ giáo với các hình tượng thần Shiva, Vishnu và vũ nữ Apsara."),
  "cho-han": dict(scene="market",
    highlights=["Đi buổi sáng cho nhiều hàng và dễ đi lại", "Hỏi giá và trả giá nhẹ trước khi mua", "Giữ kỹ ví và điện thoại ở chỗ đông"],
    culture="Chợ truyền thống lâu đời ở trung tâm, bán đồ ăn vặt, hải sản khô, đặc sản mua về làm quà như mực khô, nước mắm, bánh khô mè."),
  "cau-tinh-yeu": dict(scene="bridge",
    highlights=["Lên đèn đẹp nhất sau 18h", "Gần Cầu Rồng, đi bộ ghép hai điểm được", "Có thể mua ổ khoá treo tại các quầy gần đó"],
    culture="Cầu có nhiều ổ khoá của các cặp đôi. Cuối cầu là tượng Cá chép hoá rồng, gắn với truyền thuyết cá chép vượt vũ môn thành rồng, tượng trưng cho ý chí vượt khó."),
  "art-paradise": dict(scene="frame",
    highlights=["Mang điện thoại để chụp, mặc màu trơn cho ảnh nổi hơn", "Dành khoảng 2 tiếng rưỡi, có nhân viên hướng dẫn tạo dáng", "Trong nhà nên không lo mưa nắng"],
    culture="Bảo tàng tranh 3D, nơi người xem đứng vào tranh để tạo hình ảnh vui mắt. Có nhiều cảnh mô phỏng danh thắng Việt Nam và thế giới."),
  "asia-park": dict(scene="wheel",
    highlights=["Nên vào cuối giờ chiều cho mát và ngắm đèn", "Vé vào cổng và vé trò chơi có thể tính riêng, xem lại khi mua", "Hợp trẻ em, có nhiều khu trò chơi"],
    culture="Công viên giải trí chủ đề châu Á, nổi bật với vòng quay Sun Wheel cao khoảng 115 m nhìn ra sông Hàn và trung tâm thành phố."),
  "cf-hoang-hon": dict(scene="cafe",
    highlights=["Đến trước giờ lặn khoảng 30 phút để có chỗ ngồi đẹp", "Quán mẫu, chưa phải quán thật"],
    culture="Ngắm hoàng hôn bên bờ biển là nếp thư giãn quen thuộc của người Đà Nẵng cuối ngày.",
    desc="Quán cà phê thoáng nhìn ra biển, hợp ngồi lâu, không ồn.", rating=4.4, reviews=128, review="Chỗ ngồi yên tĩnh, nước uống ổn, ngắm hoàng hôn rất đáng.", dishes=["Cà phê muối", "Trà đào", "Nước dừa"], sample=True),
  "mi-quang": dict(scene="food",
    highlights=["Gọi thêm bánh tráng mè để ăn kèm", "Giờ cao điểm trưa khá đông, nên đến trước 12h", "Quán mẫu, chưa phải quán thật"],
    culture="Mì Quảng là món đặc sản vùng Quảng Nam – Đà Nẵng: sợi mì bản to, ít nước, ăn với rau sống, đậu phộng và bánh tráng.",
    desc="Mì Quảng ít nước đậm đà, rau sống tươi, giá bình dân.", rating=4.5, reviews=312, review="Sợi mì dai, nước nhân vừa miệng, ăn no mà giá mềm.", dishes=["Mì Quảng gà", "Mì Quảng tôm thịt", "Bánh tráng mè"], sample=True),
  "banh-xeo": dict(scene="food",
    highlights=["Bánh xèo Đà Nẵng nhỏ, giòn, cuốn với bánh tráng và rau", "Món chấm thường là nước lèo đậu phộng", "Quán mẫu, chưa phải quán thật"],
    culture="Bánh xèo miền Trung nhỏ và giòn hơn miền Nam, thường ăn kèm nem lụi và rau rừng.",
    desc="Bánh xèo giòn rụm, nước chấm đậm, ăn theo phần.", rating=4.3, reviews=206, review="Bánh giòn lâu, nước lèo ngon. Đông khách giờ trưa.", dishes=["Bánh xèo", "Nem lụi", "Bánh cuốn"], sample=True),
  "hai-san": dict(scene="food",
    highlights=["Hỏi giá theo cân và chốt giá trước khi chế biến", "Nên đi nhóm 3-4 người để gọi được nhiều món", "Quán mẫu, chưa phải quán thật"],
    culture="Hải sản tươi là thế mạnh của thành phố biển, thường chọn trực tiếp từ bể rồi nhờ quán nấu theo ý.",
    desc="Quán hải sản bên biển, chọn hải sản sống tại bể, không gian thoáng.", rating=4.2, reviews=174, review="Hải sản tươi, nhân viên tư vấn nhiệt tình. Nhớ chốt giá trước.", dishes=["Ghẹ hấp", "Tôm nướng", "Mực xào"], sample=True),
  "cho-con-cu": dict(scene="food", highlights=["Đã đóng cửa, không dùng"], culture=""),
}

for p in data["places"]:
    p.update(E.get(p["id"], {}))
    p.setdefault("lat", p["lat"])

path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("đã gộp", len([p for p in data["places"] if "highlights" in p]), "địa điểm")
