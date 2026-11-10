# Feature: Đồng bộ lịch UEH bằng phiên trình duyệt (Chrome extension + cookie)

Backend không còn tự đăng nhập UEH bằng mật khẩu. Thay vào đó, một **extension Chrome** lấy cookie phiên
mà chính bạn tạo khi đăng nhập `student.ueh.edu.vn`, rồi gửi về LifeHub. Pi dùng cookie đó để đọc thời
khóa biểu, và gọi UEH định kỳ để giữ phiên sống.

> Tài liệu này mô tả **phiên UEH và extension**. Cách đọc và phân tích HTML thời khóa biểu (ba bẫy
> Unicode, tuần, ngày) vẫn nằm ở `15_feature-ueh-student-schedule.md`. Cách lưu buổi học nằm ở
> `07_feature-course-schedule-crud.md`. Job nền nằm ở `22_feature-hangfire-jobs.md`.

**Trạng thái khi viết (08/11/2026):** code backend, extension và test đã xong (theo nhật ký trong
`document/plans/plan_sync_UEH_time_table_by_extension.md` của repo `pi-infra`: 64/64 test đạt). **Chưa
deploy lên Pi** và chưa chạy thử đầu-cuối với backend thật. Các bước còn lại nằm ở §12.

Quy ước đường dẫn: `Service/…`, `Controllers/…` là tương đối so với `API_Raspberry/API_Raspberry/`.
`Extension_Raspberry/…` và `API_Raspberry.Tests/…` tính từ thư mục `LifeHub/`.

---

## 1. Vì sao

| Mốc | Sự kiện |
|---|---|
| Khoảng 11:02–12:01 ngày 04/11/2026 | `loginst.ueh.edu.vn` bắt đầu dùng reCAPTCHA |
| Sau đó | Backend đăng nhập bằng mật khẩu thất bại. Mọi lần đồng bộ ra "0/3 học kỳ" |
| 08/11/2026 | Trang đăng nhập đổi: form gửi tới `https://loginst.ueh.edu.vn/continue`, chỉ còn `__RequestVerificationToken` và `recaptchaV3`, **không còn ô `MatKhau`** |
| 08/11/2026 | Đã thử: chỉ cần cookie `ASP.NET_SessionId` là Pi gọi được `GetWeek` và nhận JSON |

Quyết định: **không lách CAPTCHA**. Dùng lại phiên do chính chủ đăng nhập trong Chrome.

Quyết định thiết kế đã chốt (trích từ plan):

| Nội dung | Quyết định |
|---|---|
| Số phiên | Một phiên UEH chung cho cả hệ thống |
| Nơi lưu | Bảng riêng `uehPortalSession`, 1 dòng, **không mã hóa** |
| Cookie | Không API nào trả cookie về. Không ghi cookie vào log |
| Giữ phiên | Job trên Pi, mặc định 15 phút |
| Phiên chết | Đánh dấu hết hạn, không gọi UEH nữa, không thử lại. Không gửi email hay Zalo |
| Cách gửi | Tự gửi khi mở trang UEH (tối đa 1 lần / 10 phút) và có nút "Đồng bộ LifeHub" |

---

## 2. Luồng tổng thể

```
Chrome (đã đăng nhập UEH + LifeHub)
  content-ueh.js ──"submit"──► background.js ──đọc cookie student.ueh.edu.vn──┐
                                                                               │ POST /api/UehSession/Submit
                                                                               ▼  (Bearer JWT, { cookieHeader, forceSync })
UehSessionController.Submit
  → UehPortalSessionService.SubmitAsync
      1. UehSessionRules.IsValidCookieHeader        sai → invalid_cookie (400)
      2. GetSemestersToSyncAsync().First            không có → no_semester
      3. UehStudentScheduleService.ValidateAsync    1 request GetWeek tới UEH
           trang đăng nhập → not_logged_in  (KHÔNG ghi đè phiên đang lưu)
           lỗi mạng/5xx    → portal_error   (không lưu gì)
      4. UehSessionRules.SavedOutcome / ShouldSync  saved_new | revived | unchanged
      5. SaveValidated(cookie)                      → UehPortalSessionRepository → EF Core → MariaDB
      6. ShouldSync = true → Enqueue<IScheduleImportJob>  → trả SyncJobId
  ◄── { outcome, message, syncJobId, status }

Hangfire: ScheduleImportJob → CourseScheduleUehSyncService.ResetImportByWeekAsync
      → dùng cookie đã lưu → GetWeek + DrawingSchedules → ParseWeekHtml → xóa + ghi CourseSchedule
      → RecordSync(success, message, count)

content-ueh.js hỏi GET /UehSession/Status mỗi 3 giây cho tới khi lastSyncAt đổi → hiện toast.
```

Chuỗi backend (đúng quy ước): **Controller → Service → Repository → Mapper → EF Core → MariaDB**.
Controller mỏng. Logic nằm ở `UehPortalSessionService.SubmitAsync`.

Hai vòng chạy nền độc lập với extension:

| Vòng | Job | Chu kỳ mặc định | Việc |
|---|---|---|---|
| Đồng bộ | `schedule-import-job` | mỗi giờ (`0 * * * *`) | Đọc lịch bằng cookie đã lưu |
| Giữ phiên | `ueh-keep-alive-job` | mỗi 15 phút (`*/15 * * * *`) | Gọi 1 request `GetWeek` để phiên không bị UEH hủy vì rảnh, và phát hiện sớm khi phiên chết |

---

## 3. Bảng `uehPortalSession`

Entity `Model/UehPortalSession.cs:14-42`. DbSet: `Data/AppDbContext.cs:24`. Migration:
`Migrations/20261108062627_AddUehPortalSession.cs:12-36`.

Bảng chỉ có **đúng 1 dòng** (`Id = 1`, `UehPortalSession.SingletonId`, không tự tăng).

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `Id` | int, PK, không auto | Luôn là 1 |
| `CookieHeader` | longtext, bắt buộc | Chuỗi header `Cookie` dạng `name=value; name2=value2`. **Không bao giờ trả ra API, không ghi log** |
| `SavedAt` | datetime(6) | Lúc phiên này (giá trị `ASP.NET_SessionId`) được lưu lần đầu (UTC). Gửi lại cùng phiên (`unchanged`, `revived`) **không** đổi cột này |
| `LastValidatedAt` | datetime(6) | Lần cuối gọi UEH thấy phiên còn sống (UTC) |
| `ExpiredAt` | datetime(6), null | Lúc phát hiện phiên chết (UTC). Null khi phiên còn sống |
| `IsValid` | bool | Phiên còn sống |
| `LastSyncAt` | datetime(6), null | Lần cuối một lượt đồng bộ kết thúc |
| `LastSyncSuccess` | bool, null | Lượt đó thành công hay không |
| `LastSyncMessage` | longtext, null | Câu kết quả (tiếng Việt) |
| `LastSyncCount` | int | Số buổi học đã ghi |

