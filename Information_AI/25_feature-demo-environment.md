# Feature: Môi trường demo (demo mode) và allowlist `[AllowInDemo]`

Instance demo công khai (`demo.ptp-phamphong.com`, mật khẩu demo hiện trên portfolio) chạy **cùng một
mã nguồn** với bản thật, nhưng ở chế độ demo. Ai cũng đăng nhập được, nên backend phải **chặn theo
mặc định**: chỉ những endpoint được đánh dấu rõ ràng mới chạy.

> Tài liệu này mô tả demo từ góc nhìn của ứng dụng (mã trong repo này). Cách host, sandbox, quản lý
> secret và deploy instance demo nằm ở **repo hạ tầng riêng tư (`pi-infra`)**, không nằm ở đây.

---

## 1. Quy tắc quan trọng nhất

> **Endpoint mới mặc định bị chặn trên demo.** Chỉ gắn `[AllowInDemo]` lên **method** khi chắc chắn
> vô hại: không gửi mail/Zalo, không gọi dịch vụ ngoài, không lộ dữ liệu thật. Sau đó **phải cập nhật
> `ExpectedAllowlist`** trong `API_Raspberry.Tests/DemoAllowlistTests.cs`, nếu không test sẽ đỏ.

- `[AllowInDemo]` **chỉ đặt được trên method** (`AttributeTargets.Method`). Không đặt trên class: nếu
  được, method thêm sau này vào controller đó sẽ tự mở trên demo, trái với nguyên tắc mặc định chặn.
- Không cần làm gì để một endpoint bị chặn trên demo. Quên gắn attribute là trạng thái an toàn.

---

## 2. Nhận diện demo: `IDemoModeService`

`Service/DemoModeService.cs` là **một chỗ duy nhất** quyết định "đây có phải demo không".

| Thuộc tính | Giá trị |
|---|---|
| `IDemoModeService.IsDemo` | `DemoMode=true` **HOẶC** `ASPNETCORE_ENVIRONMENT=Demo` |
| `DemoModeService.Detect(config, env)` | Bản static của cùng logic, dùng được trong `Program.cs` trước khi có DI |

Chỉ cần **một** trong hai dấu hiệu. Lý do: nếu lỡ quên một dấu hiệu, instance vẫn bị khóa như demo,
thay vì mở toàn bộ API cho tài khoản demo công khai (an toàn khi lỗi).

Đã thay các chỗ đọc `DemoMode` rải rác: `ZaloController`, `CurrentInfoService`, `UserService`,
`AuthController`, `PasswordResetService`. Code mới cần biết "có phải demo không" thì inject
`IDemoModeService`, không tự đọc `DemoMode`.

> Ngoại lệ có chủ ý: `DemoReseedJob` đòi **cả hai** dấu hiệu (`DemoMode=true` **và** môi trường `Demo`)
> mới chạy, vì job này **xóa dữ liệu**. Ngược với phía chặn: chặn thì "một trong hai", xóa thì "cả hai".

---

## 3. Cổng allowlist: `DemoGateMiddleware`

| File | Vai trò |
|---|---|
| `Filters/AllowInDemoAttribute.cs` | Attribute rỗng, chỉ dùng trên method |
| `Middleware/DemoGateMiddleware.cs` | Lấy `HttpContext.GetEndpoint()`; không có `AllowInDemoAttribute` thì trả **404, body rỗng** |

- Chỉ đăng ký khi `isDemo` (`Program.cs`). Pipeline của bản thật **không đổi**.
- Mặc định chặn áp dụng cho **mọi** endpoint, kể cả `[AllowAnonymous]` (`ForgotPassword`,
  `ResetPassword`, `Visit/Record`) và **Hangfire dashboard** (`/hangfire`). Route không tồn tại cũng 404.
- Trả 404 chứ không phải 403, để người ngoài không phân biệt được "bị chặn" với "không có".

### Thứ tự pipeline (`Program.cs`)

```
UseForwardedHeaders → UseRouting → UseCors → DemoGate (chỉ demo) → UseRateLimiter → UseAuthentication → UseAuthorization
```

