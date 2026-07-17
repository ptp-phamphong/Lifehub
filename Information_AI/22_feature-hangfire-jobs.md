# Feature: Background Jobs (Hangfire) + trang giám sát "Tác vụ nền"

Hai tác vụ chạy nền — **đồng bộ lịch học UEH** và **bảo trì nhật ký truy cập** — chạy trên **Hangfire**
thay cho `BackgroundService` cũ. Hangfire tự lưu lịch sử mỗi lần chạy (thành công / thất bại / exception)
vào chính MariaDB đang dùng, nên có thể:

- **Chạy ngay** một job bất kỳ lúc nào (không đợi tới lịch định kỳ).
- **Xem lịch sử** các lần chạy: lúc nào, mất bao lâu, thành công hay lỗi, **lỗi vì lý do gì**.

Giao diện chính hằng ngày là **1 trang Angular** (`/app/settings/jobs-settings`). Dashboard mặc định của
Hangfire (`/hangfire`) vẫn còn để debug sâu, nhưng **chỉ vào được qua SSH tunnel** (xem §Dashboard).

> Không có phiên bản mobile cho tính năng này — theo yêu cầu, chỉ làm Angular web.

---

## Kiến trúc — thay gì cho cái gì

| Trước (đã xóa) | Nay |
|---|---|
| `Service/ScheduleImportBackgroundService.cs` (`BackgroundService`, vòng `while` + `Task.Delay`) | `Service/Jobs/ScheduleImportJob.cs` (recurring job Hangfire) |
| `Service/VisitorLogMaintenanceService.cs` (`BackgroundService`) | `Service/Jobs/VisitorLogMaintenanceJob.cs` (recurring job Hangfire) |
| `AddHostedService<…>()` trong `Program.cs` | `AddHangfireServer()` + `IRecurringJobManager.AddOrUpdate<…>()` |
| `appsettings.json` → `ScheduleImportJob:{Enabled,IntervalMinutes}` | `appsettings.json` → `HangfireJobs:{ScheduleImportCron,VisitorLogMaintenanceCron}` |

Cả hai job đều **không đổi logic nghiệp vụ** — thân hàm được bê nguyên từ `BackgroundService` cũ; chỉ khác
là các dependency giờ nhận qua constructor (Hangfire tự tạo DI scope mỗi lần chạy) thay vì
`IServiceScopeFactory.CreateScope()`.

---

## Backend

### Job classes (`Service/Jobs/`)

| File | Cron mặc định | AutomaticRetry | Việc làm |
|---|---|---|---|
| `IScheduleImportJob` + `ScheduleImportJob` | `0 * * * *` (mỗi giờ) | `Attempts = 2` | Gọi `ICourseScheduleUehSyncService.ResetImportByWeekAsync(null)` — đồng bộ lịch học UEH theo tuần |
| `IVisitorLogMaintenanceJob` + `VisitorLogMaintenanceJob` | `0 */6 * * *` (mỗi 6 giờ) | `Attempts = 1` | Dồn số liệu `visitorDailyStat` theo ngày + dọn dữ liệu thô quá hạn |

> **`[AutomaticRetry]` phải đặt trên INTERFACE, không phải class.** Job được enqueue qua interface
> (`Enqueue<IScheduleImportJob>`), nên Hangfire chỉ đọc filter attribute trên `IScheduleImportJob`. Đặt
> trên `ScheduleImportJob` sẽ **bị bỏ qua âm thầm** và job chạy theo mặc định retry 10 lần (mất nhiều giờ
> mới hiện trạng thái Failed).

> **`ScheduleImportJob` ném exception khi `!result.Success`.** `BackgroundService` cũ chỉ log warning rồi
> `return` khi UEH sync thất bại → Hangfire sẽ tưởng job Succeeded và **giấu mất đúng thứ cần xem lại**.
> `VisitorLogMaintenanceJob` không cần sửa gì — cứ lỗi là ném, Hangfire tự bắt.

### Đăng ký job định kỳ (`Program.cs`)

Phải lấy `IRecurringJobManager` **từ DI scope**, không dùng API tĩnh `RecurringJob.AddOrUpdate`:
`JobStorage.Current` chỉ được gán khi Hangfire server khởi động (sau `app.Run()`), nên gọi API tĩnh lúc
cấu hình sẽ ném `Current JobStorage instance has not been initialized yet`. Cùng nguyên tắc: `JobsService`
dùng `IBackgroundJobClient` inject qua DI, không dùng `BackgroundJob.Enqueue` tĩnh.