Các lớp:

| Lớp | File | Việc |
|---|---|---|
| Repository | `Repository/UehPortalSessionRepository.cs:24-37` | `Get()` đọc dòng Id = 1. `Save()` thêm nếu chưa có, ngược lại `SaveChanges` |
| Mapper | `Mapper/UehPortalSessionMapper.cs:14-33` | `ToStatusDto`. **Cố ý không map `CookieHeader`** |
| Service | `Service/UehPortalSessionService.cs` | `Get`, `GetCookieHeader`, `GetStatus`, `SaveValidated` (:149), `MarkExpired` (:163), `MarkValidated` (:173), `RecordSync` (:182), `SubmitAsync` (:62) |
| DTO | `Dto/UehSessionDto.cs` | `UehSessionStatusDto`, `UehSessionSubmitDto`, `UehSessionSubmitResultDto`, hằng `UehSessionOutcome` |

DI đăng ký trong `Program.cs:132` (mapper), `:148` (repository), `:166` (service), `:177` (`IUehKeepAliveJob`).

Ghi chú:

- `MarkExpired()` gọi nhiều lần vẫn giữ `ExpiredAt` của lần đầu (`UehPortalSessionService.cs:163-171`).
- `RecordSync()` và `MarkValidated()` bỏ qua khi chưa có dòng nào.
- **Múi giờ:** cột lưu UTC. MySQL đọc lên là `DateTimeKind.Unspecified`, JSON sẽ thiếu `Z` và trình
  duyệt hiểu nhầm là giờ máy. Mapper gắn `Kind = Utc` (`UehPortalSessionMapper.cs:37-39`). Nếu bỏ,
  extension so `lastSyncAt` sẽ lệch 7 tiếng.
- **`SavedAt` = lúc phiên được lưu lần đầu**, chỉ đặt lại khi là phiên mới (`UehSessionRules.IsNewSession`).
  Nhờ vậy dòng log "Sống được …" của job giữ phiên (§9) đo đúng phiên đã sống bao lâu kể từ khi extension
  gửi lần đầu. Đây vẫn chưa phải lúc đăng nhập UEH (có thể sớm hơn), nên số đo là mức thấp nhất.
- Bảng nằm trong DB `raspberry` nên **có trong bản backup** `mysqldump` (`deploy.ps1 backup`). Bản
  backup chứa cookie của phiên đang sống tại lúc sao lưu. Coi file backup là dữ liệu nhạy cảm.

---

## 4. Endpoint

Controller: `Controllers/UehSessionController.cs`. Cần JWT (global `FallbackPolicy`). **Không có
`[AllowInDemo]`** nên bị chặn hoàn toàn trên demo (§11).

| Method | Route | Body | Trả về |
|---|---|---|---|
| POST | `/UehSession/Submit` | `{ cookieHeader: string, forceSync: bool }` | `UehSessionSubmitResultDto` (200, hoặc 400 khi `invalid_cookie`) |
| GET | `/UehSession/Status` | — | `UehSessionStatusDto` |

Qua Caddy, đường đầy đủ là `/api/UehSession/Submit` và `/api/UehSession/Status` (Caddy cắt `/api`).
JSON trả về dùng camelCase mặc định của ASP.NET Core (`outcome`, `syncJobId`, `hasSession`…).

### `UehSessionSubmitResultDto` (`Dto/UehSessionDto.cs:29-41`)

| Trường | Ý nghĩa |
|---|---|
| `outcome` | Mã máy đọc, xem bảng dưới |
| `message` | Câu tiếng Việt. Extension hiện **nguyên văn** |
| `syncJobId` | Id job Hangfire. `null` khi không cần đồng bộ |
| `status` | `UehSessionStatusDto` sau khi xử lý |

### `UehSessionStatusDto` (`Dto/UehSessionDto.cs:6-19`)

`hasSession`, `isValid`, `savedAt`, `lastValidatedAt`, `expiredAt`, `lastSyncAt`, `lastSyncSuccess`,
`lastSyncMessage`, `lastSyncCount`. **Không có cookie.** Chưa có phiên nào thì `hasSession = false` và
mọi trường còn lại là mặc định.

### Bảng `Outcome` (`Dto/UehSessionDto.cs:43-59`)

| `outcome` | HTTP | Khi nào | Lưu cookie? | Đồng bộ? |
|---|---|---|---|---|
| `saved_new` | 200 | Cookie hợp lệ, và khác phiên đang lưu (hoặc chưa lưu gì) | Có | Có |
| `revived` | 200 | Cùng phiên với đang lưu, nhưng phiên đang bị đánh dấu hết hạn, nay sống lại | Có | Có |
| `unchanged` | 200 | Cùng phiên, vẫn sống | Có (`SavedAt` giữ nguyên) | Không, trừ khi `forceSync` |
| `not_logged_in` | 200 | UEH trả trang đăng nhập: trình duyệt chưa đăng nhập UEH | **Không**. Phiên cũ giữ nguyên | Không |
| `no_semester` | 200 | Không học kỳ nào có `IsCurrentSemester = true` nên không có `YearStudy`/`TermID` để kiểm tra | Không | Không |
| `invalid_cookie` | **400** | Cookie rỗng, dài hơn 4096 ký tự, hoặc có `\r`/`\n` | Không | Không |
| `portal_error` | 200 | Không gọi được UEH khi kiểm tra (mạng, 5xx, JSON hỏng, danh sách tuần rỗng) | Không. Phiên cũ giữ nguyên | Không |

Chỉ `invalid_cookie` trả 400. Các outcome còn lại là kết quả nghiệp vụ nên trả 200 để extension đọc trường
`outcome` (`Controllers/UehSessionController.cs:27-34`). Không có JWT hoặc JWT hết hạn thì trả 401 như mọi
endpoint khác.

Thứ tự kiểm tra trong `SubmitAsync` (`Service/UehPortalSessionService.cs:62-116`):

1. `invalid_cookie` → 2. `no_semester` → 3. `not_logged_in` / `portal_error` (gọi UEH) → 4. lưu → 5. xếp job.

Học kỳ dùng để kiểm tra là học kỳ có `Id` **lớn nhất** trong số `IsCurrentSemester = true`
(`UehStudentScheduleService.cs:68-75`, sắp xếp `OrderByDescending(Id)`).

