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
        → sinh OTP 6 số, lưu OtpStore (RAM), gửi email → trả { message, maskedEmail }
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
| POST | `/Auth/ForgotPassword` | AllowAnonymous | `{ username }` | `{ message, maskedEmail }` (vd `p***@gmail.com`) |
| POST | `/Auth/ResetPassword` | AllowAnonymous | `{ username, otp, newPassword }` | `{ message }` |

Lỗi trả `400` với `{ message }` tiếng Việt (username sai, chưa cấu hình email, OTP sai/hết hạn,
mật khẩu mới < 4 ký tự, email server chưa cấu hình...).

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
- Email hiển thị cho người dùng đã được **che bớt** (`p***@gmail.com`).
- OTP không bao giờ trả về trong response — chỉ gửi qua email.

## 8. Kiểm thử nhanh

1. Chưa cấu hình `EMAIL_*` → gọi `/Auth/ForgotPassword` phải trả lỗi cấu hình.
2. Username không tồn tại / inactive → lỗi "Không tìm thấy tài khoản...".
3. Thành công → nhận email OTP, `maskedEmail` đúng dạng `p***@gmail.com`.
4. Nhập OTP sai 5 lần → lỗi "nhập sai quá nhiều lần".
5. Sau 10 phút → lỗi "OTP đã hết hạn".
6. OTP đúng + mật khẩu mới ≥ 4 ký tự → đăng nhập lại bằng mật khẩu mới thành công.

## 9. Theme (UI)

- **Web**: dùng biến CSS `var(--color-*)` sẵn có; nút link/con mắt kế thừa `--color-primary`. Đã build production OK.
- **Mobile**: dùng `useTheme()` — input/card/modal áp `colors.inputBg`, `colors.surface`, `colors.border`, `colors.text`. Nút con mắt là emoji nên hợp cả sáng/tối.
