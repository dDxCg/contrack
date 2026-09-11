# PRD — LichHD
### Phần mềm Quản lý Hợp đồng Dịch vụ Định kỳ

*[English version](prd.md)*

---

## 1. Giới thiệu & Mục đích

**Vấn đề đang giải quyết:** Các công ty dịch vụ định kỳ (vệ sinh công nghiệp, bảo trì điều hòa/thang máy, diệt côn trùng, chăm sóc cây xanh, bảo trì PCCC) hiện quản lý lịch làm việc bằng Excel và điều phối qua Zalo. Hệ quả: quên lịch thực hiện → khách phàn nàn/mất hợp đồng; mất bằng chứng thực hiện khi khách khiếu nại; kế toán mất 1,5–3 ngày cuối tháng để đối chiếu thủ công; không ai theo dõi hợp đồng sắp hết hạn → mất khách vì không tái ký kịp.

**Đối tượng phục vụ:** Công ty dịch vụ định kỳ quy mô 10–80 nhân viên, 20–150 hợp đồng đang chạy.

**Mục tiêu kinh doanh:**
- Giúp khách hàng không mất hợp đồng vì quên lịch.
- Cung cấp bằng chứng thực hiện đầy đủ (ảnh, GPS, thời gian, chữ ký).
- Rút ngắn thời gian chốt bảng kê cuối tháng từ 1,5–3 ngày xuống dưới 30 phút.

**Định vị sản phẩm:** LichHD là phần mềm quản lý hợp đồng dịch vụ định kỳ — lấy HỢP ĐỒNG ĐỊNH KỲ làm đơn vị trung tâm, khác với CMMS (xoay quanh thiết bị) và các phần mềm field service quốc tế như Jobber/MaintainX (thiết kế cho việc ad-hoc, không có tiếng Việt/Zalo/VietQR).

**Bối cảnh cạnh tranh:**

| Loại phần mềm | Phục vụ ai | Vì sao không hợp với khách hàng mục tiêu |
|---|---|---|
| CMMS (SpeedMaint, Vietsoft…) | Nhà máy tự bảo trì tài sản | Xoay quanh thiết bị, không xoay quanh hợp đồng khách hàng |
| Field Service quốc tế (Jobber, Swept, MaintainX) | Nhà thầu dịch vụ | Đúng mô hình nhưng thiết kế cho việc ad-hoc, không mạnh ở hợp đồng cam kết tần suất dài hạn; không có tiếng Việt/Zalo/VietQR |
| Sàn B2C (bTaskee, JupViec) | Người tiêu dùng cá nhân | Sai mô hình kinh doanh |

---

## 2. Đối tượng mục tiêu & Chân dung người dùng

| Vai trò | Người cụ thể | Đau hiện tại | Nhận được gì từ LichHD |
|---|---|---|---|
| Người trả tiền | Giám đốc | Mất hợp đồng vì quên lịch; không biết hợp đồng nào lãi | Không mất hợp đồng; thấy lãi/lỗ từng hợp đồng |
| Champion | Kế toán / hành chính | 3 ngày cuối tháng để đối chiếu | Xuất bảng kê trong 10 phút |
| Người dùng hằng ngày | Tổ trưởng, nhân viên hiện trường | Bị hỏi "làm chưa", bị đổ lỗi khi không có bằng chứng | Có bằng chứng bảo vệ mình |
| Người cản trở | Tổ trưởng lâu năm | Sợ lộ việc khai khống giờ, khai khống vật tư | Cần xử lý bằng truyền thông: không định vị hà khắc, không dùng từ "giám sát" |

---

## 3. Tính năng & Chức năng 

### Must-have (MVP)

| Module | Chức năng chính |
|---|---|
| Hợp đồng | Tạo hợp đồng (khách, thời hạn) → thêm 1 hoặc nhiều địa điểm thực hiện, mỗi địa điểm gồm hạng mục dịch vụ (tần suất, đơn giá), yêu cầu công việc, lưu ý → tự sinh lịch theo từng hạng mục; cảnh báo hợp đồng sắp hết hạn (30 ngày) |
| Lịch & Phân công | Lịch tuần/tháng theo tổ/nhân viên; tự đẩy việc tuần cho tổ trưởng; đổi lịch khi có phát sinh |
| Thực hiện hiện trường | Link mở trên điện thoại (không cần cài app); chụp ảnh trước/sau; khách ký biên lai giấy, nhân viên chụp lại biên lai đã ký làm bằng chứng, mang bản gốc về lưu hồ sơ sau; đóng dấu GPS + thời gian, không sửa được |
| Cảnh báo & Nhắc việc | Nhắc hợp đồng chưa thực hiện đúng tần suất; nhắc hợp đồng sắp hết hạn; nhắc qua Zalo/SMS |
| Bảng kê & Xuất hóa đơn | 1 nút xuất bảng kê tháng (kèm ảnh + chữ ký) dạng PDF gửi khách; đối chiếu tự động |