**Log mỗi lần Submit** (một chỗ duy nhất, `UehPortalSessionService.cs:119-123`):
`UehSession/Submit: outcome {Outcome}, forceSync {ForceSync}, syncJobId {SyncJobId}.` Không có cookie.

---

## 5. Quy tắc `ShouldSync`

File `Service/UehSessionRules.cs` (hàm thuần, không I/O, có test).

**"Cùng một phiên" so theo giá trị `ASP.NET_SessionId`** (`SessionKey`, :29-46), không so cả chuỗi cookie.
Lý do: cookie phụ trên trang (ví dụ cookie thống kê) đổi liên tục. So cả chuỗi thì lần mở trang nào cũng
bị coi là "phiên mới" và kích hoạt đồng bộ thừa. Chuỗi cookie mới nhất vẫn được lưu đè mỗi lần.

- Tên cookie không phân biệt hoa thường; giá trị được `Trim()`; giá trị so bằng `!=` (phân biệt hoa thường).
- Không tìm thấy cookie `ASP.NET_SessionId` thì mới so cả chuỗi.

`ShouldSync(storedCookie, storedValid, newCookie, forceSync)` (:58-63):

| `forceSync` | Phiên đang lưu | Cùng `ASP.NET_SessionId`? | Đang `IsValid`? | Đồng bộ? | `outcome` |
|---|---|---|---|---|---|
| bất kỳ | chưa có | — | — | Có | `saved_new` |
| bất kỳ | có | **Khác** | bất kỳ | Có | `saved_new` |
| `false` | có | Cùng | Có | **Không** | `unchanged` |
| `false` | có | Cùng | Không | Có | `revived` |
| `true` | có | Cùng | Có | Có | `unchanged` (nhưng vẫn có `syncJobId`) |
| `true` | bất kỳ | bất kỳ | bất kỳ | Luôn có | như các dòng trên |

Phiên cũ còn sống thì **không** đồng bộ: job mỗi giờ đã lo, mở trang UEH không nên kéo thêm một lượt.
`SavedOutcome` (:66-70) quyết định tên `outcome`, độc lập với `forceSync`.

---

## 6. Nhận diện phiên chết: `IsLoginResponse`

`Service/UehPortalResponse.cs:29-50`. Hàm thuần `IsLoginResponse(int statusCode, string body, bool expectJson)`
trả `true` (phiên đã chết) khi **một** trong các điều kiện sau đúng:

| # | Điều kiện | Giải thích |
|---|---|---|
| 1 | Mã HTTP 3xx | Client gọi với `AllowAutoRedirect = false`. Phiên chết thì UEH redirect về `loginst`. Đây là dấu hiệu chính |
| 2 | `expectJson` và nội dung (sau `TrimStart`) bắt đầu bằng `<` | `GetWeek` phải trả JSON. Nhận về HTML là trang đăng nhập |
| 3 | Nội dung chứa `name="MatKhau"` | Trang đăng nhập bản cũ |
| 4 | Nội dung chứa `name="recaptchaV3"` | Trang đăng nhập bản từ 11/2026 |

Chi tiết quan trọng:

- `expectJson = true` với `GetWeek`. `expectJson = false` với `DrawingSchedules`, vì trang lịch tuần **vốn là
  HTML** và bắt đầu bằng `<`. Điều kiện 2 chỉ áp dụng khi mong đợi JSON.
- Body `null` hoặc rỗng **không** coi là trang đăng nhập (trừ khi 3xx). Đó là lỗi portal (`PortalError`).
- Đã kiểm tra với phiên thật ngày 08/11/2026: `GetWeek/2026$HKC` trả 200 + JSON; `DrawingSchedules?…&Week=45`
  trả 200 + HTML 12 KB, không chứa `name="MatKhau"`, `name="recaptchaV3"` hay `loginst`. Trang lịch tuần
  không bị nhận nhầm là trang đăng nhập.
- Nếu một ngày trang lịch tuần có chứa các chuỗi trên, phiên sẽ bị đánh dấu hết hạn nhầm. Dấu hiệu: lượt
  đồng bộ báo "Phiên UEH đã hết hạn" ngay khi vừa gửi cookie hợp lệ.

Hai loại kết quả khi gọi UEH (`enum UehFetchErrorKind`, :4-13): `Ok`, `SessionExpired` (thử lại vô ích),
`PortalError` (lỗi khác: 4xx/5xx, JSON hỏng, danh sách rỗng; phiên có thể vẫn sống).

---

## 7. Gọi UEH bằng cookie

`Service/UehStudentScheduleService.cs` (viết lại, chỉ còn đường đi bằng cookie). Interface có 3 hàm:

| Hàm | Việc |
|---|---|
| `GetSemestersToSyncAsync()` | Đọc `SemesterMetadatas` có `IsCurrentSemester = true`, nhiều dòng cũng được |
| `FetchAllWeeksForSemestersAsync(semesters, cookieHeader)` | Một phiên (`HttpClient`) cho mọi học kỳ: `GetWeek` rồi vòng `DrawingSchedules` qua các tuần **khác nhau** |
| `ValidateAsync(cookieHeader, semester)` | Đúng 1 request `GetWeek`. **Không ném lỗi mạng ra ngoài**, trả `PortalError` |

`CreateSession(cookieHeader)` (:80-92):

- `UseCookies = false`: header `Cookie` được gửi đúng nguyên văn chuỗi từ trình duyệt.
- `AllowAutoRedirect = false`: thấy được 302 khi phiên chết, thay vì lặng lẽ đi theo redirect rồi nhận trang
  đăng nhập với mã 200.
- Timeout 30 giây mỗi request (`RequestTimeout`, :47). Mặc định của .NET là 100 giây.
- User-Agent `Mozilla/5.0`.

Hành vi khi gặp lỗi:

| Tình huống | Kết quả |
|---|---|
| `SessionExpired` ở bất kỳ request nào | Dừng **cả lượt**, không bỏ qua sang tuần hay học kỳ sau (`:129-135`, `:180-194`). Dữ liệu đã lấy chỉ là một phần học kỳ |
| Một tuần lỗi (`PortalError`) | Ghi warning, bỏ qua tuần đó, tiếp tục (`:196-201`) |
| Lỗi mạng trong lượt đồng bộ | **Ném ra ngoài** để Hangfire thử lại (`:121`) |
| Lỗi mạng trong `ValidateAsync` | Bắt lại, trả `PortalError` (`:106-113`) |

