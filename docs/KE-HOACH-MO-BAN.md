# Kế hoạch mở bán Arrow Travel

Cập nhật 12/10/2026, dựa trên bản demo hiện tại (9 điểm đến, 233 địa điểm, kết hợp nhiều thành phố, gói ArrowPro, 5 ngôn ngữ). Đây là bản rà soát kỹ thuật và kế hoạch, không phải tư vấn pháp lý hay thuế: các mục pháp lý cần luật sư hoặc kế toán xác nhận.

## 1. Hiện trạng (đã đo)

- Bản đưa lên web (thư mục `web/`): tải lần đầu khoảng 1,6 MB (chưa nén), 57 yêu cầu, chủ yếu JSON dữ liệu 554 KB, JS 416 KB, ảnh trang chủ 614 KB. Khi bật nén gzip trên hosting thật thì còn khoảng 0,9 MB. Ảnh địa điểm tải lười theo từng ảnh. Đây là mức nhẹ, đủ cho 4G.
- Bản đóng gói một file (artifact): 12,8 MB, sát giới hạn 16 MB. Chỉ dùng để xem thử, không phải bản bán.
- 94 test tự động đều qua. Kiểm tra trên trình duyệt thật (Playwright) hiện nằm ngoài kho mã, sẽ mất khi phiên làm việc kết thúc.
- Chức năng chạy được: tạo lịch trình theo đối tượng, kết hợp nhiều thành phố, chuyến bay và khách sạn (dữ liệu mẫu), chi phí, theo dõi chuyến đi, khoảnh khắc và video, điểm thưởng, 5 ngôn ngữ, ArrowPro (thử 7 ngày, mã kích hoạt, ngoại tuyến, tối ưu lịch trình, đính kèm).

## 2. Những việc chặn việc mở bán (làm trước khi thu tiền)

1. **Dữ liệu bán hàng đang là dữ liệu mẫu.** Chuyến bay, khách sạn, đánh giá, mã giảm giá, lịch trình nổi bật của "cộng đồng" và các quán có chữ "(mẫu)" đều không có thật. App đang ghi rõ như vậy, và `data/payment.json` đang để `mode: "demo"` nên không nhận tiền thật. Khi mở bán không được bán vé hay phòng từ dữ liệu này.
   - Hướng ít rủi ro nhất: chuyển mục chuyến bay, khách sạn sang liên kết tiếp thị liên kết (Agoda, Booking, Traveloka, Klook…) hoặc API có giấy phép, app không tự thu tiền đặt chỗ.
   - Địa điểm: khoảng 170 địa điểm ở 8 điểm đến mới có toạ độ, giá vé, giờ mở cửa là ước lượng (cờ `approx`). Cần quy trình xác minh (nguồn, ngày kiểm tra gần nhất, nút "báo sai thông tin").
2. **Thanh toán và gói Pro.** Hiện chuyển khoản QR thủ công vào tài khoản cá nhân, chủ app tự gửi mã kích hoạt. Số tài khoản đang nằm trong `data/payment.json` trên kho mã (kiểm tra kho có công khai không, nếu có thì số tài khoản đang lộ).
   - Cần pháp nhân thu tiền (hộ kinh doanh hoặc công ty), cổng thanh toán có đối soát tự động (PayOS, VNPay, MoMo, hoặc Stripe nếu bán quốc tế), hoá đơn, chính sách hoàn tiền.
   - Nếu làm ứng dụng trên App Store hoặc Google Play thì mua gói số phải qua thanh toán của cửa hàng (phí 15–30%).
