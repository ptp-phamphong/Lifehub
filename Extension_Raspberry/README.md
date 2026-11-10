# Extension_Raspberry — Đồng bộ lịch UEH bằng phiên trình duyệt

Extension Chrome (Manifest V3) gửi phiên đăng nhập cổng sinh viên UEH về LifeHub. Nhờ vậy backend trên Pi đồng bộ được thời khóa biểu mà không cần tự đăng nhập. Từ 04/11/2026 trang đăng nhập UEH có reCAPTCHA, nên backend không tự đăng nhập bằng mật khẩu được nữa.

## Cài đặt

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked**, chọn thư mục `Extension_Raspberry/`.
3. Mở `https://app.ptp-phamphong.com` và đăng nhập. Extension đọc JWT của LifeHub từ `localStorage` (`auth_token`).
4. Mở `https://student.ueh.edu.vn` (đã đăng nhập UEH). Nút **● Đồng bộ LifeHub** hiện ngay dưới logo UEH.

Sửa code xong thì bấm nút tải lại (↻) của extension trong `chrome://extensions`, rồi tải lại trang UEH.

## Cách hoạt động

| File | Việc |
|---|---|
| `content-lifehub.js` | Chạy trên `app.ptp-phamphong.com` (không chạy trên demo). Gửi JWT cho background. |
| `background.js` | Đọc cookie `student.ueh.edu.vn` (kể cả HttpOnly), gọi `POST /api/UehSession/Submit` và `GET /api/UehSession/Status`. |
| `content-ueh.js` + `.css` | Chạy trên `student.ueh.edu.vn`, trừ trang `/Login*`. Nút dưới `img.header-logo` (không thấy logo thì dùng nút nổi góc trên phải). Hiện trạng thái và toast. |

- **Mở trang UEH**: tự gửi phiên, tối đa 1 lần / 10 phút. Trong 10 phút đó chỉ hỏi trạng thái.
- **Bấm nút**: luôn gửi phiên và đồng bộ ngay (`forceSync`). Sau đó hỏi trạng thái mỗi 3 giây, tối đa 3 phút.
- **Màu chấm**:
  - Xanh: phiên còn hiệu lực và lần đồng bộ cuối thành công.
  - Đỏ: phiên hết hạn, đồng bộ lỗi, hoặc cần đăng nhập lại LifeHub.
  - Xám: đang tải, hoặc phiên còn sống nhưng chưa đồng bộ lần nào.
- Rê chuột lên nút để xem chi tiết: trạng thái phiên, giờ và số buổi của lần đồng bộ cuối, lỗi nếu có.

## Bảo mật

- Cookie chỉ gửi tới `https://app.ptp-phamphong.com/api`, kèm JWT. Không có JWT hợp lệ thì extension không đọc cookie.
- Backend không trả cookie qua API nào và không ghi cookie vào log.
- Không có quyền nào ngoài `cookies`, `storage` và 2 host trên.

Chi tiết backend: `Information_AI/26_feature-ueh-session-extension.md`.