Cấu hình tốc độ (không đổi): `UehSchedule:WeekRequestDelayMs` (mặc định 400), `UehSchedule:SemesterRequestDelayMs`
(mặc định 2000). Xem `15_feature-ueh-student-schedule.md`.

---

## 8. Đồng bộ và xử lý phiên hết hạn

`Service/CourseScheduleUehSyncService.cs`. Cả `POST /ResetImportCourseScheduleFromUeh` lẫn
`ScheduleImportJob` đều gọi `ResetImportByWeekAsync()` (**không còn tham số**).

Thứ tự trong `RunAsync()` (:59-158):

| Bước | Điều kiện | Kết quả | Gọi UEH? |
|---|---|---|---|
| 1 | Chưa có dòng phiên | `ErrorKind = SessionExpired`, "Chưa có phiên UEH — mở trang UEH để extension gửi phiên." | Không |
| 2 | `!IsValid` | `ErrorKind = SessionExpired`, "Phiên UEH đã hết hạn từ HH:mm dd/MM — mở trang UEH để extension gửi phiên mới." | Không |
| 3 | Không có học kỳ đồng bộ | `ErrorKind = PortalError`, "Không có học kỳ nào được đánh dấu đồng bộ (IsCurrentSemester = true)." | Không |
| 4 | Gọi `FetchAllWeeksForSemestersAsync` | Lấy từng học kỳ | Có |
| 5 | Gặp `SessionExpired` giữa chừng | Học kỳ đã lấy xong **vẫn được ghi** (dữ liệu đầy đủ và đúng). Gọi `MarkExpired()`. Câu báo kèm "(Đã kịp đồng bộ N học kỳ, M buổi học.)" khi có | — |
| 6 | Chạy hết mà không gặp trang đăng nhập | `MarkValidated()` | — |

- Giờ trong câu báo là giờ Việt Nam (`SE Asia Standard Time`), định dạng `HH:mm dd/MM` (`FormatVnTime`, :161-167).
- `ResetImportByWeekAsync()` luôn `RecordSync(success, message, count)` ở cuối (:55). Không có phiên thì
  `RecordSync` tự bỏ qua.
- **Lỗi mạng** cũng `RecordSync(false, "Lỗi khi gọi cổng UEH: …", 0)` **trước khi** ném lại (:46-52).
  Lý do: extension đang chờ `lastSyncAt` đổi sẽ thấy lỗi ngay, không phải chờ hết 3 phút.
- Hai bảo vệ dữ liệu cũ không đổi: chỉ xóa sau khi lấy và phân tích xong; không xóa khi không phân tích
  được buổi nào. Xem `07_feature-course-schedule-crud.md`.

### Trang Tác vụ nền: lượt theo lịch bỏ qua, "Chạy ngay" Thất bại một lần

Cron mỗi giờ gọi `ScheduleImportJob.RunScheduledAsync()`. Chưa có phiên hoặc phiên đã hết hạn thì lượt đó
**bỏ qua im lặng**: không gọi UEH, không ghi `LastSync*`, ném `UehSyncSkippedException` để
`SkippedJobToDeletedAttribute` chuyển job sang Deleted — trang Tác vụ nền không hiện dòng nào. Lượt đồng bộ kế
tiếp do extension đẩy khi người dùng đăng nhập lại (`saved_new`/`revived` → `Enqueue RunAsync`). Chi tiết cơ
chế: doc 22.

Phiên còn sống thì `RunScheduledAsync` gọi tiếp `RunAsync()`. "Chạy ngay" và `UehSession/Submit` gọi thẳng
`RunAsync()` (`Service/Jobs/ScheduleImportJob.cs`):

| `result` | Job ném | Hangfire |
|---|---|---|
| `ErrorKind == SessionExpired` | `UehSessionExpiredException(result.Message)` | **Thất bại ngay, 1 lần, không thử lại** |
| `!Success` (lỗi khác) | `InvalidOperationException("Đồng bộ lịch học từ UEH thất bại: …")` | Thử lại 2 lần |
| Lỗi mạng (ném từ service) | `HttpRequestException` / timeout | Thử lại 2 lần |

Cơ chế: `[AutomaticRetry(Attempts = 2, ExceptOn = new[] { typeof(UehSessionExpiredException) })]` trên
**interface** `IScheduleImportJob` (`Service/Jobs/IScheduleImportJob.cs:18`). `ExceptOn` loại lỗi này ra khỏi
việc thử lại, vì thử lại phiên đã chết chắc chắn hỏng tiếp và chỉ tốn request tới UEH. Hangfire 1.8.21 có
`ExceptOn`. Câu hướng dẫn nằm trong `errorMessage` của dòng Thất bại ở `/app/settings/jobs-settings`.

`UehSessionExpiredException` ở `Service/Jobs/UehSessionExpiredException.cs:8`. Không bọc thêm tiền tố vì
`Message` đã là câu hướng dẫn hoàn chỉnh.

---

## 9. Job giữ phiên (`ueh-keep-alive-job`)

| Mục | Giá trị |
|---|---|
| Interface / class | `IUehKeepAliveJob` (`Service/Jobs/IUehKeepAliveJob.cs`) / `UehKeepAliveJob` (`Service/Jobs/UehKeepAliveJob.cs`) |
| Id recurring | `ueh-keep-alive-job` (`JobDefinitions.UehKeepAliveRecurringId`, `Service/Jobs/JobDefinitions.cs:19`) |
| Tên hiển thị | `Giữ phiên UEH` (`JobDefinitions.UehKeepAliveName`, :22; ánh xạ ở :38-39) |
| Cron mặc định | `*/15 * * * *` (`appsettings.json:30`, và giá trị dự phòng trong `Program.cs:345`) |
| Khóa ghi đè | `UehKeepAliveCron` (System Configuration, chỉ có hiệu lực sau khi khởi động lại backend) |
| Thử lại | `[AutomaticRetry(Attempts = 0)]` trên interface (`IUehKeepAliveJob.cs:11`). Lượt sau chỉ cách 15 phút |
| Instance | Chỉ **bản thật**. Demo gọi `RemoveIfExists` (`Program.cs:362`) |
| "Chạy ngay" | **Không có** trong `JobsService.Trigger` (chỉ `schedule-import`, `visitor-log-maintenance`, `demo-reseed`) |

Mỗi lượt (`UehKeepAliveJob.RunAsync`, :28-66):

