# Arrow Travel

Web lên lịch trình du lịch **đổi theo đối tượng đi cùng** (một mình, cặp đôi, nhóm bạn trẻ, gia đình có trẻ nhỏ / người lớn tuổi). Bản đầu: xếp lịch bằng quy tắc thuần, không gọi AI, không cần đăng nhập hay database.

## Chạy thử
```bash
npm start   # mở http://localhost:3000
npm test    # chạy test thuật toán xếp lịch
```
Chỉ cần Node 18+. Không có thư viện nào phải cài.

## Xem trên GitHub Pages
GitHub chỉ hiện mã nguồn, không chạy web. Để mở web bằng link: vào **Settings → Pages**, mục *Build and deployment* chọn **Deploy from a branch**, chọn nhánh (hiện là `claude/tender-albattani-p9z3b9`, sau này là `main`) và thư mục **/ (root)**, bấm Save. Chờ 1-2 phút, link có dạng `https://doanminhhai222-oss.github.io/Arrow-Travel/`.

## Thanh toán bằng mã QR
Sau khi chốt, khách chọn chuyến bay và khách sạn (tìm theo ngày đã chọn) rồi thanh toán qua mã VietQR tới tài khoản trong `data/payment.json`. Không có cổng thanh toán, không tự xác nhận: chủ app đối chiếu giao dịch theo mã đặt chỗ (ví dụ `ATWX7U8T`, nằm trong nội dung chuyển khoản) rồi mới xác nhận vé và phòng.

**Mặc định đang ở chế độ thử**: chuyến bay và khách sạn là dữ liệu mẫu nên mã QR bị phủ chữ MẪU. Để nhận tiền thật cần đủ cả 2 điều kiện:
1. `data/payment.json`: đổi `"mode"` thành `"live"` và điền `accountName` (tên chủ tài khoản, để khách đối chiếu).
2. `data/flights.json` và `data/travel-options.json`: thay bằng dữ liệu thật rồi đổi `"sample"` thành `false`.

Chưa đủ cả hai thì app không hiện mã QR dùng được. Tìm "tất cả các hãng" thật cần nguồn dữ liệu của đại lý hoặc API trả phí, hiện đang là dữ liệu mẫu 4 hãng.

## Chi tiết khách sạn và đánh giá Google Maps
Mỗi khách sạn có trang chi tiết: ảnh, mô tả, loại phòng (đổi loại phòng thì giá và số phòng đổi theo), đánh giá, liên kết mở Google Maps. **Hiện đánh giá, điểm số và ảnh đều là dữ liệu mẫu** (ghi rõ "đánh giá mẫu").

Muốn hiện đánh giá thật từ Google Maps: tạo khoá Google Maps Platform, bật **Places API (New)** (dịch vụ trả phí, có hạn mức miễn phí), **giới hạn khoá theo tên miền web của mày** rồi điền vào `data/google.json` (`apiKey`). App tải trực tiếp khi mở chi tiết, ghi nguồn "Google Maps". Không lưu sẵn nội dung đánh giá vào file vì điều khoản Google không cho. Khoá nằm trong file công khai nên **bắt buộc** giới hạn theo tên miền. Bản artifact trên claude.ai chặn gọi mạng ngoài nên chỉ hiện đánh giá mẫu.

