# Hồ sơ gửi luật sư: chính sách bảo mật, điều khoản, hoàn tiền

Bản nháp ngày 25/10/2026. Các văn bản nằm trong app (Tài khoản, mục Chính sách bảo mật, Điều khoản sử dụng, Chính sách huỷ và hoàn tiền, Hướng dẫn thanh toán), nội dung ở `data/legal.json`. Chỗ chủ app phải điền hoặc quyết định được tô vàng trong app và ghi dạng `[ĐIỀN: ...]`, `[ĐỀ XUẤT: ...]`; chỗ cần luật sư xác nhận ghi `[Luật sư ...]`.

Đây là bản soạn bằng công cụ, mô tả đúng hành vi của app lúc viết, chưa phải tư vấn pháp lý. Luật được nêu theo các trang tổng hợp pháp luật, chưa đối chiếu văn bản gốc.

## 1. Mô tả sản phẩm (để luật sư nắm)

- Ứng dụng web (cài được như app) tự xếp lịch trình du lịch theo người đi cùng, ước tính chi phí, gợi ý chuyến bay và khách sạn, theo dõi chuyến đi, ghi khoảnh khắc, điểm thưởng. 9 điểm đến, 5 ngôn ngữ.
- **Chưa có tài khoản, chưa có máy chủ lưu dữ liệu người dùng.** Mọi dữ liệu của người dùng nằm trong bộ nhớ trình duyệt của họ.
- Gói trả phí ArrowPro (dự kiến 49.000 đ/tháng, 399.000 đ/năm). Hiện thanh toán là chuyển khoản QR thủ công, chủ app gửi mã kích hoạt; chế độ đang là **thử** (không thu tiền thật). Sẽ đổi sang cổng thanh toán và kiểm tra quyền ở máy chủ khi mở bán.
- Chuyến bay, khách sạn, khuyến mãi, đánh giá, lịch trình "cộng đồng" hiện là **dữ liệu mẫu**. Dự định chuyển sang liên kết tiếp thị hoặc API có giấy phép, app không tự thu tiền đặt chỗ (chưa quyết định).

## 2. Luồng dữ liệu hiện tại

| Dữ liệu | Nằm ở đâu | Gửi cho ai | Ghi chú |
|---|---|---|---|
| Lịch trình, cài đặt, yêu thích, đánh giá, điểm thưởng, voucher, thông báo, đơn đặt thử, địa điểm tự thêm | Bộ nhớ trình duyệt của người dùng | Không ai | Không mã hoá |
| Ảnh, tệp đính kèm (vé, giấy tờ chuyến đi) | IndexedDB trong trình duyệt | Không ai | Không mã hoá, người dùng có thể đính kèm giấy tờ nhạy cảm |
| Vị trí GPS | Bộ nhớ tạm khi app mở, không lưu | **Overpass API (overpass-api.de)** nhận toạ độ và IP khi mở "Gợi ý gần đó" | Sửa lại lời "không theo dõi vị trí" trong bản cũ cho đúng thực tế |
| Địa chỉ IP, thông tin trình duyệt | Máy chủ phục vụ trang | Google Fonts, nhà cung cấp hosting (GitHub Pages) | Không có cookie theo dõi, không có công cụ thống kê |
| Số tiền, nội dung chuyển khoản, tên và số tài khoản người chuyển | Sao kê ngân hàng của chủ app | Ngân hàng | Chỉ khi thu tiền thật |
| Mã kích hoạt ArrowPro đã cấp | Sổ của chủ app | Không | Dự kiến lưu để hỗ trợ và chống dùng sai |

## 3. Việc chủ app phải điền (không cần luật sư)

1. Tên hộ kinh doanh hoặc công ty, mã số thuế, địa chỉ (privacy, terms).
2. Email, số điện thoại liên hệ (mọi văn bản).
3. Nhà cung cấp hosting thật khi mở bán (hiện là GitHub Pages).
4. Giá ArrowPro chốt, thời hạn hoàn tiền (đề xuất 7 ngày), thời gian phản hồi, thời gian hoàn tiền.
5. Thời gian đối chiếu thanh toán (Hướng dẫn thanh toán, bước 5).
6. Nơi toà án giải quyết tranh chấp (thường là nơi đặt trụ sở).

## 4. Câu hỏi cho luật sư

**Mô hình kinh doanh**
1. Chỉ đặt liên kết tới vé máy bay, khách sạn của đối tác và nhận hoa hồng có cần giấy phép lữ hành hoặc đăng ký đại lý du lịch theo Luật Du lịch 2017 không? Nếu app tự thu tiền đặt vé thì sao?
2. Ứng dụng có thuộc diện đăng ký hoặc thông báo với Bộ Công Thương (Nghị định 52/2013, sửa đổi bởi 08/2018 và 85/2021, Thông tư 59/2015 và 01/2022) không? Nếu có thì là đăng ký sàn giao dịch hay thông báo website bán hàng?
3. Chọn hộ kinh doanh hay công ty? Ảnh hưởng thuế, hoá đơn điện tử, tư cách thu tiền thuê bao.

**Dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, hiệu lực 1/1/2026, và nghị định hướng dẫn)**
4. Vị trí có phải dữ liệu nhạy cảm cần đồng ý riêng, bằng văn bản hoặc hình thức tương đương, không? Cách xin quyền của trình duyệt cộng với lời giải thích trong chính sách có đủ không, hay cần hộp đồng ý trong app?
5. Việc gửi toạ độ và IP tới Overpass API (OpenStreetMap, máy chủ ở nước ngoài) và IP tới Google Fonts có là chuyển dữ liệu cá nhân ra nước ngoài, cần hồ sơ đánh giá tác động không? Có nên làm tròn toạ độ hoặc bỏ Google Fonts (tự lưu phông chữ) để giảm rủi ro?
6. Khi thêm tài khoản và đồng bộ: nghĩa vụ xin đồng ý, thời hạn phản hồi quyền của chủ thể, thông báo sự cố, hồ sơ đánh giá tác động, chỉ định bộ phận hoặc người phụ trách bảo vệ dữ liệu.
7. Ngưỡng tuổi cho trẻ em (đang ghi dưới 16 tuổi cần người giám hộ) và cách xin đồng ý của cha mẹ.

**Điều khoản và người tiêu dùng**
8. Giới hạn trách nhiệm và miễn trừ thông tin tham khảo có hiệu lực với người tiêu dùng không (Luật Bảo vệ quyền lợi người tiêu dùng 2023)? Điều khoản nào bị coi là bất lợi, không có hiệu lực?
9. Chính sách hoàn tiền gói thuê bao số (đề xuất 7 ngày): có phải đáp ứng quyền đơn phương chấm dứt hoặc đổi trả của người mua từ xa không?
10. Thông tin sai trên app (đóng cửa, đổi giá) gây thiệt hại cho người dùng: mức độ rủi ro và cách ghi miễn trừ đúng chuẩn.
11. Dùng tên và hình ảnh quán, thương hiệu thật (Highlands, Starbucks, Phê La…) để mô tả địa điểm: có cần xin phép hoặc ghi miễn trừ không.

**Sở hữu trí tuệ**
12. Điều kiện sử dụng ảnh Wikimedia (CC BY, CC BY-SA) trong sản phẩm thương mại: cách ghi nguồn hiện tại (dòng dưới ảnh và tệp danh sách) đã đủ chưa, ảnh nén và thu nhỏ có phải ảnh phái sinh theo CC BY-SA không.
13. Ảnh do chủ dự án cung cấp (27 ảnh, danh sách ở `docs/KIEM-KE-ANH.md`) cần chứng từ quyền sử dụng thương mại gì.
14. Đăng ký nhãn hiệu "Arrow Travel" và logo.

## 5. Phần cần thêm khi sản phẩm lớn hơn (chưa đưa vào app vì sai với hiện trạng)

Khi có từng thay đổi dưới đây, văn bản phải sửa trước khi bật:
- **Tài khoản và đồng bộ lịch trình:** hộp xin đồng ý rõ ràng; mục dữ liệu thu thập, mục đích, thời gian lưu; nút xoá tài khoản và dữ liệu; xuất dữ liệu; danh sách bên xử lý (nhà cung cấp máy chủ, email); chuyển dữ liệu ra nước ngoài.
- **Cổng thanh toán:** tên cổng và vai trò; không lưu số thẻ; hoá đơn điện tử; xử lý tranh chấp thanh toán; quy trình hoàn tiền tự động.
- **Công cụ thống kê, đo lỗi (Sentry, Plausible, PostHog…):** loại dữ liệu, đồng ý, tắt được.
- **Nội dung do người dùng chia sẻ công khai:** điều khoản cấp phép nội dung, quy trình báo vi phạm và gỡ nội dung, kiểm duyệt.
- **Quét Gmail, tiện ích Chrome (đang ghi "Sắp có"):** yêu cầu duyệt của Google, phạm vi quyền, lưu trữ nội dung email.
- **Bán ra nước ngoài:** luật nước đó (ví dụ GDPR nếu có người dùng châu Âu), điều khoản bằng ngôn ngữ tương ứng.

## 6. Đề xuất sửa nhỏ trong app để giảm rủi ro (chưa làm, chờ quyết định)

1. Làm tròn toạ độ gửi cho Overpass API còn khoảng 1 km (2 chữ số thập phân), hoặc hỏi người dùng trước khi gọi.
2. Tự lưu phông chữ trong repo thay vì tải từ Google Fonts để không gửi IP người dùng cho Google.
3. Thêm một dòng giải thích trước nút bật theo dõi: vị trí dùng để làm gì, gợi ý gần đó có gửi toạ độ ra ngoài, xem chính sách ở đâu.
4. Cảnh báo ngay ở màn hình thêm tệp đính kèm: không đính kèm căn cước, hộ chiếu, thẻ ngân hàng.
5. Trang "Nguồn ảnh" trong app với liên kết giấy phép từng ảnh.