3. **Gói Pro đang kiểm tra ở trình duyệt.** Chữ ký mã kích hoạt (ECDSA) là đúng, nhưng ngày dùng thử, ngày hết hạn và trạng thái nằm trong `localStorage`: người dùng sửa được, xoá dữ liệu là có thể dùng thử lại, một mã dùng được trên nhiều máy, không thu hồi được. Muốn thu tiền ổn định cần tài khoản và máy chủ kiểm tra quyền (entitlement).
4. **Dữ liệu người dùng chỉ nằm trong trình duyệt.** Xoá dữ liệu trình duyệt, đổi máy, hoặc chế độ riêng tư là mất hết lịch trình, ảnh, điểm thưởng. Với sản phẩm bán tiền, đây là rủi ro chính. Cần tối thiểu: đăng nhập (Google, Apple, email), đồng bộ lịch trình lên máy chủ, xuất và nhập bản sao lưu.
5. **Pháp lý (nhờ luật sư xác nhận).**
   - `data/legal.json` đang là bản nháp, còn các mục [ĐIỀN]. Cần chính sách bảo mật theo Nghị định 13/2023 về bảo vệ dữ liệu cá nhân, điều khoản sử dụng, chính sách hoàn tiền.
   - Câu "không theo dõi vị trí" trong chính sách cần viết lại cho khớp với tính năng theo dõi chuyến đi (dùng vị trí ngay trên máy, không gửi đi): nói rõ thay vì nói không.
   - Nếu bán dịch vụ đặt chỗ, tour: kiểm tra giấy phép kinh doanh lữ hành (Luật Du lịch 2017) và thông báo website thương mại điện tử với Bộ Công Thương. Nếu chỉ liên kết tiếp thị thì ít ràng buộc hơn, vẫn nên hỏi.
   - Đăng ký nhãn hiệu "Arrow Travel" và logo (Cục Sở hữu trí tuệ), kiểm tra trùng trước.
6. **Bản quyền ảnh và dữ liệu.**
   - Ảnh Wikimedia dùng được kèm ghi nguồn (app đã hiển thị dòng ghi nguồn, file `web/images/CREDITS.md`). Giấy phép CC BY-SA yêu cầu giữ nguyên điều kiện khi chia sẻ lại.
   - Các ảnh do chủ dự án gửi (ảnh nền đối tượng đi cùng, nền thẻ đặt vé, nền lịch trình nổi bật, nhiều ảnh địa điểm, ảnh lấy tham khảo từ Pinterest) cần xác nhận có quyền dùng thương mại. Không có quyền thì thay bằng ảnh tự chụp, mua ảnh, hoặc ảnh giấy phép tự do.
   - Google Places: điều khoản không cho lưu sẵn nội dung đánh giá, app đang chỉ tải trực tiếp, giữ nguyên cách này. Dữ liệu OpenStreetMap (ODbL) phải ghi nguồn nếu dùng.

## 3. Việc kỹ thuật cần làm (theo thứ tự)