### Should-have

| Module | Chức năng chính |
|---|---|
| Lãi/lỗ theo hợp đồng | Ghi nhận chi phí (nhân công, vật tư) theo hợp đồng → hiển thị lãi/lỗ từng hợp đồng |
| Tái ký & CRM nhẹ | Nhắc tái ký tự động kèm mẫu hợp đồng; lịch sử khách hàng, log liên hệ |

### Could-have

| Module | Chức năng chính |
|---|---|
| Quản lý nhân sự hiện trường | Chấm công theo GPS; hiệu suất tổ/nhân viên; lịch sử công việc cá nhân |
| Thanh toán | Tích hợp VietQR để khách thanh toán trực tiếp từ bảng kê PDF |
| Báo cáo cho giám đốc | Dashboard tổng: số hợp đồng đang chạy, hợp đồng sắp hết hạn, hợp đồng có sự cố, doanh thu dự kiến |

### Won't-have (giai đoạn này)

- Tích hợp sâu với phần mềm kế toán/ERP (MISA, Fast…).
- Ứng dụng di động native (chỉ dùng web link trên điện thoại).
- Đa ngôn ngữ/đa thị trường ngoài Việt Nam.

---

## 4. Luồng người dùng & Thiết kế

**Quy trình hiện tại (AS-IS):**

1. Ký hợp đồng (VD: tòa nhà X, vệ sinh kính 2 lần/tháng, 12 tháng).
2. Kế toán mở Excel "Lịch 2025.xlsx" → gõ tay 24 dòng cho 12 tháng.
3. Đầu tuần: quản lý mở Excel dò lịch → copy vào nhóm Zalo.
4. Tổ trưởng đọc Zalo → phân người → đi làm.
5. Làm xong: chụp ảnh gửi Zalo nhóm (ảnh trôi sau 2 tuần).
6. Khách ký giấy xác nhận → tổ trưởng giữ → 3 ngày sau mới đưa văn phòng (có khi mất).
7. Cuối tháng: kế toán lục Zalo + giấy → đối chiếu Excel → lập bảng kê → xuất hóa đơn.
8. Rủi ro: phát hiện quên 1 lần ở tòa nhà Y → khách đã phàn nàn → không dám xuất đủ tiền.

**Quy trình mới (TO-BE) với LichHD:**

1. Ký hợp đồng → nhập 1 lần (khách, địa điểm, hạng mục dịch vụ + tần suất + đơn giá theo từng địa điểm, thời hạn) → hệ thống tự sinh lịch.
2. Sáng thứ 2: hệ thống tự đẩy danh sách việc tuần này cho từng tổ trưởng.
3. Nhân viên mở link trên điện thoại → chụp trước/sau → khách ký biên lai giấy → nhân viên chụp lại biên lai đã ký.
4. Ảnh hiện trường + ảnh biên lai đã ký + GPS + thời gian được đóng dấu, không sửa được. Nhân viên mang bản giấy gốc về lưu hồ sơ sau.
5. Hệ thống cảnh báo: "Hợp đồng tòa nhà Y còn 3 ngày chưa thực hiện lần 2."
6. Cuối tháng: 1 nút → bảng kê + ảnh minh chứng + chữ ký → PDF gửi khách.
7. Cảnh báo: "5 hợp đồng hết hạn trong 30 ngày → cần tái ký."

---

## 5. Yêu cầu hệ thống & kỹ thuật

| Hạng mục | Yêu cầu |
|---|---|
| Nền tảng | Web app responsive, truy cập qua link trên điện thoại — không yêu cầu cài đặt app |
| Bằng chứng hiện trường | Ảnh hiện trường, ảnh biên lai ghi nhận của khách hàng, GPS, timestamp |
| Kênh nhắc việc | Tích hợp gửi thông báo qua Zalo (ZNS) và/hoặc SMS |
| Thanh toán | Tích hợp VietQR cho luồng thanh toán (Could-have) |
| Hiệu năng | Trang chụp ảnh hiện trường phải tải được trên mạng di động 3G/4G yếu (công trường, tầng hầm) |
| Bảo mật & phân quyền | Phân quyền theo vai trò: giám đốc, kế toán, quản lý, tổ trưởng, nhân viên; log không thể xóa/sửa cho dữ liệu bằng chứng |
| Khả năng mở rộng | Triển khai single-tenant |
| Lưu trữ dữ liệu | Lưu trữ ảnh/chữ ký tối thiểu 12 tháng để phục vụ đối chiếu và tranh chấp hợp đồng |
| Xuất dữ liệu | Xuất bảng kê/hóa đơn dạng PDF; có thể xuất dữ liệu thô (CSV/Excel) để đối chiếu với kế toán |

---

## 6. Giả định và Ràng buộc

