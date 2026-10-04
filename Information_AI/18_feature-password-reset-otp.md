# Feature: Quên & Đặt lại mật khẩu bằng OTP qua email

## 1. Mục đích

Cho phép người dùng (admin) **tự đặt lại mật khẩu khi quên**, không cần vào DB sửa hash thủ công.
Luồng: nhập username → hệ thống gửi **mã OTP 6 số** về **email của chính user đó** → nhập OTP +
mật khẩu mới → đổi mật khẩu.

Kèm theo: ô mật khẩu ở màn hình đăng nhập (app điện thoại **và** web) có **nút hiện/ẩn 👁️**
để nhìn được ký tự đang gõ.

## 2. Quyết định thiết kế

| Vấn đề | Lựa chọn | Lý do |
|--------|----------|-------|
| OTP gửi về đâu? | **Email riêng của từng user** (cột `Email` trên bảng `users`) | Người dùng chọn phương án per-user thay vì một email admin cứng. Admin mặc định được seed sẵn `ptp.phamphong@gmail.com`, **sửa được** trong màn Quản lý user. |
| Lưu OTP ở đâu? | **Trong RAM** (`OtpStore` singleton, `ConcurrentDictionary`) | App chạy một tiến trình trên Pi; OTP hết hạn nhanh (10 phút). Restart service thì mã mất — chỉ cần bấm gửi lại. Không cần bảng DB. |
| Gửi email bằng gì? | `EmailService` + SMTP Gmail, đọc `EMAIL_ADDRESS` / `EMAIL_APP_PASSWORD` từ **biến môi trường** | Dùng lại đúng cơ chế của `NotificationEmailController`. |
| Endpoint có cần đăng nhập? | **`[AllowAnonymous]`** | `Program.cs` đặt `FallbackPolicy = RequireAuthenticatedUser`, nên mọi endpoint mặc định cần JWT. Quên mật khẩu thì chưa đăng nhập được → phải mở ẩn danh. |

## 3. Kiến trúc

```
App điện thoại (LoginScreen)      Web Angular (login.component)
  Quên mật khẩu? → modal            Quên mật khẩu? → đổi mode form
        │                                 │
        ▼                                 ▼
  POST /Auth/ForgotPassword  { username }            [AllowAnonymous]
        → kiểm tra giới hạn theo tài khoản, sinh OTP 6 số, lưu OtpStore (RAM), gửi email
        → trả { message } (cùng một câu cho mọi trường hợp, không còn maskedEmail)
        ▼
  POST /Auth/ResetPassword   { username, otp, newPassword }   [AllowAnonymous]
        → kiểm tra OTP (hạn 10p, tối đa 5 lần sai) → BCrypt hash mật khẩu mới → users.Update
```

### Data flow backend

```
AuthController
  → IPasswordResetService (PasswordResetService, Scoped)
      → IUserRepository        (tìm user theo username, cập nhật mật khẩu)
      → IOtpStore (OtpStore, Singleton)   lưu/đọc/xóa mã OTP trong RAM
      → EmailService (new thủ công, SMTP Gmail)   gửi email OTP
```

## 4. Các file liên quan

### Backend (`API_Raspberry/API_Raspberry/`)
- `Model/User.cs` — thêm cột `Email` (nullable).
- `Migrations/*_AddUserEmailColumn.cs` — thêm cột `Email` vào bảng `users`.
- `Dto/UserDto.cs` — `Email` trong `UserDto` / `UserCreateDto` / `UserUpdateDto`.
- `Dto/PasswordResetDto.cs` — `ForgotPasswordRequestDto`, `ForgotPasswordResponseDto`, `ResetPasswordDto`.
- `Service/PasswordResetService.cs` — `OtpStore`, `IOtpStore`, `PasswordResetService`, `IPasswordResetService`.
- `Service/UserService.cs` — đọc/ghi `Email`.
- `Controllers/AuthController.cs` — 2 endpoint `Auth/ForgotPassword`, `Auth/ResetPassword`.
- `Program.cs` — đăng ký DI (`IOtpStore` singleton, `IPasswordResetService` scoped); seed email admin (`Auth:AdminEmail`), điền email cho user cũ chưa có email.
- `appsettings.json` — `Auth:AdminEmail` (mặc định `ptp.phamphong@gmail.com`).

### App điện thoại (`Mobile_Raspberry/src/`)
- `services/authService.ts` — `requestPasswordReset()`, `resetPassword()`.
- `screens/LoginScreen.tsx` — nút hiện/ẩn mật khẩu 👁️ + modal quên mật khẩu 2 bước.

### Web Angular (`Front_End_Raspberry/src/app/`)
- `services/auth.service.ts` — `requestPasswordReset()`, `resetPassword()`.
- `all-app-component/login/login.component.*` — nút hiện/ẩn mật khẩu + luồng quên mật khẩu (3 mode: `login` / `forgot-request` / `forgot-reset`).
- `all-app-component/user-management/user-form/*` — sửa được email (cấu hình email nhận OTP).
- `all-app-component/user-management/user-list/*` — cột Email.
- `model/user.model.ts` — thêm `email?`.

## 5. Endpoints

| Method | Route | Auth | Body | Trả về |
|--------|-------|------|------|--------|
| POST | `/Auth/ForgotPassword` | AllowAnonymous · rate limit 3 lần/giờ/IP | `{ username }` | `{ message }` (câu chung, xem §7) |
| POST | `/Auth/ResetPassword` | AllowAnonymous · rate limit 10 lần/giờ/IP | `{ username, otp, newPassword }` | `{ message }` |