1. **Hạ tầng và đưa lên mạng:** tên miền riêng, HTTPS, hosting tĩnh có CDN và nén (Cloudflare Pages, Vercel, hoặc GitHub Pages khi còn nhỏ). Kho mã đã có `.nojekyll`, chạy được ngay trên GitHub Pages.
2. **Khả năng cài và chia sẻ:** đã có `manifest.webmanifest`, biểu tượng nhiều kích cỡ, thẻ `description`, Open Graph và Twitter Card (12/10/2026). Còn lại: đổi địa chỉ trang sang tên miền thật, thêm ảnh chụp màn hình vào manifest để cửa hàng và trình duyệt hiện đẹp hơn.
3. **Chia nhỏ dữ liệu theo điểm đến.** `data/da-nang.json` (320 KB) đang chứa mọi địa điểm của mọi điểm đến, và mọi điểm đến đều được tải ngay từ đầu. Tách thành mỗi điểm đến một file và chỉ tải khi chọn. Cần làm trước khi vượt 20 điểm đến. Tên file `da-nang.json` cũng nên đổi thành `places.json` hoặc tách thư mục.
4. **Ảnh:** chuyển JPEG sang WebP hoặc AVIF (nhẹ hơn khoảng 30–40%), cấp nhiều kích cỡ theo màn hình, ảnh đặt trên CDN. 119 trên 233 địa điểm có ảnh, khoảng 114 địa điểm còn dùng ảnh vẽ minh hoạ.
5. **Kiểm thử tự động trong kho mã:** đưa các kịch bản Playwright (hiện ở thư mục tạm) vào `test/e2e`, chạy bằng GitHub Actions cùng `npm test` ở mỗi lần đẩy mã. Thêm kiểm thử thử trên iPhone Safari thật (MediaRecorder tạo video, IndexedDB ở chế độ riêng tư, chế độ ngoại tuyến).
6. **Theo dõi lỗi và số liệu:** Sentry (hoặc tương tự) để thấy lỗi JS của người dùng thật, công cụ thống kê tôn trọng quyền riêng tư (Plausible, PostHog) với các chỉ số: tạo lịch trình, lưu, chốt, dùng thử Pro, trả tiền.
7. **Máy chủ nhẹ (khi bắt đầu thu tiền):** tài khoản, đồng bộ lịch trình, kiểm tra quyền Pro, webhook của cổng thanh toán. Có thể dùng dịch vụ có sẵn (Supabase, Firebase) để khỏi tự dựng.
8. **Truy cập (accessibility):** chưa rà soát độ tương phản, thứ tự phím Tab, đọc màn hình ở các màn mới (chip kết hợp thành phố, khách sạn theo từng thành phố).
9. **Bản dịch:** tiếng Anh, Trung, Nhật, Hàn do AI dịch, chưa người bản ngữ rà soát. Các chuỗi sinh động (tiêu đề ngày, cảnh báo, ghi chú chặng dài) và chữ trong video vẫn là tiếng Việt. Muốn bán ở nước ngoài thì cần người rà soát và dịch nốt.
10. **Chất lượng lịch trình:** bộ xếp lịch là quy tắc cố định, chạy tốt với dữ liệu hiện tại. Khi dữ liệu lớn hơn cần lọc theo vùng và có thêm kiểm tra tính hợp lý (ví dụ không xếp điểm đóng cửa, giờ mở cửa thay đổi theo mùa).
11. **Dọn kho mã:** đã bỏ các tệp `.pyc` khỏi kho; vẫn còn script thêm điểm đến lặp nhiều nội dung, nên chuyển dữ liệu địa điểm sang file JSON dễ chỉnh thay vì mã Python.

## 4. Bảo mật (đã rà một lượt)

- Chuỗi người dùng nhập (tên địa điểm, ghi chú, tên bạn, chú thích) đều đi qua hàm thoát `esc()` trước khi đưa vào trang; các thông báo hoàn tác dùng `textContent` hoặc `esc`. Chưa thấy lỗ hổng chèn mã (XSS) trong lần rà này, nhưng chưa phải kiểm thử bảo mật chuyên sâu.
- Khoá công khai của Pro nằm trong `data/pro.json`, khoá bí mật nằm ngoài kho (`~/.arrow-pro-private.jwk`, đã có `*.jwk` trong `.gitignore`). Giữ nguyên, sao lưu khoá bí mật ở nơi an toàn: mất khoá là không cấp mã mới được.
- Chưa có chính sách bảo mật nội dung (CSP) cho bản web, chỉ có trong khung artifact. Nên thêm khi lên hosting thật.
- Khi có máy chủ: mã hoá kết nối, giới hạn tần suất, không lưu số thẻ (để cổng thanh toán xử lý), kiểm tra quyền ở máy chủ chứ không tin trình duyệt.

## 5. Lộ trình đề xuất

**Giai đoạn 0 (1 tuần) - Quyết định.** Chọn mô hình thu tiền: gói Pro (đăng ký), liên kết tiếp thị, hoặc cả hai. Chọn nền tảng (web cài được, hoặc bọc thành app cửa hàng). Chốt pháp nhân thu tiền. Gửi bản nháp pháp lý cho luật sư.