| Vị trí | Lý do |
|---|---|
| `UseRouting` tường minh | Để endpoint có sẵn cho CORS, gate và rate limiter |
| Gate sau `UseCors` | Preflight vẫn nhận 204, response 404 vẫn có header CORS |
| Gate trước `UseAuthentication` | Trả 404, không phải 401 |
| `UseRateLimiter` sau `UseForwardedHeaders` | Phân theo IP thật của khách, không phải `127.0.0.1` của Caddy |

Khi demo khởi động, app ghi log danh sách route đang mở (`Demo allowlist: N route được mở`), để soát
nhanh sau mỗi lần deploy.

### Allowlist hiện tại

| Controller | Mở trên demo (theo tên method) |
|---|---|
| `AuthController` | `Login` |
| `ExpenseRecordController` | `ExpenseNote`, `GetAllExpenseNote`, `SumAll`, `SumAllWithFilter`, `GetExpenseById`, `UpdateById`, `DeleteById`, `GetExpensesByMonth`, `SumByCurrentMonth`, `SumByCurrentWeek` |
| `IncomeRecordController` | `IncomeNote`, `GetAllIncomeNote`, `SumAllIncome`, `SumAllIncomeWithFilter`, `GetIncomeById`, `UpdateIncomeById`, `DeleteIncomeById`, `SumIncomeByCurrentMonth`, `SumIncomeByCurrentWeek` |
| `CourseScheduleController` | `GetAll`, `GetById`, `Add`, `Update`, `GetByMonth`, `GetByWeek`, `Delete`, `DeleteBySemesterMetadataId` |
| `ReasonTypeController` | `AddReasonType`, `GetAllReasonType`, `GetReasonTypeById`, `UpdateReasonTypeById` |
| `SemesterMetadataController` | `GetAll` |
| `SystemConfigurationController` | `Add`, `GetAll`, `GetById`, `UpdateById`, `DeleteById` |
| `SystemInfoController` | `Get` (trên demo trả giá trị giả) |
| `ThemeSettingController` | `GetThemeSetting`, `UpdateThemeSetting` |
| `UserController` | `GetAll` (email đã che, xem §6) |

**Chặn hoàn toàn** (không method nào được mở): `AiExpense`, `Jobs`, `NotificationEmail`,
`NotificationFilter`, `PhoneNotification`, `UehStudentSchedule`, `Visit`, `VisitorLog`, `Zalo`.

Cũng bị chặn dù cùng controller với endpoint được mở: `ForgotPassword`, `ResetPassword`,
`ImportFromExcel`, `ResetImportFromUeh`, và các action `SemesterMetadata`/`User` còn lại (`Add`,
`GetById`, `UpdateById`, `DeleteById`, `Create`, `Update`, `ChangePassword`, `Delete`), cùng `SumByMonth`,
`GetIncomesByMonth`, `SumIncomeByMonth` (không có caller).

> Bảng trên là ảnh chụp tại thời điểm viết. **Nguồn đúng là `ExpectedAllowlist`** trong
> `API_Raspberry.Tests/DemoAllowlistTests.cs`. Hai nơi lệch nhau thì test thắng.

---

## 4. Kiểm tra khi khởi động: `DemoStartupGuard`

`Service/DemoStartupGuard.cs`, gọi ở đầu `Program.cs` khi `isDemo`. Nếu có vấn đề: in lỗi (chỉ **tên**,
không bao giờ in giá trị) rồi ném `InvalidOperationException`, app **không khởi động**.

Lớp này không phụ thuộc vào allowlist hay guard trong service: demo không cầm secret thật thì không
thể dùng nó, kể cả khi lớp khác hỏng.

| Điều kiện vi phạm | Ví dụ |
|---|---|
| Biến môi trường bắt đầu bằng `EMAIL_`, `UEH_LOGIN_`, `AZURE_` | `EMAIL_APP_PASSWORD` |
| Khóa cấu hình phải **rỗng**: `Gemini:ApiKey`, `DemoControl:ConnectionString`, `UehLogin:TaiKhoan`, `UehLogin:MatKhau` | Đặt qua appsettings hoặc biến `A__B` |
| `Jwt:Issuer` khác `LifeHubDemo` | Hằng số trong code, không so với cấu hình bản thật |
| `Jwt:Audience` khác `LifeHubDemoClients` | Như trên |