| Tình huống | Hành động |
|---|---|
| Chưa có phiên, hoặc phiên đã hết hạn | `return`, **không gọi UEH** |
| Không có học kỳ `IsCurrentSemester = true` | `LogWarning`, bỏ qua lượt (`GetWeek` cần năm học + mã học kỳ) |
| `ValidateAsync` = `Ok` | `MarkValidated()` |
| `ValidateAsync` = `SessionExpired` | `MarkExpired()` + `LogWarning` thời gian phiên đã sống |
| `ValidateAsync` = `PortalError` (mạng, 5xx) | **Ném `InvalidOperationException`**: dòng Thất bại hiện trên trang Tác vụ nền, nhưng **không** đánh dấu hết hạn (UEH trục trặc tạm thời không có nghĩa là phiên đã chết) |

Dòng log khi phiên chết, để đo UEH hủy phiên sau bao lâu:
`UehKeepAlive: phiên UEH đã chết. Sống được {Lifetime} kể từ lúc extension gửi ({SavedAt:o}); lần cuối còn sống {LastValidated:o}.`
`SavedAt` là lúc extension gửi phiên này lần đầu (§3); phiên có thể đã đăng nhập trước đó, nên `Lifetime` là mức **thấp nhất**. `LastValidated` cho biết
lần cuối chắc chắn còn sống.

### Cách đăng ký (`Program.cs:304-352`)

Hàm cục bộ `AddOrUpdateWithCronOverride<TJob>(recurringId, overrideKey, defaultCron, call)` (:312-338) dùng
chung cho `ScheduleImportCron` và `UehKeepAliveCron`. Thứ tự đọc cron:
**System Configuration (`KeyConfig = overrideKey`, nếu hợp lệ) → `HangfireJobs:{overrideKey}` trong appsettings → mặc định.**
Cron ghi đè sai cú pháp thì ghi warning rồi dùng lại appsettings/mặc định (xem `14_feature-system-configuration-crud.md`).

### Lịch sử trên trang Tác vụ nền

`JobsService.GetHistory` (`Service/JobsService.cs:44-73`) **ẩn các lần Thành công** của "Giữ phiên UEH"
(`JobName == JobDefinitions.UehKeepAliveName`, :68-70). Lý do: 96 dòng mỗi ngày sẽ đẩy hết các dòng đồng bộ
ra khỏi danh sách 50 dòng. Lần **Thất bại** của nó vẫn hiện, vì đó mới là thứ cần thấy.

Vì lọc sau khi lấy, `ReadRows` lấy dư danh sách Thành công thêm 200 dòng (`SucceededOverfetch`, :25, :82).
Không lấy dư thì 50 dòng mới nhất toàn là job giữ phiên và các lần đồng bộ Thành công biến mất. Hangfire tự
xóa job thành công sau 1 ngày (~130 dòng) nên +200 là đủ. Angular không cần sửa.

---

## 10. Extension (`Extension_Raspberry/`)

Chrome Manifest V3, phiên bản `1.0.0`. Quyền: `cookies`, `storage`. `host_permissions`: chỉ
`https://student.ueh.edu.vn/*` và `https://app.ptp-phamphong.com/*`. `default_locale: vi`. Chưa có icon
(Chrome dùng icon chữ cái mặc định). README cài đặt riêng: `Extension_Raspberry/README.md`.

| File | Chạy ở | Việc |
|---|---|---|
| `manifest.json` | — | Khai báo quyền, service worker, 2 content script (`run_at: document_idle`) |
| `background.js` | Service worker | Giữ JWT; đọc cookie UEH (cả HttpOnly); gọi `POST /UehSession/Submit` và `GET /UehSession/Status`; giới hạn 10 phút |
| `content-lifehub.js` | `https://app.ptp-phamphong.com/*` (**không** chạy trên `demo.`) | Đọc JWT từ `localStorage` rồi gửi cho background |
| `content-ueh.js` | `https://student.ueh.edu.vn/*`, trừ `/Login*` (trang đăng nhập cũng nằm trên host này; chạy ở đó chỉ ra `not_logged_in` và một toast lỗi thừa) | Chèn nút, tự gửi khi mở trang, xử lý bấm nút, hỏi trạng thái, hiện toast |
| `content-ueh.css` | `https://student.ueh.edu.vn/*` | Kiểu nút, chấm màu, toast. Mọi class có tiền tố `lh-sync-` để không đụng CSS của UEH |
| `_locales/vi`, `_locales/en` | — | 17 chuỗi, song ngữ (`chrome.i18n`) |

### Lấy JWT (`content-lifehub.js`)

- Đọc `auth_token` và `auth_expiration` trong `localStorage` (Angular bản prod dùng `storagePrefix` rỗng).
- Gửi `{ type: "saveToken" }` khi tải trang, **mỗi 15 giây**, và mỗi khi tab trở lại `visible`. Lý do: đăng
  nhập xảy ra ngay trong tab nên sự kiện `storage` không bắn.
- Không có token thì **không ghi đè** token đang lưu. Background tự kiểm tra hạn trước khi dùng.
- Lưu ở `chrome.storage.local` (`jwt`, `jwtExpiration`).

### Gửi cookie (`background.js:93-121`)

1. Không có JWT hoặc JWT hết hạn → trả `need_login`. **Dừng trước khi đọc cookie**: không có đích hợp lệ
   thì cookie không rời trình duyệt.
2. Tự gửi (`force = false`) mà lần gửi thành công trước chưa quá **10 phút** → chỉ gọi `GET /UehSession/Status`.
   Mốc là `lastSubmitAt` trong `chrome.storage.local`.
3. Đọc `chrome.cookies.getAll({ url: "https://student.ueh.edu.vn" })`, ghép `name=value; …`.
4. `POST /api/UehSession/Submit` với `Authorization: Bearer <jwt>` và body `{ cookieHeader, forceSync: force }`.
5. Nhận 401 → xóa JWT đã lưu, trả `need_login`.
6. Chỉ ghi `lastSubmitAt` khi `outcome` là `saved_new`, `revived` hoặc `unchanged`. Gửi hỏng (chưa đăng nhập
   UEH, UEH lỗi…) thì lần mở trang sau gửi lại ngay.
7. Submit trả 400 kèm body `invalid_cookie` vẫn được coi là kết quả hợp lệ (có trường `outcome`).

### Nút và trạng thái (`content-ueh.js`)

**Vị trí nút:** nằm **dưới logo UEH**, trong một hàng riêng `div.lh-sync-row` chèn ngay sau khối chứa
`img.header-logo` (`insertAdjacentElement("afterend", …)`, `content-ueh.js:43-58`). Nếu logo nằm trong thẻ
`<a>` thì lấy khối cha của `<a>`, để nút không thành một phần của link. Hàng này căn giữa
(`content-ueh.css:30-34`).