## Tính năng người dùng (lưu trên thiết bị, chưa có máy chủ)
- Màn hình mở app (ảnh nền `web/images/splash.jpg`, tên app, slogan), cài đặt giao diện (Sáng, Hồng nhạt, Vàng nhạt; không còn giao diện tối, người đang để tối tự chuyển về Sáng), ngôn ngữ (Việt/Anh/Trung/Nhật/Hàn, mới dịch phần giao diện chính), tiền tệ hiển thị (tỉ giá mẫu).
- Khuyến mãi theo địa điểm, chuyến bay, khách sạn (`data/promos.json`, mẫu); nhập mã khi thanh toán.
- **Điểm đến Hội An** (chọn ở Khám phá hoặc ô "Điểm đến" khi tạo lịch trình): 40 địa điểm thật gồm di sản phố cổ (Chùa Cầu, hội quán, nhà cổ, bảo tàng), check-in, làng nghề (Trà Quế, Thanh Hà, Kim Bồng), biển An Bàng, Cửa Đại, Cù Lao Chàm, Mỹ Sơn, đêm đèn lồng, quán ăn và cà phê; 8 khách sạn mẫu; 3 lịch trình nổi bật mẫu. Thêm bằng `python3 scripts/add-hoian.py` (mỗi địa điểm có `city`, đặt thêm điểm đến mới theo cùng cách). Toạ độ, giá, giờ mở cửa là ước lượng (cờ `approx`), giá vé phố cổ 120.000 đ (khách quốc tế) tính một lần cho cả chuyến qua `ticketGroup`. Hội An không có sân bay nên chuyến bay vẫn tới Đà Nẵng (DAD), cách khoảng 30 km.
- **Điểm đến Phú Quốc**: 27 địa điểm (Bãi Sao, Bãi Khem, Bãi Trường, Bãi Dài, tour 4 đảo, cáp treo Hòn Thơm, Thị trấn Hoàng Hôn, VinWonders, Safari, Grand World, Dinh Cậu, nhà thùng nước mắm, làng chài Hàm Ninh, chợ đêm, quán gỏi cá trích, bún quậy, ghẹ Hàm Ninh…), 8 khách sạn mẫu, 3 lịch trình nổi bật mẫu, thêm bằng `python3 scripts/add-phuquoc.py`. Khác Hội An, Phú Quốc có sân bay riêng (PQC): `data/flights.json` có mục `destinations` (sân bay và bảng tuyến theo từng điểm đến, chỉ có tuyến Hồ Chí Minh, Hà Nội, Cần Thơ, tất cả là giá MẪU), `data/transport.json` có `airports`. Toạ độ, giá, giờ mở cửa là ước lượng (cờ `approx`). Thêm điểm đến mới: tạo script như `add-phuquoc.py`, thêm vào `DESTS` ở `web/app.js` và `destinations` ở `data/flights.json`.
- **Điểm đến Hà Nội**: 36 địa điểm (Hồ Gươm, đền Ngọc Sơn, phố cổ, Văn Miếu, Hoàng thành Thăng Long, Lăng Bác, Chùa Một Cột, Hỏa Lò, các bảo tàng, múa rối nước, Bát Tràng, Chùa Hương, phở, bún chả, chả cá, cà phê trứng…), 8 khách sạn mẫu, 3 lịch trình nổi bật mẫu, thêm bằng `python3 scripts/add-hanoi.py`. Có sân bay Nội Bài (HAN), tuyến bay mẫu từ TP.HCM, Đà Nẵng, Cần Thơ (thêm nơi khởi hành "Đà Nẵng"). Địa điểm có thể đóng cửa theo ngày: `closedWeekdays` (0 = Chủ nhật) và `closedBetween` (khoảng ngày); bộ xếp lịch tự tránh, hiện dùng cho Lăng Bác (nghỉ thứ Hai, thứ Sáu và tu bổ 4/9–2/11/2026 theo thông báo). Giá vé: Văn Miếu 70.000 đ, Hoàng thành 100.000 đ, Hỏa Lò và đền Ngọc Sơn 50.000 đ (nghị quyết HĐND Hà Nội, có thể đổi).
- **Logo và ngôn ngữ**: logo mới là đường đi uốn lượn từ điểm xuất phát (chấm cam) tới mũi tên gấp giấy, file gốc `web/logo.svg` (bản PNG `web/images/logo-512.png`, `logo-192.png` dùng cho biểu tượng app sau này). Bản đồ Việt Nam thu nhỏ có hai quần đảo Hoàng Sa, Trường Sa (`src/vnmap.js`, hình giản lược chỉ để làm biểu tượng) hiện sau tên app. Giao diện có 5 ngôn ngữ: Việt, Anh, Trung giản thể, Nhật, Hàn (`src/i18n-*.js`, khoá là câu tiếng Việt; câu thiếu thì dùng tiếng Anh, test kiểm đủ khoá). Bản dịch Trung, Nhật, Hàn do AI soạn, nên nhờ người bản ngữ rà lại trước khi phát hành.
- **ArrowPro (gói trả phí)**: trang Tài khoản → ArrowPro. Giá sửa ở `data/pro.json` (mặc định 49.000 đ/tháng, 399.000 đ/năm). Mua bằng chuyển khoản QR, chủ app đối chiếu rồi gửi **mã kích hoạt có chữ ký số** (`node scripts/pro-license.mjs sign 30 "Tên khách"`), app kiểm tra bằng khoá công khai trong `data/pro.json` nên không làm giả được mã; khoá bí mật (`*.jwk`) không bao giờ đưa lên GitHub. Có dùng thử 7 ngày mỗi thiết bị. Đặc quyền đã có: dùng ngoại tuyến (`web/sw.js`, chỉ bản web), tối ưu lộ trình trong ngày (`src/optimize.js`), theo dõi chuyến bay trực tiếp (mở Flightradar24), mã ưu đãi riêng (mẫu), tệp đính kèm và ảnh khoảnh khắc không giới hạn (bản thường 3 tệp/chuyến, 10 ảnh/nơi), giao diện Hồng nhạt. "Sắp có", chưa tính vào gói: quét Gmail (cần Google duyệt quyền đọc Gmail, có đánh giá bảo mật trả phí, và máy chủ), tiện ích Chrome (sản phẩm riêng). Giới hạn: chưa có máy chủ nên gói gắn theo thiết bị và một mã vẫn có thể bị chia sẻ.
- **Video kỷ niệm có nhạc** (Khoảnh khắc → "Tạo video kỷ niệm có nhạc"): ghép ảnh đã đăng thành video dọc 9:16 (mở đầu, mỗi ảnh có tên nơi, sao, cảm nhận, hiệu ứng zoom chậm, chuyển cảnh mờ, khung kết). Nhạc nền 3 bài do app tự tổng hợp bằng Web Audio (`src/reel.js`, không bản quyền), hoặc nhạc người dùng chọn từ máy. Xuất bằng MediaRecorder theo thời gian thực ra .mp4 (Chrome/Safari mới) hoặc .webm; tải về hoặc chia sẻ. Mọi thứ chạy trên máy, không tải ảnh lên đâu.
- **Đổi thứ tự và thêm địa điểm bất kỳ**: kéo tay cầm ⋮⋮ bên trái mỗi điểm để đổi thứ tự trong ngày (hoặc chọn tay cầm rồi bấm phím mũi tên lên/xuống), giờ giấc tự tính lại, có Hoàn tác. Trong "Thêm địa điểm", tab "Bất kỳ trên Google Maps" nhận link Google Maps đầy đủ hoặc toạ độ (`src/gmaps.js` đọc toạ độ và tên, không gọi mạng; link rút gọn maps.app.goo.gl không đọc được). Địa điểm tự thêm lưu trên thiết bị (`customPlaces`) và không được dùng để tự xếp lịch.
- **Quán ăn và cà phê thật**: `scripts/add-places.py` thêm 12 quán nổi tiếng ở Đà Nẵng (Ăn Thôi, bánh xèo Bà Dưỡng, Highlands, Starbucks, Phê La, Trình...). Địa chỉ lấy từ nguồn công khai, toạ độ, giá, giờ mở cửa là ước lượng (cờ `approx`), chưa có điểm đánh giá. Lịch trình có tối đa một quán cà phê mỗi ngày, từ đầu giờ chiều.
- **Khoảnh khắc của tôi** (tab thứ ba): chọn chuyến, với mỗi địa điểm đã đi có ảnh, chấm sao 1-5 và nhận xét, ảnh, sao và nhận xét chỉ là **bản nháp ("Chưa đăng")** cho tới khi bấm **Đăng khoảnh khắc** (có nút Huỷ thay đổi), rồi gom thành **album kỷ niệm**. Ảnh nằm trong IndexedDB, sao và nhận xét trong `localStorage`, đều chỉ trên thiết bị. Màn tạo lịch trình mở từ nút Lên lịch trình ở Khám phá hoặc + Lịch trình mới.
- **Theo dõi lịch trình** (tab thứ tư, thay cho tab Thông báo; thông báo giờ ở **chuông góc trên bên phải**): bấm Bắt đầu chuyến ở một lịch trình đã lưu. Bật vị trí để app tự đánh dấu điểm đã đến (cách điểm đến dưới 150 m), hoặc chọn thủ công "Tôi ở đây". Bản đồ SVG hiện vị trí bạn, điểm đã đi, điểm tiếp theo và gợi ý gần đó (check-in, quán ăn, cây xăng, ATM, nhà thuốc). Vị trí không được lưu hay gửi đi.
  - Định vị dùng `navigator.geolocation` của trình duyệt (không đăng nhập Google). **Trong artifact trên claude.ai trình duyệt chặn định vị và mạng ngoài**, chỉ chạy đầy đủ ở bản web GitHub Pages. Cây xăng, ATM, nhà thuốc lấy từ OpenStreetMap qua Overpass API (miễn phí, không khoá, © OpenStreetMap contributors); lỗi mạng thì dùng danh mục của app và liên kết tìm trên Google Maps.