Id recurring job (`schedule-import-job`, `visitor-log-maintenance-job`) và khóa API (`schedule-import`,
`visitor-log-maintenance`) khai báo tập trung ở **`Service/Jobs/JobDefinitions.cs`** — nguồn duy nhất, cả
`Program.cs`, `JobsService`, `JobRunMapper` và Angular đều lấy từ đây.

### Endpoint (`Controllers/JobsController.cs`)

Không có `[Authorize]` riêng — dựa vào global JWT `FallbackPolicy` như mọi controller khác.

| Method | Route | Body / Query | Trả về |
|---|---|---|---|
| GET | `/Jobs/History` | `?take=50` | `List<JobRunDto>` — lịch sử chạy, mới nhất trước |
| POST | `/Jobs/Trigger/{jobKey}` | `jobKey` ∈ `{schedule-import, visitor-log-maintenance}` | `200 {"jobId":"6"}`, hoặc `404` nếu khóa lạ |

`JobRunDto`: `jobId`, `jobName` (tên tiếng Việt), `status`, `startedAt`, `finishedAt`, `durationMs`,
`errorMessage`.

**Không tạo bảng / migration EF nào.** Lịch sử đọc thẳng từ `JobStorage.GetMonitoringApi()` (`JobStorage`
inject được qua DI — `AddHangfire` đã đăng ký sẵn). `JobRunMapper` gộp 5 danh sách trạng thái của
Hangfire về `JobRunDto`.

### 5 trạng thái (`status`)

Trang Angular **phải hiển thị đủ cả 5**, nếu không job sẽ "biến mất" khỏi bảng ở một số thời điểm:

| Status | Ý nghĩa |
|---|---|
| `Succeeded` | Chạy xong, thành công |
| `Failed` | Đã hết số lần retry, thất bại (kèm `errorMessage`) |
| `Processing` | Worker đang chạy |
| `Enqueued` | Vừa bấm "Chạy ngay", đang chờ worker nhặt lên |
| `Scheduled` | **Đang chờ thử lại sau khi lỗi** (retry) — *không phải* "đã lên lịch định kỳ" |

> Bấm "Chạy ngay" xong job nằm ở `Enqueued` cho tới khi worker poll. `QueuePollInterval` đã giảm từ mặc
> định 15s xuống **5s** cho cảm giác tức thì. Không map `Enqueued`/`Scheduled` thì bảng trống ngay sau khi
> bấm → người dùng tưởng hỏng và bấm lại.

### Cấu hình (`appsettings.json`)

```jsonc
"ConnectionStrings": {
  // "Allow User Variables=True" là BẮT BUỘC — script tạo schema của Hangfire.MySqlStorage cần cờ này.
  "DefaultConnection": "server=…;database=raspberry;…;Allow User Variables=True;"
},
"HangfireJobs": {
  "ScheduleImportCron": "0 * * * *",
  "VisitorLogMaintenanceCron": "0 */6 * * *"
}
```

`appsettings.Development.json` **cũng có connection string riêng** → phải thêm `Allow User Variables=True`
ở cả hai file.

---

## Package storage: `Hangfire.MySqlStorage` 2.0.3

Đã spike thật (.NET 10, MySQL 8.0) trước khi chọn. Những điều cần biết:

- **Mọi storage MySQL cho Hangfire đều đã ngừng phát triển từ 2020** (`Hangfire.MySqlStorage` 2.0.3,
  `Hangfire.Storage.MySql` 2.1.0-beta, `Hangfire.MySql.Core` tự khai đã bỏ), trong khi bản SqlServer /
  PostgreSQL / SQLite vẫn ra đều. Rủi ro chấp nhận được vì app chỉ có 2 job tần suất thấp — nhưng cần biết
  để sau này không bất ngờ.
- `Hangfire.MySqlStorage` 2.0.3 compile với `MySqlConnector` **1.x**, còn Pomelo 9.0.0 bắt
  `MySqlConnector` **≥ 2.4** → NuGet hợp nhất về 2.4. Spike xác nhận **vẫn chạy tốt** (tạo schema, chạy
  job, đọc lịch sử, bắt được exception message).
- Package kéo theo `Dapper` 1.50.5 và `Newtonsoft.Json` 11.0.2 — cả hai dính CVE high. Đã **pin đè**
  `Dapper` 2.1.66 + `Newtonsoft.Json` 13.0.3 trong `API_Raspberry.csproj`. **Đừng gỡ 2 dòng pin này** dù
  code không `using` chúng trực tiếp.
- Packages đã thêm: `Hangfire.Core` 1.8.21, `Hangfire.AspNetCore` 1.8.21, `Hangfire.MySqlStorage` 2.0.3
  (+ 2 dòng pin ở trên).

---

## Dashboard Hangfire — chỉ qua SSH tunnel