Lỗi trả `400` với `{ message }` tiếng Việt (OTP sai/hết hạn, mật khẩu mới < 4 ký tự, email server chưa
cấu hình, gửi mail thất bại...). **Không còn** lỗi riêng cho "username sai" hay "user chưa có email":
các trường hợp đó trả `200` với cùng câu chung để không lộ username nào tồn tại.

> **Thay đổi so với bản trước:** response `ForgotPassword` không còn trả `maskedEmail` (`PasswordResetResult.MaskedEmail`
> không còn được gán; `AuthController.ForgotPassword` vẫn copy trường này sang `ForgotPasswordResponseDto` nên JSON còn khóa `maskedEmail` với giá trị `null`). Web và mobile đã có chữ dự phòng "email của bạn".
> Trên **demo** cả hai endpoint bị chặn ở cổng allowlist (404) và ở service (xem §7).

## 6. Cấu hình bắt buộc khi deploy

Server phải có 2 biến môi trường (giống tính năng gửi email thông báo):

```bash
EMAIL_ADDRESS="tai-khoan-gmail@gmail.com"
EMAIL_APP_PASSWORD="app-password-16-ky-tu"   # App Password của Gmail, KHÔNG phải mật khẩu thường
```

Thiếu 2 biến này thì `/Auth/ForgotPassword` trả lỗi "Email chưa được cấu hình trên server."

Email admin mặc định nhận OTP: chỉnh trong `appsettings.json` (`Auth:AdminEmail`) **hoặc** sửa
trực tiếp trong màn **Quản lý user ▸ Sửa ▸ Email**.

## 7. Ràng buộc bảo mật đã áp dụng

- OTP sinh bằng `RandomNumberGenerator.GetInt32` (RNG mật mã), 6 chữ số.
- Hết hạn **10 phút**; sai quá **5 lần** thì xóa mã, buộc gửi lại.
- Mật khẩu mới hash bằng **BCrypt** (workfactor mặc định), không lưu plaintext.
- OTP không bao giờ trả về trong response — chỉ gửi qua email.
- **Giới hạn theo tài khoản** (`PasswordResetService`, bộ đếm `OtpStore.TryRegisterRequest` trong RAM):
  tối đa **3 OTP mỗi giờ** cho một username, và chờ ít nhất **60 giây** giữa hai lần xin.
  Lý do: mỗi OTP mới đặt lại `Attempts = 0`; không có giới hạn này thì kẻ tấn công cứ xin mã mới là dò tiếp
  được. 3 mã x 5 lần nhập = tối đa 15 lần đoán mỗi giờ trên 1 triệu khả năng. Rate limit theo IP không
  thay thế được lớp này vì kẻ tấn công đổi được IP (VPN, proxy). Chỉ đếm cho user có thật.
- **Rate limit theo IP** (`Middleware/RateLimitPolicies.cs`, `[EnableRateLimiting]` trên `AuthController`):
  `ForgotPassword` 3 lần/giờ, `ResetPassword` 10 lần/giờ. Vượt thì `429`.
- **Câu trả lời chung** (`PasswordResetService.GenericRequestMessage`): "Nếu tài khoản tồn tại và đã có
  email, mã OTP đã được gửi tới email đó. Mã có hiệu lực 10 phút." Dùng cho cả bốn trường hợp: không
  có user / user không hoạt động, user chưa có email, bị giới hạn theo tài khoản, và gửi thành công. Nhờ
  đó không dò được username nào tồn tại. Vì vậy cũng **không trả email đã che** nữa.
- **Demo:** `RequestOtpAsync` và `VerifyAndReset` đều trả lỗi "Tính năng quên mật khẩu không khả dụng
  trên bản demo" (lớp chặn thứ hai sau `DemoGateMiddleware`; demo không được gửi mail từ Gmail của chủ
  repo). Xem `25_feature-demo-environment.md`.

## 8. Kiểm thử nhanh

1. Chưa cấu hình `EMAIL_*` → gọi `/Auth/ForgotPassword` phải trả lỗi cấu hình.
2. Username không tồn tại / inactive / chưa có email → vẫn `200` với **cùng câu chung** như khi thật sự gửi, và không có mail nào được gửi.
3. Thành công → nhận email OTP; response chỉ có `message` (câu chung).
3b. Xin OTP lần 2 trong vòng 60 giây, hoặc lần 4 trong một giờ cho cùng username (tạm nới rate limit theo IP) → vẫn câu chung, nhưng không có mail mới.
4. Nhập OTP sai 5 lần → lỗi "nhập sai quá nhiều lần".
5. Sau 10 phút → lỗi "OTP đã hết hạn".
6. OTP đúng + mật khẩu mới ≥ 4 ký tự → đăng nhập lại bằng mật khẩu mới thành công.

## 9. Theme (UI)

- **Web**: dùng biến CSS `var(--color-*)` sẵn có; nút link/con mắt kế thừa `--color-primary`. Đã build production OK.
- **Mobile**: dùng `useTheme()` — input/card/modal áp `colors.inputBg`, `colors.surface`, `colors.border`, `colors.text`. Nút con mắt là emoji nên hợp cả sáng/tối.
