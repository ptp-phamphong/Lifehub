# Feature: Visitor Analytics (Nhật ký truy cập)

## 1. Mục đích

Biết được **ai đã ghé thăm portfolio công khai, xem trang nào, lúc nào, và quay lại bao nhiêu lần** —
hiển thị trong một tab riêng của trang quản trị Angular.

Trước tính năng này, hệ thống **không có bất kỳ analytics nào**: không GA, không Plausible,
Caddy không bật access log, backend không log request.

## 2. Ràng buộc quan trọng nhất (quyết định toàn bộ thiết kế)

Portfolio là **Next.js static export** — Caddy đọc thẳng file `.html` từ `/var/www/portfolio`.
**Backend ASP.NET không bao giờ nhìn thấy request tới trang portfolio.**

→ Middleware phía server **không thể** ghi nhận traffic portfolio.
→ Cách duy nhất là **beacon từ phía client** (`components/visit-tracker.tsx`).

Beacon còn có 2 lợi thế:
- Bắt được điều hướng client-side (navbar dùng `next/link`, chuyển `/en/` → `/en/about/` **không reload**
  document nên access log của web server cũng sẽ bỏ sót).
- Tự loại phần lớn crawler vì chúng không chạy JavaScript.

## 3. Kiến trúc

```
Portfolio (static, công khai)                Angular admin (/app, cần đăng nhập)
  <VisitTracker/>                              Cài đặt ▸ 📈 Nhật ký truy cập
      │ fetch keepalive / sendBeacon                 │ JWT (auth.interceptor)
      ▼                                              ▼
  POST /api/Visit/Record  [AllowAnonymous]    POST /api/VisitorLog/GetAll    (bảng phân trang)
  POST /api/Visit/Leave   [AllowAnonymous]    POST /api/VisitorLog/Summary   (KPI + biểu đồ)
      │                                       POST /api/VisitorLog/Visitors  (khách quay lại)
      │                                       GET  /api/VisitorLog/History   (lịch sử dài hạn)
      │                                       CRUD /api/VisitorLog/KnownIp   (IP của tôi)
      ▼
  VisitEventService ─ enrich: IP thật (X-Forwarded-For), UAParser, GeoIP offline, cờ bot
      ▼
  MySQL/MariaDB: visitEvent (thô) + visitorKnownIp (đánh dấu) + visitorDailyStat (tổng hợp)
      ▲
  VisitorLogMaintenanceService (chạy nền mỗi 6h): dựng lại số liệu ngày + xóa dữ liệu quá hạn
```

## 4. IP thật của khách — cạm bẫy đã xử lý

Caddy reverse-proxy tới `127.0.0.1:5000`. **Trước tính năng này `Program.cs` không có
`UseForwardedHeaders`**, nên `HttpContext.Connection.RemoteIpAddress` luôn là `127.0.0.1`.
Nếu không sửa, **mọi khách đều bị ghi là localhost**.

Đã thêm vào `Program.cs` (**phải đứng đầu pipeline, trước `UseCors`**):

```csharp
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;                      // chỉ có Caddy đứng trước
    options.KnownProxies.Clear();
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Add(IPAddress.Loopback);
    options.KnownProxies.Add(IPAddress.IPv6Loopback);
});
...
app.UseForwardedHeaders();
```

`RequestEnrichmentService.GetClientIp()` còn đọc trực tiếp `X-Forwarded-For` làm lớp dự phòng.

### Cạm bẫy thứ hai: múi giờ ở mốc lọc (đã sửa 17/07/2026)

`VisitorLogPageComponent.fromDate()` từng dựng mốc lọc bằng:

```ts
return date.toISOString().slice(0, 10);   // SAI - kèm chú thích "tránh lệch múi giờ"
```

`toISOString()` đổi sang UTC **trước**, nên ở UTC+7 mọi thời điểm từ **00:00 đến 06:59** sẽ lùi về ngày hôm trước → bộ lọc "7/30/90 ngày" âm thầm **rộng thêm một ngày**, kéo theo mọi KPI và biểu đồ trong tab lệch theo.

Đo thực tế: logic cũ sai **7 trên 24 khung giờ**. Nghĩa là nó **chạy đúng gần cả ngày rồi thỉnh thoảng sai** — kiểu lỗi rất khó phát hiện, và chú thích ở ngay bên cạnh lại khẳng định điều ngược lại.

Backend so sánh theo **biên ngày địa phương** (`VisitEventRepository.BuildQuery`: `filter.FromDate.Value.Date`, còn `VisitedAt` lưu bằng `DateTime.Now` của Pi), nên client bắt buộc phải gửi **ngày địa phương**.

→ Nay dùng chung `src/app/utils/date-key.ts` (`toDayKey`), cùng util với trang Phân tích chi tiêu. **Đừng đưa `toISOString()` trở lại.**