`UehLogin:*` có trong danh sách vì `UehStudentScheduleService` dùng nó làm giá trị dự phòng khi thiếu
`UEH_LOGIN_*`. Một bản deploy demo cũ từng mang tài khoản UEH thật theo đường này.

`appsettings.Demo.json` (placeholder, không có secret): `Jwt.Issuer=LifeHubDemo`,
`Jwt.Audience=LifeHubDemoClients`, `Jwt.ExpireMinutes=120`, `Auth.AdminEmail=demo@example.invalid`,
`DemoMode=true`, `ButtonListener.Enabled=false`. Token demo vì vậy **không bao giờ** được bản thật chấp
nhận, kể cả khi hai bên lỡ dùng chung secret key.

---

## 5. Rate limit (`Middleware/RateLimitPolicies.cs`)

Phân theo IP, cửa sổ cố định, không xếp hàng (`QueueLimit = 0`), trả `429`.

| Policy | Endpoint | Giới hạn | Áp dụng |
|---|---|---|---|
| `auth-login` | `Auth/Login` | 10 lần/phút | **Cả hai** instance |
| `auth-forgot-password` | `Auth/ForgotPassword` | 3 lần/giờ | Cả hai |
| `auth-reset-password` | `Auth/ResetPassword` | 10 lần/giờ | Cả hai |
| Global (demo) | Mọi request không phải GET/HEAD/OPTIONS | 120 lần/phút | Chỉ demo |

- Policy gắn bằng `[EnableRateLimiting(RateLimitPolicies.X)]` trên action (`AuthController`).
- Giới hạn global của demo là 120 chứ không thấp hơn, vì nhiều endpoint **đọc** của app cũng là POST
  (`GetAllExpenseNote`, `SumAllWithFilter`...). Một người bấm qua lại các màn hình không bị chặn oan.
- Kestrel `MaxRequestBodySize` = **256 KB** trên demo (`Program.cs`).
- Giới hạn theo **tài khoản** cho OTP nằm ở `PasswordResetService`, xem `18_feature-password-reset-otp.md`.

---

## 6. Lớp phụ trong service (phòng khi allowlist bị gỡ nhầm)

| Nơi | Hành vi trên demo |
|---|---|
| `PasswordResetService` | Cả `RequestOtpAsync` và `VerifyAndReset` trả lỗi "không khả dụng trên bản demo" |
| `UserService.Create` | Ném `InvalidOperationException` |
| `UserService.Update`, `ChangePassword`, `Delete` | `EnsureNotDemoAccount` chặn thao tác lên tài khoản demo (`Auth:Username`) |
| `UserService.GetAll` | Che email ngay ở server: `p***@domain` (che ở frontend thì ai gọi thẳng API vẫn đọc được) |
| `AuthController.Login` | Không ghi `VisitEvent` (visitor log của demo không ai xem, chỉ tích IP người lạ) |
| `UserController` | Trả `400` với thông báo tiếng Việt cho các trường hợp bị chặn ở trên |

---

## 7. Dữ liệu demo: `DemoReseedJob`

`Service/Jobs/DemoReseedJob.cs`. Cron `HangfireJobs:DemoReseedCron` (mặc định `0 3 * * *`, múi giờ
`SE Asia Standard Time`), hoặc chạy tay qua `POST /Jobs/Trigger/demo-reseed` từ trang Jobs của bản thật.
Chi tiết Hangfire: `22_feature-hangfire-jobs.md`.

- **Điều kiện chạy:** `DemoMode=true` **và** môi trường `Demo`. Thiếu một trong hai thì bỏ qua và ghi warning.
- **Một transaction** cho cả xóa lẫn seed. Lỗi giữa chừng thì demo giữ nguyên dữ liệu cũ.
- **Tự phục hồi user demo:** xóa mọi user khác `Auth:Username`, rồi đặt lại `Name`, `Email`
  (`Auth:AdminEmail`), `Active=true`, `Password` (`Auth:PasswordHash`).
- **Xóa các bảng:** `ExpenseRecords`, `IncomeRecords`, `CourseSchedules`, `SemesterMetadatas`,
  `ReasonTypes`, `SystemConfigurations` (theme lưu ở đây: `THEME_WEB_DARK`/`THEME_MOBILE_DARK`),
  `PhoneNotifications`, `NotificationFilters`, `VisitEvents`, `VisitorKnownIps`, `VisitorDailyStats`.