**Giả định:**
- Khách hàng mục tiêu và nhân viên hiện trường có điện thoại thông minh và kết nối 3G/4G tại nơi làm việc.
- Zalo vẫn là kênh liên lạc phổ biến nhất trong nhóm khách hàng mục tiêu trong thời gian tới.

**Ràng buộc:**
- Ngân sách và đội ngũ phát triển giai đoạn đầu giới hạn ở phạm vi 5 module Must-have.
- Không tích hợp ERP/kế toán trong giai đoạn MVP — dữ liệu tài chính chi tiết (Should/Could-have) phụ thuộc vào việc kế toán nhập tay chi phí.
- Giá bán (khoảng 1,5 triệu/tháng theo kịch bản bán hàng) cần được kiểm chứng lại qua khảo sát/pilot trước khi chốt chính thức.

---

## 7. Rủi ro & Phụ thuộc

| Rủi ro / Phụ thuộc | Mức độ | Ghi chú |
|---|---|---|
| Tổ trưởng lâu năm phản đối vì sợ minh bạch hóa giờ công/vật tư | Cao | Cần truyền thông nội bộ đúng cách khi triển khai — không định vị là công cụ "giám sát" |
| Phụ thuộc vào độ ổn định của kênh Zalo ZNS/SMS để gửi nhắc việc | Trung bình | Cần phương án dự phòng (nhắc trong app/email) nếu kênh bị gián đoạn |
| Cạnh tranh: đối thủ quốc tế (Jobber, MaintainX) bản địa hóa nhanh hơn dự kiến | Thấp–Trung bình | Lợi thế đi trước bằng tiếng Việt/Zalo/VietQR cần được củng cố sớm |
| Phụ thuộc dữ liệu chi phí đầu vào (nhân công, vật tư) để tính lãi/lỗ (Should-have) | Trung bình | Cần quy trình nhập liệu chi phí từ kế toán, nếu không module lãi/lỗ sẽ thiếu chính xác |

---

## 8. Chỉ số thành công & Tiêu chí phát hành

| Chỉ số | Ý nghĩa | Mục tiêu |
|---|---|---|
| Số lần thực hiện bị bỏ sót / hợp đồng / tháng | Đo trực tiếp giá trị cốt lõi "không quên lịch" | Giảm về gần 0 sau 1 tháng sử dụng |
| Thời gian kế toán chốt bảng kê cuối tháng | Đo hiệu quả module Bảng kê & Xuất hóa đơn | Từ 1,5–3 ngày xuống dưới 30 phút |
| Tỷ lệ tái ký hợp đồng đúng hạn | Đo hiệu quả module cảnh báo hết hạn | Tăng so với baseline trước khi dùng phần mềm |
| Tỷ lệ nhân viên hiện trường dùng link chụp ảnh mỗi lần thực hiện | Đo mức độ áp dụng thực tế (adoption) | ≥ 90% lượt thực hiện có ảnh/chữ ký đầy đủ |

**Tiêu chí phát hành MVP (release criteria):**
- Cả 5 module Must-have hoạt động ổn định trên di động (kể cả mạng yếu).
- Ảnh/GPS/timestamp không thể chỉnh sửa sau khi gửi — kiểm thử bảo mật đạt yêu cầu.
- Thử nghiệm với ít nhất 1 khách hàng pilot chạy trọn 1 chu kỳ tháng (từ ký hợp đồng đến xuất bảng kê) không lỗi nghiêm trọng.

---

## 9. Lộ trình & Kế hoạch phát hành

| Giai đoạn | Thời gian | Nội dung |
|---|---|---|
| MVP | 0–3 tháng | 5 module Must-have: Hợp đồng, Lịch & Phân công, Thực hiện hiện trường, Cảnh báo & Nhắc việc, Bảng kê & Xuất hóa đơn |
| Pilot | Tháng 3–4 | Triển khai thử với 1–3 khách hàng mục tiêu, thu thập phản hồi |
| Phase 2 | Tháng 4–9 | Module Should-have: Lãi/lỗ theo hợp đồng, Tái ký & CRM nhẹ |
| Phase 3 | Tháng 9+ | Module Could-have: Quản lý nhân sự hiện trường, Thanh toán VietQR, Dashboard giám đốc |

---

## 10. Rà soát & Phê duyệt của các bên liên quan

| Bên liên quan | Vai trò trong rà soát | Trạng thái phê duyệt |
|---|---|---|
| Founder / Người phụ trách sản phẩm | Phê duyệt phạm vi MVP và định vị | Chờ phê duyệt |
| Đội phát triển (kỹ thuật) | Rà soát tính khả thi kỹ thuật của Mục 5 | Chờ rà soát |
| Đội bán hàng / GTM | Rà soát thông điệp định vị và kịch bản bán hàng | Chờ rà soát |
| Khách hàng pilot (đại diện) | Góp ý quy trình TO-BE trước khi triển khai chính thức | Chưa liên hệ |

---