### Giới hạn thành thật
Với khách dùng **IPv4**, ta chỉ thấy **IP công cộng của router / NAT nhà mạng** — không thể biết
IP nội bộ của thiết bị (WebRTC leak đã bị chặn từ lâu). Hai thứ bù lại:
- **IPv6**: nếu khách vào bằng IPv6 thì địa chỉ thường là của từng thiết bị.
- **`visitorId`**: UUID sinh ở client, lưu `localStorage`. **Đây mới là thứ trả lời "khách quay lại
  bao nhiêu lần"**, vì nó sống sót qua việc đổi IP.

## 5. Phạm vi tracking

| Khu vực | Có track? | Ghi chú |
|---|---|---|
| Portfolio (`/en/*`, `/vi/*`) | ✅ Toàn bộ pageview | Mục tiêu chính |
| `/app/login` | ✅ Pageview + **mọi lần thử đăng nhập** (thành công/thất bại) | Biết ai đang dò trang admin |
| `/app/*` (các trang bên trong) | ❌ Không track | Đã có `AuthGuard`, chỉ là traffic của chính chủ |

## 6. Cơ sở dữ liệu

### `visitEvent` — dữ liệu thô, mỗi dòng là 1 pageview hoặc 1 sự kiện đăng nhập
`EventType`: `1 = PageView`, `2 = LoginSuccess`, `3 = LoginFailed`
`Area`: `1 = Portfolio`, `2 = AppLogin`

Cột chính: `VisitedAt`, `VisitorId`, `SessionId`, `IpAddress` (45 ký tự — đủ cho IPv6), `Path`,
`Locale`, `PageTitle`, `Referrer`/`ReferrerDomain`, `UtmSource/Medium/Campaign`, `UserAgent`,
`Browser`, `Os`, `DeviceType`, `IsBot`, `CountryCode`/`CountryName`/`City`, `Language`,
`ScreenWidth/Height`, `DurationMs`, `Detail` (username đã thử khi login).

Index: `(VisitedAt, Area)`, `(VisitorId, VisitedAt)`, `IpAddress`.

### `visitorKnownIp` — đánh dấu "traffic của tôi"
`IpAddress`, `VisitorId` (tùy chọn), `Label`, `IsSelf`, `CreatedDate`.

**Điểm mấu chốt:** cờ `IsSelf` được so khớp **lúc query**, không lưu vào `visitEvent`.
Nhờ vậy khi đánh dấu một IP là của mình thì **toàn bộ lượt truy cập cũ của IP đó cũng bị ẩn theo** —
đúng thứ ta cần khi nhà mạng đổi IP.

**Tự đánh dấu:** mỗi lần **đăng nhập thành công**, `AuthController` gọi `UpsertSelfIp()` để thêm IP đó
vào bảng với nhãn `auto: login <username> <ngày>`. IP nhà đổi động sẽ **tự sửa** ở lần đăng nhập kế tiếp.

### `visitorDailyStat` — số liệu tổng hợp theo ngày
`(Date, Area, Path, CountryCode)` unique.

**Quy ước:** dòng có `Path = "*"` **và** `CountryCode = "*"` là **TỔNG CỦA CẢ NGÀY**.
Chỉ dòng đó mới có `UniqueVisitors` đúng — cộng `UniqueVisitors` của các dòng theo path
sẽ **đếm trùng** một khách xem nhiều trang.

Cột `Path` giới hạn **191 ký tự** (không phải 512 như `visitEvent.Path`) vì nó nằm trong UNIQUE index:
InnoDB giới hạn 767 byte/cột index ở row format cũ, utf8mb4 tốn 4 byte/ký tự → 191 × 4 = 764 byte.

## 7. Cấu hình (dùng lại bảng `systemConfiguration`)

Tự seed khi khởi động (`VisitorLogSettingsService.SeedDefaults()`), sửa được ngay trong
tab **Cấu hình đặc biệt** mà **không cần deploy lại**:

| Key | Mặc định | Ý nghĩa |
|---|---|---|
| `VisitorLog.Enabled` | `true` | Công tắc tổng cho việc ghi nhận |
| `VisitorLog.RetentionDays` | `180` | Giữ dữ liệu thô bao nhiêu ngày (≤ 0 = giữ mãi) |
| `VisitorLog.ExcludeSelfByDefault` | `true` | Mặc định ẩn traffic của mình |
| `VisitorLog.ExcludeBotsByDefault` | `true` | Mặc định ẩn bot |

## 8. Bot

`RequestEnrichmentService` gắn cờ `IsBot` bằng regex trên User-Agent.

⚠️ **Bộ lọc "ẩn bot" chỉ áp dụng cho pageview, KHÔNG áp dụng cho sự kiện đăng nhập.**
Một lần dò mật khẩu bằng `curl`/script luôn bị đánh cờ `IsBot` — mà đó lại chính là thứ cần nhìn thấy nhất.
Logic nằm ở `VisitEventRepository.BuildQuery()`.

## 9. GeoIP (offline, không gọi API bên ngoài)