Lý do chọn "dưới logo": header UEH (kiểm tra 08/11/2026) là `<header>` flex cao 100px, logo 80px là con duy
nhất và căn giữa. Chèn nút vào trong header làm logo lệch khỏi giữa. Một hàng riêng không phải sửa CSS của
trang.

**Không thấy logo:** `MutationObserver` chờ tối đa 5 giây (`LOGO_WAIT_MS`). Hết 5 giây mà vẫn không có thì
dùng **nút nổi** góc trên bên phải (`position: fixed; top: 12px; right: 12px`, `content-ueh.css:36-41`).

**Màu chấm** (`renderStatus`, :95-123):

| Màu | Điều kiện |
|---|---|
| Xanh | Có phiên, `isValid`, và `lastSyncSuccess === true` |
| Đỏ | Chưa có phiên, hoặc phiên hết hạn, hoặc `lastSyncSuccess === false`; cũng đỏ khi cần đăng nhập lại LifeHub hoặc lỗi mạng |
| Xám | Đang tải/đang đồng bộ, hoặc phiên còn sống nhưng chưa đồng bộ lần nào |

Tooltip (rê chuột vào nút): trạng thái phiên, giờ và số buổi của lần đồng bộ cuối, câu lỗi nếu có
(`lastSyncMessage` hiện nguyên văn từ backend), và dòng "Bấm để đồng bộ ngay".

**Toast** (góc dưới phải, `pointer-events: none`, tự ẩn sau 5 giây; toast lỗi 8 giây):

| Tình huống | Toast? |
|---|---|
| Bấm nút (`force`) | Luôn có kết quả: đang đồng bộ → xong / thất bại / quá 3 phút |
| Tự gửi và có `syncJobId` (`saved_new`, `revived`) | Có: "Đang đồng bộ…", rồi kết quả |
| Tự gửi nhưng gửi hỏng (`not_logged_in`, `no_semester`, `portal_error`, `invalid_cookie`) | Có, toast lỗi với `message` của backend |
| Tự gửi, `unchanged`, hoặc trong 10 phút chỉ hỏi trạng thái | Không. Chỉ cập nhật chấm và tooltip |
| Tự gửi nhưng thiếu JWT hoặc lỗi mạng | Có, toast lỗi ("Mở LifeHub … để đăng nhập lại" hoặc "Không kết nối được LifeHub …") |

**Chờ đồng bộ** (`waitForSync`, :146-157): hỏi `Status` mỗi **3 giây**, tối đa **3 phút**, cho tới khi
`lastSyncAt` **khác** giá trị ngay sau lúc gửi. So "khác" chứ không so với giờ máy, để không phụ thuộc đồng
hồ máy tính và đồng hồ Pi có khớp nhau hay không. Hết 3 phút: toast "Chờ đồng bộ quá 3 phút. Xem trang Tác
vụ nền trên LifeHub."

Việc chờ nằm ở **content script**, không phải `background.js`. Lý do: Chrome có thể tắt service worker MV3
khi rảnh. Mỗi tin nhắn từ trang đánh thức nó lại, nên để trang điều khiển việc chờ thì chắc hơn.

Khác: nút bị `disabled` trong lúc chạy (`busy`). `window.__lifehubUehSyncLoaded` chặn nạp script hai lần.
Nút nằm trên trang UEH (bên thứ ba), không thuộc giao diện LifeHub, nên dùng màu cố định trong
`content-ueh.css` chứ không dùng token dark mode của Angular.

Giới hạn đã biết: màn hình rất hẹp (dưới khoảng 450px) có thể làm nút tràn sang phải. Extension dùng trên
máy tính nên chấp nhận.

---

## 11. Bảo mật

| Quy tắc | Cách thực hiện |
|---|---|
| Cookie không rời backend | `UehSessionStatusDto` không có trường cookie. `UehPortalSessionMapper` không map `CookieHeader` (`Mapper/UehPortalSessionMapper.cs:13`). `IUehPortalSessionService.Get()` chỉ dùng nội bộ |
| Cookie không vào log | `Result()` chỉ ghi `outcome`, `forceSync`, `syncJobId`. `ValidateAsync` chỉ trả `Message` của lỗi mạng. Kiểm tra sau deploy: `grep -c ASP.NET_SessionId` trên log phải ra `0` |
| Cookie không vào bảng Hangfire | Cả hai job gọi `job.RunAsync()` **không tham số**. Cookie chỉ đọc từ bảng `uehPortalSession` lúc chạy |
| Chống chèn header | `IsValidCookieHeader`: không rỗng, ≤ 4096 ký tự, không có `\r` hoặc `\n`. Chuỗi này được đặt nguyên văn vào header `Cookie` của request ra UEH |
| Chỉ người đã đăng nhập mới gửi được | `Submit` cần JWT. Extension không đọc cookie khi chưa có JWT hợp lệ |
| Không chạy trên demo | (1) `UehSessionController` không có `[AllowInDemo]` nên demo trả 404 rỗng. (2) `UehSessionController` nằm trong `NeverAllowedControllers` (`API_Raspberry.Tests/DemoAllowlistTests.cs:62-67`). (3) `ueh-keep-alive-job` không đăng ký trên demo. (4) Content script không chạy trên `demo.ptp-phamphong.com`. (5) Demo không có mạng ra ngoài |
| Quyền extension tối thiểu | Chỉ `cookies`, `storage` và 2 host. Cookie chỉ gửi tới `https://app.ptp-phamphong.com/api` |
| Không ghi giá trị thật vào tài liệu | Mọi ví dụ trong tài liệu và test dùng giá trị giả (`aaa`, `abc123`) |

Giới hạn cần biết:

- Cookie lưu **không mã hóa** trong DB (quyết định Q3/Q13). Ai đọc được DB hoặc file backup đều dùng được
  phiên đang sống. Phiên mất tác dụng khi bạn bấm **Đăng xuất** trên UEH hoặc khi UEH hủy nó.
- Backend chỉ kiểm tra cookie **còn đăng nhập**, không kiểm tra cookie thuộc sinh viên nào. LifeHub là hệ
  thống một người dùng nên chấp nhận.
- Chưa biết UEH hủy phiên sau bao lâu và có gắn phiên với IP hay không. Đã thử ngày 08/11/2026 rằng Pi dùng
  được cookie lấy từ Chrome. Log của job giữ phiên (§9) là dữ liệu để theo dõi tiếp.
- Biến `UehLogin__TaiKhoan` / `UehLogin__MatKhau` (và `UEH_LOGIN_*`) **không còn được code đọc**. Xem §13.

---

## 12. Cài đặt, deploy và vận hành

### Cài extension (làm trên máy của bạn)