```bash
ssh -L 5000:127.0.0.1:5000 <user>@<pi-host>
# rồi mở http://localhost:5000/hangfire   (http, KHÔNG phải https — Kestrel chạy HTTP thuần nội bộ,
#                                            Caddy mới là lớp lo HTTPS)
```

Cổng gác: `MapHangfireDashboard("/hangfire", …).AllowAnonymous()` + `LocalRequestsOnlyAuthorizationFilter`.

- **`.AllowAnonymous()` là BẮT BUỘC, không phải nới lỏng bảo mật.** `MapHangfireDashboard` đăng ký một
  endpoint → dính global JWT `FallbackPolicy` → trả `401` kèm `WWW-Authenticate: Bearer`. Trình duyệt
  không đính bearer token khi mở thẳng URL, nên nếu để nguyên thì dashboard 401 vĩnh viễn, vô dụng. Sau
  khi bỏ JWT, `LocalRequestsOnlyAuthorizationFilter` là cổng gác duy nhất: vào qua SSH tunnel → Kestrel
  thấy IP loopback thật → cho vào; vào qua Caddy từ internet → `UseForwardedHeaders` thay bằng IP thật của
  khách → chặn.
- **Chặn cứng ở Caddy nữa.** Vì `handle_path /api/*` cắt bỏ `/api` trước khi proxy, `/api/hangfire` từ
  internet sẽ tới thẳng middleware dashboard. Filter IP chỉ đúng chừng nào Caddy còn gửi `X-Forwarded-For`.
  Nên `Caddyfile` thêm, **đặt trước** block `handle_path /api/*`:

  ```
  handle /api/hangfire* {
      respond 404
  }
  ```

  → **Khi deploy phải chạy cả `.\deploy.ps1 caddy`**, không chỉ `be`. Thiếu bước caddy là dashboard chỉ
  còn dựa vào filter IP.

---

## Angular Web Frontend

- Route: `/app/settings/jobs-settings` (con của `SettingsTabComponent`), nav "⏱️ Tác vụ nền".
- Files: `all-app-component/jobs/jobs-page/jobs-page.component.{ts,html,scss}`,
  `services/jobs.service.ts`, `model/job.model.ts`.
- Bảng lịch sử: Tên tác vụ | Trạng thái (badge) | Bắt đầu | Kết thúc | Thời gian chạy; bấm dòng **Thất bại**
  để mở ra `<pre>` xem `errorMessage`.
- 2 nút "Chạy ngay" (1 cho mỗi job) → gọi `POST /Jobs/Trigger/{jobKey}`.
- **Tự động poll**: sau khi tải, nếu còn dòng nào ở `Enqueued`/`Processing`/`Scheduled` thì tự tải lại sau
  3s; xong hết thì dừng hẳn (timer dọn trong `ngOnDestroy`). Không cần SignalR/websocket cho app tần suất
  thấp này.
- **Dark mode**: badge trạng thái Thất bại dùng cặp token `--color-btn-delete-bg/text`, **không** dùng
  `--color-danger` (ở dark mode là chữ đỏ sẫm trên nền đỏ sẫm, gần như không đọc được). Đã verify cả light
  lẫn dark.

---

## Ghi chú vận hành

- **Chưa deploy lên Pi lần nào.** Schema `Hangfire_*` mới verify trên MySQL 8.0 local, **chưa trên MariaDB
  thật** — theo dõi `journalctl -u <service> -f` lần deploy đầu (storage tự tạo bảng lần chạy đầu tiên).
- **Deploy nhớ chạy cả `be` và `caddy`** — xem §Dashboard.
- Bảng Hangfire nằm chung DB `raspberry` → tự động vào bản backup DB sẵn có, không cần thêm gì cho
  `deploy.ps1 backup`.
- `TimeZoneId` của recurring job đang là **UTC**. Cron "mỗi giờ" / "mỗi 6 giờ" thì không lệch, nhưng nếu
  sau này đổi sang cron kiểu "3h sáng mỗi ngày" thì phải set `RecurringJobOptions.TimeZone` sang giờ VN,
  không thì lệch 7 tiếng.
- **Test đường lỗi**: đặt sai biến môi trường `UEH_LOGIN_TAIKHOAN` / `UEH_LOGIN_MATKHAU` rồi trigger
  `schedule-import`; job sẽ tới trạng thái Thất bại sau ~60s với `errorMessage` rõ ràng.

## Keywords

background job, cron, recurring, scheduled task, Hangfire, chạy ngay, tác vụ nền, lịch sử chạy, job
history, trigger, retry, dashboard, SSH tunnel, đồng bộ lịch học UEH, bảo trì nhật ký truy cập