- **Seed lại:** `INotificationFilterService.SeedDefaults()`, `IVisitorLogSettingsService.SeedDefaults()`,
  `ReasonTypes` (luôn seed, không còn điều kiện "chỉ khi bảng trống"), một học kỳ, lịch học, chi tiêu
  và thu nhập giả (Bogus, tiếng Anh).
- Thứ tự xóa an toàn: `ExpenseRecords` → `ReasonType` là khóa ngoại `SetNull`, và không bảng nào có khóa ngoại tới `Users`.

### Recurring job của bản thật bị gỡ trên demo

Khi khởi động demo, `Program.cs` gọi `RemoveIfExists` cho `schedule-import-job` và
`visitor-log-maintenance-job`. Hangfire không tự xóa job đã đăng ký từ trước, và hai job này (sync UEH
thật, dọn log) không được phép chạy trên demo. Chỉ `demo-reseed-job` được đăng ký.

---

## 8. Frontend Angular

Tất cả đọc `readonly isDemoMode = environment.demoMode` (build `--configuration=demo`). Đây **chỉ là
giao diện**: backend đã chặn, phần này để demo không hiện nút dẫn tới lỗi 404.

| Component | Trên demo |
|---|---|
| `login.component` | Ẩn link "Quên mật khẩu"; không gọi `trackVisit()` |
| `user-list.component` | Ẩn nút thêm, sửa, đổi mật khẩu, xóa và cột thao tác |
| `course-schedule-list.component` | Ẩn chọn học kỳ, nút import Excel, nút import lại từ UEH |
| `settings-tab.component` | Ẩn các tab ngoài phạm vi demo |
| `guards/demo-feature.guard.ts` | Chặn route ngoài phạm vi demo, chuyển về `/settings` |

Chuỗi mới (nếu có) đi qua i18n theo `24_feature-i18n-bilingual.md`; dark mode bắt buộc như mọi UI.

---

## 9. Test

Dự án `API_Raspberry.Tests` (xUnit, nằm trong `.sln`). Chạy: `dotnet test API_Raspberry.Tests` từ thư mục `LifeHub/API_Raspberry`.

| File | Kiểm tra |
|---|---|
| `DemoAllowlistTests.cs` | Ảnh chụp mọi action có `[AllowInDemo]` (`ExpectedAllowlist`); các controller có tác dụng phụ thật không được mở method nào; attribute không đặt được trên class |
| `DemoGateMiddlewareTests.cs` | Không có endpoint / không có attribute → 404; có attribute → cho qua |
| `DemoStartupGuardTests.cs` | Biến cấm, khóa cấu hình phải rỗng, Issuer của bản thật bị từ chối, `appsettings.Demo.json` thật qua được guard |
| `PasswordResetServiceTests.cs` | Câu trả lời chung, demo chặn cả hai bước, giới hạn 60 giây / 3 lần mỗi giờ theo username (gồm `OtpStore.TryRegisterRequest`) |

`ExpectedAllowlist` **phải sửa có chủ ý** mỗi khi allowlist đổi. Diff của test là chỗ reviewer thấy rõ
endpoint nào vừa được mở ra cho người lạ.

---

## 10. Checklist khi thêm endpoint mới

1. Mặc định **không làm gì**: endpoint bị chặn trên demo.
2. Muốn mở trên demo: tự hỏi endpoint có gửi mail/Zalo, gọi dịch vụ ngoài, hoặc lộ dữ liệu thật không. Có một trong ba thì **không mở**.
3. An toàn thì gắn `[AllowInDemo]` lên method, thêm dòng `"XxxController.Method"` vào `ExpectedAllowlist`.
4. Nếu endpoint đọc `DemoMode`: inject `IDemoModeService`.
5. Nếu cần ẩn nút trên frontend demo: dùng `environment.demoMode`.
6. Chạy `dotnet test API_Raspberry.Tests`.

## Keywords

demo, demo mode, DemoMode, IsDemo, IDemoModeService, AllowInDemo, allowlist, DemoGateMiddleware,
DemoStartupGuard, DemoReseedJob, rate limit, 429, LifeHubDemo, demo.ptp-phamphong.com, deny by default,
chặn mặc định, môi trường demo