- Điểm thưởng và voucher (`src/loyalty.js`); lịch trình yêu thích; ảnh chuyến đi tự đăng theo từng địa điểm (IndexedDB).
- Bạn đồng hành, đánh giá app, chính sách bảo mật, điều khoản, hướng dẫn thanh toán (`data/legal.json`, **bản nháp, cần luật sư**; điền các mục `[ĐIỀN]`).
- Điểm, voucher, đánh giá, bạn bè đều nằm trong trình duyệt của người dùng nên có thể bị sửa tay; chủ app vẫn phải đối chiếu số tiền chuyển khoản khi xác nhận đơn. Muốn nhận đánh giá thật: dán liên kết biểu mẫu vào `feedbackUrl` trong `data/app.json`.

## Kiểm tra bản đóng gói
`npm test` chỉ kiểm tra logic. Bản artifact là file được đóng gói riêng, có thể hỏng mà `npm test` vẫn qua (đã từng xảy ra với một import đổi tên). Sau khi sửa giao diện, chạy thêm:
```bash
python3 scripts/build-artifact.py dist/arrow-travel.html
node scripts/smoke-bundle.cjs dist/arrow-travel.html   # cần Playwright
```

## Cấu trúc
| Đường dẫn | Việc |
|---|---|
| `src/scheduler.js` | Logic xếp lịch (dùng lại được cho app Expo sau này) |
| `data/da-nang.json` | Địa điểm Đà Nẵng. **Dữ liệu mẫu**, cần kiểm lại toạ độ, giờ, giá |
| `data/travel-options.json` | Nơi khởi hành, vé máy bay, khách sạn (giá mẫu) |
| `src/detail.js` | Trang chi tiết địa điểm (ảnh minh hoạ, bản đồ mini, văn hoá, đánh giá quán) |
| `scripts/enrich-places.py` | Gộp nội dung chi tiết vào `data/da-nang.json` |
| `src/transport.js` + `data/transport.json` | Đề xuất xe máy, Grab, Xanh SM, taxi... và tính chi phí theo quãng đường (giá mẫu) |
| `src/search.js` | Tìm chuyến bay (mọi hãng) và khách sạn theo ngày, giá và chỗ trống mẫu |
| `src/hoteldetail.js` + `src/google.js` | Trang chi tiết khách sạn; lấy và chuẩn hoá đánh giá từ Google Places API |
| `src/payment.js` | Tạo mã VietQR (chuẩn NAPAS), mã đặt chỗ, điều kiện được nhận tiền thật |
| `vendor/qrcode-generator.js` | Thư viện vẽ mã QR (MIT, Kazuhiko Arase), chép nguyên bản 1.4.4 |
| `src/nearby.js` + `src/trackmap.js` | Gợi ý gần đó (danh mục + Overpass), nhận biết đã đến nơi, bản đồ theo dõi |
| `src/costing.js` | Ước tính tổng chi phí sau khi chốt lịch trình |
| `data/rules.json` | `Quy_tac_doi_tuong`: giờ bắt đầu, số điểm/ngày, nghỉ trưa, di chuyển tối đa |
| `web/` | Giao diện (HTML + JS thuần): 5 màn hình Khám phá, Tạo mới, Lịch trình của tôi, Thông báo, Tài khoản. **Nguồn duy nhất của giao diện** |
| `scripts/build-artifact.py` | Đóng gói `web/` thành 1 file HTML để đăng artifact trên claude.ai |
| `test/` | Test bằng `node --test` |