**Giai đoạn 1 (2–3 tuần) - Làm cho an toàn để cho người lạ dùng.**
- Đưa lên tên miền riêng có HTTPS, thêm manifest, biểu tượng, Open Graph.
- Thay ảnh chưa rõ bản quyền, hoàn thiện bản ghi nguồn.
- Viết lại chính sách bảo mật, điều khoản. Bỏ hoặc gắn nhãn rõ mọi dữ liệu mẫu.
- Chuyển mục chuyến bay, khách sạn sang liên kết tiếp thị hoặc tắt hẳn đặt chỗ.
- Thêm nút "báo sai thông tin", ngày kiểm tra gần nhất cho từng địa điểm.
- Thêm Sentry, thống kê, GitHub Actions kèm Playwright.

**Giai đoạn 2 (3–4 tuần) - Bản thử kín (20–50 người).**
- Tài khoản và đồng bộ lịch trình (Supabase hoặc Firebase), xuất và nhập sao lưu.
- Cổng thanh toán cho gói Pro, kiểm tra quyền ở máy chủ, thay mã kích hoạt thủ công.
- Chia dữ liệu theo điểm đến, chuyển ảnh sang WebP, thử trên iPhone và Android thật.
- Mời người dùng thật dùng, đo: tạo lịch trình, lưu, chốt, dùng thử Pro, trả tiền, quay lại sau 7 ngày. Hỏi trực tiếp những chỗ họ vướng.

**Giai đoạn 3 (2–3 tuần) - Mở bán công khai.**
- Trang giới thiệu có từng trang điểm đến (tốt cho tìm kiếm Google), bài viết lịch trình mẫu.
- Định giá (đang 49.000 đ/tháng, 399.000 đ/năm, nên thử với bản thử kín rồi mới chốt), kênh hỗ trợ (Zalo, email), cộng đồng.
- Bắt đầu thêm điểm đến: ưu tiên nơi nhiều khách (Phú Quốc, Đà Lạt, Sa Pa đã có), thêm Quy Nhơn, Mũi Né, Hạ Long, Cần Thơ, Hà Giang.

**Giai đoạn 4 - Mở rộng.** Nguồn dữ liệu có giấy phép và quy trình kiểm duyệt cho điểm đến mới, người dịch bản ngữ, tiền tệ và múi giờ, dữ liệu bay quốc tế, nước ngoài theo từng nước một (thị trường gần như Thái Lan, Nhật, Hàn trước).

## 6. Tối ưu nên làm ngay (nhỏ, ít rủi ro)

1. ~~Thêm `manifest`, biểu tượng, `description`, Open Graph~~ (đã làm 12/10/2026, xem README, mục "Cài như app và chia sẻ liên kết").
2. ~~Đưa kịch bản Playwright vào `test/e2e` và bật GitHub Actions~~ (đã làm 12/10/2026: 19 bài e2e, `.github/workflows/ci.yml`).
3. Đổi tên `da-nang.json` và tách dữ liệu theo điểm đến (1–2 ngày).
4. Chuyển ảnh sang WebP, tạo bản nhỏ cho điện thoại (1 ngày).
5. Rà ảnh theo bản quyền, lập bảng nguồn từng ảnh (nửa ngày, chủ yếu là việc của chủ dự án).
6. Viết lại phần vị trí trong chính sách bảo mật (vài giờ).

## 7. Rủi ro cần giữ trong đầu

- **Thông tin sai gây hại thật:** người dùng đến nơi đã đóng cửa, giá khác, đi nhầm đường. Giữ nhãn "ước lượng", ngày kiểm tra, nút báo sai, điều khoản miễn trừ rõ.
- **Mở rộng nhanh hơn khả năng kiểm duyệt dữ liệu:** nên ít điểm đến nhưng đúng và đẹp hơn là nhiều mà sai.
- **Lệ thuộc nguồn ngoài:** Wikimedia, OpenStreetMap, Google, Flightradar24 đều có điều khoản và có thể đổi.
- **Mất khoá ký Pro, mất tài khoản thu tiền, mất dữ liệu người dùng:** sao lưu ba thứ này riêng.
