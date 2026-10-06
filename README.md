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

## Cấu trúc
| Đường dẫn | Việc |
|---|---|
| `src/scheduler.js` | Logic xếp lịch (dùng lại được cho app Expo sau này) |
| `data/da-nang.json` | Địa điểm Đà Nẵng. **Dữ liệu mẫu**, cần kiểm lại toạ độ, giờ, giá |
| `data/travel-options.json` | Nơi khởi hành, vé máy bay, khách sạn (giá mẫu) |
| `src/detail.js` | Trang chi tiết địa điểm (ảnh minh hoạ, bản đồ mini, văn hoá, đánh giá quán) |
| `scripts/enrich-places.py` | Gộp nội dung chi tiết vào `data/da-nang.json` |
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