1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked**, chọn thư mục `LifeHub/Extension_Raspberry/`.
3. Mở `https://app.ptp-phamphong.com` và đăng nhập. Extension lấy JWT.
4. Mở `https://student.ueh.edu.vn` (đã đăng nhập UEH). Nút **Đồng bộ LifeHub** hiện dưới logo.

Sửa code extension xong thì bấm nút tải lại (↻) ở `chrome://extensions`, rồi tải lại trang UEH. Extension
**không** đi qua `deploy.ps1`.

### Deploy backend

`.\deploy.ps1 be` từ thư mục `D:\Rasberry_PI` (cần mật khẩu sudo, bạn tự chạy). Sau deploy, đọc journal:

| Kiểm tra | Mong đợi |
|---|---|
| Migration `AddUehPortalSession` | Đã chạy. `db.Database.Migrate()` bọc trong `try/catch`, lỗi chỉ in `Migration failed` và app vẫn chạy với schema cũ |
| Job `ueh-keep-alive-job` | Đã đăng ký, không có cảnh báo "không hợp lệ" về `UehKeepAliveCron` |
| Demo | `GET demo.ptp-phamphong.com/demo-api/UehSession/Status` ra 404 |
| Lần Submit đầu | Một dòng `UehSession/Submit: outcome saved_new …` và một lượt đồng bộ Thành công với số buổi > 0 |

### Cấu hình

| Khóa | Nơi | Ý nghĩa |
|---|---|---|
| `HangfireJobs:UehKeepAliveCron` | `appsettings.json:30` | Cron job giữ phiên, mặc định `*/15 * * * *` |
| `UehKeepAliveCron` | System Configuration (`/app/settings/system-configuration-settings`) | Ghi đè cron trên. Chỉ có hiệu lực sau khi khởi động lại backend |
| `HangfireJobs:ScheduleImportCron` / `ScheduleImportCron` | như trên | Cron job đồng bộ, mặc định mỗi giờ |

### Bật lại lịch đồng bộ mỗi giờ

Trong giai đoạn chuyển đổi (08/11/2026), job đồng bộ được tạm dừng bằng key System Configuration
`ScheduleImportCron = 0 0 31 2 *` (31/02, không bao giờ tới). Khi extension chạy ổn:

1. Xóa key `ScheduleImportCron` trong "Cấu hình đặc biệt".
2. Khởi động lại backend:
   ```
   ssh -t phong@100.121.10.84 "sudo systemctl restart tmux-auto-start-api.service"
   ```

Job quay về chạy mỗi giờ (`0 * * * *`). Đây là trạng thái của môi trường thật tại thời điểm viết, không
phải của mã nguồn.

---

## 13. Việc đã xóa và biến môi trường

Đã **xóa** trong 11/2026 (không còn trong code):

| Đã xóa | Ghi chú |
|---|---|
| `Controllers/UehStudentScheduleController.cs` và endpoint `POST /FetchUehStudentSchedule` | Frontend và mobile không gọi |
| `LoginAsync` (cả đoạn phát hiện reCAPTCHA), `FetchScheduleAsync`, `FetchWeekListAsync`, `FetchWeekScheduleAsync`, `FetchAllWeeksAsync`, `GetCurrentSemesterAsync`, `LoginUrl`, `PeriodScheduleUrlFormat` | Chỉ còn đường đi bằng cookie |
| DTO `UehStudentScheduleRequestDto`, `UehStudentScheduleResponseDto`, `UehWeekListResponseDto`, `UehWeekScheduleResponseDto` | `Dto/UehStudentScheduleDto.cs` chỉ còn `UehWeekDto`, `UehWeekHtmlDto`, `UehAllWeeksResponseDto` |
| Body của `POST /ResetImportCourseScheduleFromUeh` | Action không còn tham số. Angular vẫn gửi `{}`, bị bỏ qua (`course-schedule-list.component.ts:166`) |

**`UehLogin__TaiKhoan` / `UehLogin__MatKhau` và `UEH_LOGIN_TAIKHOAN` / `UEH_LOGIN_MATKHAU` không còn được
code đọc.** Khối `UehLogin` trong `appsettings.json:17-20` và `appsettings.Development.json:5` còn lại chỉ là
placeholder rỗng. `DemoStartupGuard` **vẫn chặn** chúng trên demo (`Service/DemoStartupGuard.cs:19-30`): bản
deploy demo cũ từng mang tài khoản UEH thật theo đường này. Có thể xóa các biến đó khỏi `/etc/lifehub/real.env`
khi tiện. Không cần làm gấp, không ảnh hưởng chức năng.

---

## 14. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Chấm đỏ, tooltip "Mở LifeHub (app.ptp-phamphong.com) để đăng nhập lại" | Extension chưa có JWT, JWT hết hạn, hoặc nhận 401 | Mở `app.ptp-phamphong.com`, đăng nhập. Chờ tối đa 15 giây hoặc chuyển tab lại để extension lấy token |
| Toast: "Trình duyệt chưa đăng nhập UEH …" (`not_logged_in`) | Cookie gửi lên không còn đăng nhập | Đăng nhập UEH trong Chrome, rồi bấm nút. Phiên cũ trong DB không bị ghi đè |
| Toast: "Chưa có học kỳ nào được đánh dấu đồng bộ …" (`no_semester`) | Không học kỳ nào có `IsCurrentSemester = true` | Bật cờ ở trang học kỳ (`13_feature-semester-metadata-crud.md`) |
| Toast: "Không kiểm tra được phiên: …" (`portal_error`) | UEH lỗi mạng hoặc 5xx lúc kiểm tra | Thử lại sau. Phiên cũ giữ nguyên |
| Toast: "Cookie không hợp lệ …" (`invalid_cookie`) | Cookie rỗng, quá 4096 ký tự hoặc có xuống dòng | Kiểm tra Chrome có cookie của `student.ueh.edu.vn` không (đã đăng nhập chưa) |
| Tác vụ nền: "Đồng bộ lịch học UEH" Thất bại, "Phiên UEH đã hết hạn từ HH:mm dd/MM — mở trang UEH …" | Bấm "Chạy ngay" khi phiên đã chết, hoặc phiên chết giữa một lượt đồng bộ. (Lượt theo lịch khi phiên đã chết thì bỏ qua, không hiện dòng nào) | Mở `student.ueh.edu.vn`, đăng nhập lại. Extension gửi cookie, outcome `revived` hoặc `saved_new`, đồng bộ tự chạy |
| Tác vụ nền: "Chưa có phiên UEH — mở trang UEH …" | Chưa extension nào gửi phiên (bảng rỗng) | Cài extension, mở trang UEH |
| Tác vụ nền: "Giữ phiên UEH" Thất bại, "không gọi được cổng UEH" | Lỗi mạng hoặc UEH lỗi. Phiên **chưa** bị đánh dấu hết hạn | Chờ lượt sau (15 phút). Lặp lại nhiều lần thì xem journald |
| Chấm xám mãi, toast "Chờ đồng bộ quá 3 phút …" | Job chưa chạy xong hoặc worker bận | Xem trang Tác vụ nền. Lượt đồng bộ kéo nhiều tuần nên có thể lâu |
| Mở trang UEH nhưng không gửi gì | Giới hạn 10 phút của lần gửi tự động | Bấm nút để gửi ngay (`forceSync`) |
| Không thấy nút | Extension chưa bật/nạp lại, hoặc trang chưa xong | Tải lại extension (↻) rồi tải lại trang. Không có `img.header-logo` thì nút nổi ở góc trên bên phải |
| Phiên báo hết hạn nhầm ngay sau khi gửi cookie hợp lệ | Trang UEH có thể đã đổi nội dung chứa `name="MatKhau"` hoặc `name="recaptchaV3"`, hoặc `GetWeek` bắt đầu trả HTML | Xem `UehPortalResponse.IsLoginResponse` (§6) và nội dung phản hồi thật của UEH |
| `dotnet ef migrations add` lỗi chuỗi kết nối rỗng | `appsettings.json` chỉ có placeholder | Đặt biến `ConnectionStrings__DefaultConnection="Server=localhost;Database=x;User=x;Password=x"` (không cần DB thật). `AppDbContextFactory` đọc biến môi trường (`Data/AppDbContextFactory.cs:17`) |

