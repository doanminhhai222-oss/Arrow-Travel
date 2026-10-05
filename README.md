# Arrow Travel

Web lên lịch trình du lịch **đổi theo đối tượng đi cùng** (một mình, cặp đôi, nhóm bạn trẻ, gia đình có trẻ nhỏ / người lớn tuổi). Bản đầu: xếp lịch bằng quy tắc thuần, không gọi AI, không cần đăng nhập hay database.

## Chạy thử
```bash
npm start   # mở http://localhost:3000
npm test    # chạy test thuật toán xếp lịch
```
Chỉ cần Node 18+. Không có thư viện nào phải cài.

## Cấu trúc
| Đường dẫn | Việc |
|---|---|
| `src/scheduler.js` | Logic xếp lịch (dùng lại được cho app Expo sau này) |
| `data/da-nang.json` | Địa điểm Đà Nẵng. **Dữ liệu mẫu**, cần kiểm lại toạ độ, giờ, giá |
| `data/rules.json` | `Quy_tac_doi_tuong`: giờ bắt đầu, số điểm/ngày, nghỉ trưa, di chuyển tối đa |
| `web/` | Giao diện (HTML + JS thuần) |
| `test/` | Test bằng `node --test` |

## Logic xếp lịch
1. Lọc theo đối tượng, nhãn trẻ nhỏ / người lớn tuổi, ngân sách.
2. Bỏ điểm `closed`; điểm `stale` vẫn xếp nhưng có cảnh báo.
3. Chấm điểm theo khung giờ đẹp, loại địa điểm ưu tiên của đối tượng, phong cách, quãng di chuyển.
4. Xếp tuần tự trong ngày, chèn bữa trưa/nghỉ trưa, kiểm tra giờ mở cửa và di chuyển tối đa.
5. Trả JSON để giao diện tự vẽ.

## Lộ trình
- [x] Khung + thuật toán + form + xem theo ngày
- [ ] Đổi địa điểm / thêm địa điểm
- [ ] Chi tiết địa điểm (ảnh, bản đồ, báo sai)
- [ ] Lưu + chia sẻ bằng liên kết, xuất PDF
- [ ] Nhập dữ liệu từ Excel → JSON
- [ ] Giai đoạn 2: app (Expo) dùng lại `src/scheduler.js`