## Logic xếp lịch
1. Lọc theo đối tượng, nhãn trẻ nhỏ / người lớn tuổi, ngân sách.
2. Bỏ điểm `closed`; điểm `stale` vẫn xếp nhưng có cảnh báo.
3. Chấm điểm theo khung giờ đẹp, loại địa điểm ưu tiên của đối tượng, phong cách, quãng di chuyển.
4. Xếp tuần tự trong ngày, chèn bữa trưa/nghỉ trưa, kiểm tra giờ mở cửa và di chuyển tối đa.
5. Trả JSON để giao diện tự vẽ.

## Lộ trình
- [x] Khung + thuật toán + form + xem theo ngày
- [x] Đổi / xoá địa điểm có gợi ý thay thế
- [x] Chi tiết địa điểm (ảnh minh hoạ, bản đồ mini, văn hoá, đánh giá quán)
- [x] Chốt lịch trình: vé máy bay, khách sạn, tổng chi phí (giá mẫu)
- [x] Màn hình Khám phá, thanh công cụ, lưu lịch trình trên thiết bị
- [ ] Thêm địa điểm, báo thông tin sai
- [ ] Chia sẻ bằng liên kết, xuất PDF
- [ ] Nhập dữ liệu từ Excel → JSON
- [ ] Giai đoạn 2: app (Expo) dùng lại `src/scheduler.js`