Dòng log hữu ích (journald):

| Tìm | Ý nghĩa |
|---|---|
| `UehSession/Submit: outcome` | Mỗi lần extension gửi: outcome, forceSync, syncJobId |
| `UehKeepAlive: phiên UEH đã chết` | Lúc job giữ phiên phát hiện phiên chết, kèm thời gian sống |
| `Đồng bộ UEH: phiên hết hạn giữa chừng` | Phiên chết khi đang đồng bộ |
| `Đồng bộ UEH: … học kỳ thành công` | Kết quả mỗi lượt |

---

## 15. Test

`API_Raspberry.Tests/UehSessionTests.cs` (xUnit, hàm thuần, không cần DB hay HTTP). Chạy:
`dotnet test API_Raspberry.Tests` từ thư mục `LifeHub/API_Raspberry`.

| Lớp test | Dòng | Kiểm tra |
|---|---|---|
| `UehPortalResponseTests` | :9 | 3xx, HTML trang đăng nhập (cũ và bản 2026) khi mong đợi JSON/HTML, trang lịch tuần không phải trang đăng nhập, JSON hợp lệ, body rỗng, 500 không có HTML |
| `UehCookieValidationTests` | :84 | Rỗng, quá dài, đúng 4096 ký tự, CR/LF, hợp lệ |
| `UehShouldSyncTests` | :128 | Mọi nhánh `ShouldSync` và `SavedOutcome`, cookie phụ đổi không tính là phiên mới, `forceSync`, không có `ASP.NET_SessionId`, `SessionKey` |

`API_Raspberry.Tests/DemoAllowlistTests.cs:62-67`: `NeverAllowedControllers` có `UehSessionController`
(thay cho `UehStudentScheduleController` đã xóa). Không đổi thì test đỏ.

Chưa có test tự động cho `SubmitAsync`, job giữ phiên hay extension. Phần đó kiểm tra bằng tay ở bước deploy.

---

## 16. Key files

Backend (`LifeHub/API_Raspberry/API_Raspberry/`):

| Tầng | File |
|---|---|
| Controller | `Controllers/UehSessionController.cs` |
| Service | `Service/UehPortalSessionService.cs`, `Service/UehSessionRules.cs`, `Service/UehPortalResponse.cs`, `Service/UehStudentScheduleService.cs`, `Service/CourseScheduleUehSyncService.cs` |
| Job | `Service/Jobs/IUehKeepAliveJob.cs`, `Service/Jobs/UehKeepAliveJob.cs`, `Service/Jobs/UehSessionExpiredException.cs`, `Service/Jobs/UehSyncSkippedException.cs`, `Service/Jobs/SkippedJobToDeletedAttribute.cs`, `Service/Jobs/IScheduleImportJob.cs`, `Service/Jobs/ScheduleImportJob.cs`, `Service/Jobs/JobDefinitions.cs`, `Service/JobsService.cs` |
| Repository / Mapper | `Repository/UehPortalSessionRepository.cs`, `Mapper/UehPortalSessionMapper.cs` |
| Model / DTO | `Model/UehPortalSession.cs`, `Dto/UehSessionDto.cs` |
| Cấu hình | `Program.cs` (:132, :148, :166, :177, :312-345, :362), `appsettings.json` (`HangfireJobs:UehKeepAliveCron`) |
| Migration | `Migrations/20261108062627_AddUehPortalSession.cs` |
| Tooling | `Data/AppDbContextFactory.cs` (thêm `AddEnvironmentVariables`) |

Extension (`LifeHub/Extension_Raspberry/`): `manifest.json`, `background.js`, `content-lifehub.js`,
`content-ueh.js`, `content-ueh.css`, `_locales/vi/messages.json`, `_locales/en/messages.json`, `README.md`.

Tài liệu liên quan: `15_feature-ueh-student-schedule.md` (parser, ba bẫy), `07_feature-course-schedule-crud.md`
(lưu buổi học), `22_feature-hangfire-jobs.md` (job), `14_feature-system-configuration-crud.md` (khóa cron),
`25_feature-demo-environment.md` (demo), kế hoạch `document/plans/plan_sync_UEH_time_table_by_extension.md`
(repo `pi-infra`, có nhật ký chi tiết từng bước).

## Keywords

ueh session, phiên ueh, cookie, ASP.NET_SessionId, extension, chrome extension, Extension_Raspberry,
manifest v3, keep-alive, giữ phiên, UehKeepAliveCron, ueh-keep-alive-job, IUehKeepAliveJob,
UehSession/Submit, UehSession/Status, uehPortalSession, saved_new, revived, unchanged, not_logged_in,
no_semester, invalid_cookie, portal_error, ShouldSync, IsLoginResponse, reCAPTCHA, recaptchaV3,
UehSessionExpiredException, ExceptOn, phiên hết hạn, đồng bộ lịch UEH, forceSync, nút Đồng bộ LifeHub