Dùng **DB-IP City Lite** (`.mmdb`, miễn phí, **không cần tạo tài khoản**, giấy phép CC-BY).
Đọc bằng `MaxMind.GeoIP2` (cùng định dạng file với GeoLite2).

- Đường dẫn: `appsettings.json` → `GeoIp:DatabasePath`
- **Không commit file vào git** (`.gitignore` có `*.mmdb`), tải riêng và đặt lên Pi.
- Thiếu file → `GeoIpService` ghi warning, trả `null`, **không bao giờ ném exception**.
  Cột quốc gia/thành phố chỉ để trống (dev trên Windows chạy bình thường).
- Giấy phép CC-BY yêu cầu **dẫn link về db-ip.com** trên trang có hiển thị dữ liệu →
  đã có dòng attribution ở cuối tab Visitor Log.

## 10. Files

### Backend (`API_Raspberry/API_Raspberry/`)
| Lớp | File |
|---|---|
| Model | `Model/VisitEvent.cs`, `Model/VisitorKnownIp.cs`, `Model/VisitorDailyStat.cs` |
| DTO | `Dto/VisitEventDto.cs`, `Dto/VisitorKnownIpDto.cs` |
| Mapper | `Mapper/VisitEventMapper.cs`, `Mapper/VisitorKnownIpMapper.cs` |
| Repository | `Repository/VisitEventRepository.cs`, `Repository/VisitorKnownIpRepository.cs`, `Repository/VisitorDailyStatRepository.cs` |
| Service | `Service/VisitEventService.cs` (ghi nhận), `Service/VisitorAnalyticsService.cs` (truy vấn), `Service/RequestEnrichmentService.cs` (IP/UA/bot/UTM), `Service/GeoIpService.cs`, `Service/VisitorLogSettingsService.cs`, `Service/VisitorLogMaintenanceService.cs` (chạy nền) |
| Controller | `Controllers/VisitController.cs` (**công khai**), `Controllers/VisitorLogController.cs` (admin) |
| Sửa đổi | `Program.cs` (forwarded headers + DI + hosted service + CORS localhost:3000), `Data/AppDbContext.cs`, `Controllers/AuthController.cs` (ghi lần đăng nhập), `appsettings.json` (GeoIp) |
| Migration | `Migrations/20260714161547_AddVisitorAnalytics.cs` |

### Portfolio (`Portfolio/`)
- `components/visit-tracker.tsx` — client component, không render gì
- `app/providers.tsx` — gắn `<VisitTracker />`

### Angular (`Front_End_Raspberry/src/app/`)
- `model/visitor-log.model.ts`
- `services/visitor-log.service.ts`
- `all-app-component/visitor-log/visitor-log-page/` — vỏ + thanh lọc + 4 tab
- `all-app-component/visitor-log/visitor-overview/` — KPI + bảng xếp hạng
- `all-app-component/visitor-log/visitor-log-list/` — bảng thô (phân trang/sắp xếp **ở server**)
- `all-app-component/visitor-log/visitor-profile-list/` — gộp theo khách (quay lại bao nhiêu lần)
- `all-app-component/visitor-log/known-ip-list/` — quản lý "IP của tôi"
- `all-app-component/visitor-log/visit-trend-chart/` — biểu đồ **SVG viết tay**
- Sửa đổi: `app.module.ts`, `app-routing.module.ts`, `settings-tab.component.html`,
  `interceptors/loading.interceptor.ts`, `all-app-component/login/login.component.ts`

**Route:** `/settings/visitor-log-settings`

## 11. Vì sao không dùng thư viện biểu đồ

`chart.js` vẽ lên `<canvas>` → **không đọc được biến CSS** (`var(--color-*)`) → trong dark mode
sẽ thành một mảng trắng chói. SVG viết tay dùng thẳng `fill="var(--color-primary)"` nên **tự đổi màu
theo theme, không tốn dòng code nào**. Đúng yêu cầu bắt buộc về dark mode trong `AGENTS.md`.

Nếu sau này cần biểu đồ tương tác thật sự → dùng `ngx-charts` (cũng dựa trên SVG), **đừng dùng chart.js**.

## 12. Hiệu năng

- **Bảng dữ liệu thô** (nơi dữ liệu lớn nhất): lọc / sắp xếp / phân trang **hoàn toàn ở server**
  (`VisitEventRepository.GetPaged`), `pageSize` bị chặn tối đa 200. Sắp xếp dùng **whitelist cột**,
  không bao giờ ghép chuỗi từ input người dùng.
- **Overview và tab Khách**: nạp các dòng trong khoảng lọc rồi gộp **trong bộ nhớ**. Với quy mô
  một portfolio cá nhân thì hoàn toàn ổn. Nếu sau này dữ liệu lên tới hàng triệu dòng, cần chuyển
  các phép gộp này xuống SQL.
- Job nền dọn dẹp chạy **60 giây sau khi khởi động, rồi mỗi 6 tiếng**.
