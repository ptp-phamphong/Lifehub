# Plan: Chuyển TKB từ import theo học kỳ sang import theo tuần

Viết ngày 17/07/2026.

## Tiến độ

| Bước | Trạng thái |
|---|---|
| 1. Model + DTO + Mapper + migration | ✅ **XONG** (17/07/2026) — migration đã apply vào DB |
| 2. Service fetch theo tuần | ✅ **XONG** (17/07/2026) — đã verify với portal thật |
| 3. Parser tuần | ✅ **XONG** (17/07/2026) — verify từng field với ground truth |
| 4. Orchestration (reset import + background job) | ✅ **XONG** (17/07/2026) — chạy thật: 75 buổi / 26 tuần |
| 5. Đọc theo tuần (endpoint + frontend) | ✅ **XONG** (17/07/2026) |
| 6. Docs | ✅ **XONG** (17/07/2026) |

**Đã chốt (17/07/2026):** buổi `NGHỈ` → **hiện tất cả, phân biệt bằng màu/nhãn** (phương án (a), §8).

## Bước 7 — Lịch tháng + validate trên trình duyệt — ✅ XONG (17/07/2026)

- **Lịch tháng phân biệt `NGHỈ`** (web + mobile) — hoàn tất phương án (a) ở §8.
  Cả hai lịch tháng cũng đã chuyển sang lọc theo `sessionDate`.
- **Tách util dùng chung**: `Front_End_Raspberry/src/app/utils/learning-mode.ts` và
  `Mobile_Raspberry/src/utils/learningMode.ts`. Quy tắc chuẩn hoá NFC suýt bị nhân thành **4 bản sao**
  (tuần + tháng × 2 nền tảng). Đừng inline lại nó vào component.

**Đã validate trên trình duyệt thật** (backend + `ng serve`, Playwright profile `raspberry-pi-local`):
- Lịch tuần gọi `/GetCourseScheduleByWeek/2026-07-13` — **một request/tuần**; chuyển tuần gọi tuần mới.
  Lịch tháng vẫn gọi `ByMonth`. Đúng thiết kế.
- **Bằng chứng bug gốc đã sửa:** tháng 7/2026, "Phân tích dữ liệu" là `NGHỈ` ở 4/7, 18/7, 25/7 nhưng
  **11/7 là buổi học thật** (phòng B1-509). Bốn ngày này trước đây trông y hệt nhau vì cùng một pattern lặp.
- Dark mode đúng ở cả hai lịch.

**Bug tương phản bắt được khi nhìn ảnh** (không compile nào phát hiện được): palette `cancelled` ban đầu
trả `border: var(--color-border)`, mà `border` được dùng **cho cả viền trái lẫn màu chữ giờ học** — và
`--color-border` (#334155) **trùng đúng** `--color-surface-alt` (#334155) trong dark theme → giờ học tàng hình.
Đổi sang `--color-text-muted` (RN: `colors.border` → `colors.textSecondary`).
**Bài học:** khi lấy một token cho `border`, kiểm tra xem nó có bị dùng làm màu chữ ở đâu không.

**`NG0100: ExpressionChangedAfterItHasBeenCheckedError` — có sẵn từ trước, ĐÃ SỬA (17/07/2026).**
Không phải do thay đổi này: đã kiểm chứng lỗi xuất hiện ở trang "Chi tiêu" (`expense-record-list`)
mà **chưa hề mở lịch**. Sửa vì user yêu cầu — chi tiết ở `Information_AI/21_fix-loading-spinner-ng0100.md`.

## Còn nợ

- **Mobile chưa nhìn tận mắt.** Máy dev **không có Android SDK/emulator/adb**, và Expo web **không chạy
  được** app này (chết ở native module: `ExpoSecureStore` → 401, `registerHeadlessTask`). Đã làm thay:
  `npx tsc --noEmit` sạch, và chạy chính util mobile trên **dữ liệu thật từ API** — `NGHỈ`→`isCancelled=true`
  + nhãn "NGHỈ", `TẬP TRUNG`→`false` + nhãn rỗng, và chốt chặn NFD vẫn bắt đúng.
  **Phần chưa kiểm chứng là render RN** (màu/gạch ngang light+dark) — cần Expo Go trên máy thật.
- **Xác nhận dữ liệu thật lưu đúng NFC:** `NGHỈ` = `004e 0047 0048 1ec8` (Ỉ = U+1EC8 dựng sẵn),
  `TẬP TRUNG` = `...1eac...` (Ậ). Chuẩn hoá backend đã ăn vào DB.
- **View Perior có bị NFD không?** Chưa kiểm tra. `GetNodeText` nay đã normalize nên fix rồi dù có hay
  không — nhưng nếu có thì parser cũ đã âm thầm mất field từ lâu, đáng xác nhận. Xem doc 15.
- **`ScheduleImportJob:IntervalMinutes`** — mỗi lần chạy giờ là ~52 request thay vì 1. Cân nhắc nới.
- **`appsettings.json` đang được git track** và chứa credentials UEH — dễ commit nhầm.
- **`Microsoft.OpenApi` 2.4.1** dính lỗ hổng high severity (`NU1903`). Có sẵn từ trước, không liên quan
  thay đổi này, nhưng nên xử lý.

Xong hết 6 bước → có thể xoá file plan này; nội dung đã chuyển vào doc 07 + 15.

Mục tiêu: TKB hiện tại lấy theo pattern cả học kỳ nên hiển thị sai ở những tuần lệch pattern.
Chuyển sang lấy đúng từng tuần từ portal UEH, lưu mỗi buổi học thành một dòng có ngày cụ thể.

---

## 1. Vấn đề hiện tại

`UehStudentScheduleService.FetchScheduleAsync()` gọi:

```
GET https://student.ueh.edu.vn/Home/DrawingStudentSchedule_Perior?YearStudy={Year}&TermID={CodeSemester}
```

Đây là view "TKB thứ - tiết" — trả về **cả học kỳ dưới dạng pattern lặp**. `CourseScheduleImportService.ImportFromHtml()`
parse ra mỗi môn thành 1 dòng `CourseSchedule` với `StartDate..EndDate` + `DayOfWeek`.

Frontend (`CourseWeekCalendar.tsx:239-249`, và bản Angular tương ứng) lọc theo:

```ts
if (dateNorm < start || dateNorm > end) return false;
if (c.dayOfWeek && c.dayOfWeek !== day.dow) return false;
```

Tức là **suy diễn**: "cứ mỗi thứ N trong khoảng [StartDate, EndDate] là có học". Sai ở mọi tuần lệch pattern:
nghỉ lễ, tuần thi, dạy bù, đổi phòng giữa kỳ, môn kết thúc sớm.

View "TKB Tuần" của portal thì ngược lại — nó cho **sự thật của từng tuần cụ thể**.

---

## 2. Khảo sát portal (đã verify trực tiếp trên trình duyệt 17/07/2026)

### 2.1. Endpoint danh sách tuần

```
GET https://student.ueh.edu.vn/Home/GetWeek/{YearStudy}${TermID}
vd: /Home/GetWeek/2026$HKD
```

Trả **JSON thuần** (không phải HTML):

```json
[{"Week":52,"DisPlayWeek":1,"WeekOfYear":29},
 {"Week":1, "DisPlayWeek":2,"WeekOfYear":29},
 {"Week":11,"DisPlayWeek":12,"WeekOfYear":29}, ...]
```

| Field | Ý nghĩa |
|---|---|
| `Week` | Tuần ISO trong năm dương lịch → **chính là giá trị truyền vào param `Week`** của `DrawingSchedules` |
| `DisPlayWeek` | Số thứ tự hiển thị trong dropdown (là text người dùng thấy) |
| `WeekOfYear` | Tuần ISO hiện tại — hằng số cho mọi phần tử, portal dùng để chọn mặc định. **Không dùng làm gì cả.** |

Lưu ý `$` trong URL là ký tự phân cách thật, không phải escape. Khi ghép URL trong C# nhớ
`Uri.EscapeDataString` cho `TermID` nhưng **giữ nguyên `$`**.

`TermID`: `HKD` (Học kỳ đầu) / `HKG` (Học kỳ giữa) / `HKC` (Học kỳ cuối) — khớp `SemesterMetadata.CodeSemester`.

Kích thước danh sách thay đổi theo cả `YearStudy` lẫn `TermID` (đã đo):

| Key | Số phần tử | DisPlayWeek | Ghi chú |
|---|---|---|---|
| `2026$HKD` | 54 | D1..D54 | trải cả năm học, có 2 tuần trùng `Week` |
| `2026$HKG` | 15 | D21..D35 | **không bắt đầu từ D1** |
| `2026$HKC` | 41 | D1..D41 | không có trùng |
| `2025$HKD` | 81 | D1..D81 | 29 tuần trùng `Week` |

→ `DisPlayWeek` là index toàn cục trong năm học, không reset theo học kỳ.

### 2.2. Endpoint TKB một tuần

```
GET https://student.ueh.edu.vn/Home/DrawingSchedules?YearStudy=2026&TermID=HKD&Week=11
```

(Param `t=<random>` trên portal chỉ để cache-bust, **không bắt buộc**.)

Trả HTML partial. Dòng đầu:

```
Tuần 12: từ ngày 09/03/2026 đến ngày 15/03/2026
```

Số trong caption là `DisPlayWeek` (12), **không phải** param `Week` (11). Ngày 09/03/2026 là **thứ Hai thật của tuần** —
đây là ground truth để tính ngày.

Bảng có đúng 8 cột, header row:

```
Tiết | Thứ hai | Thứ ba | Thứ tư | Thứ năm | Thứ sáu | Thứ bảy | Chủ nhật
```

18 dòng tiết (1..18). Ô có môn học mang `rowspan` = số tiết.

### 2.3. Cấu trúc ô môn học

`<td rowspan="4"><div class="Content">` chứa các `<span>` ngăn bởi `<br>`:

```
0  [span] B2-402                                              ← Phòng (KHÔNG có nhãn)
1  [span] Thiết kế thông tin và chiến lược nội dung (INF609001)  ← Tên HP (Mã HP)  (KHÔNG có nhãn)
2  [span] LHP: 26D1INF60900101
   [br][br]                                                   ← ngăn cách 2 nhóm
3  [span] Số tiết: 4
4  [span] Tiết: 2-5
5  [span] Giờ học: 07g10->10g40
6  [span] GV: TS.Ngô Tấn Vũ Khanh
7  [span] Email: khanhntv@ueh.edu.vn
8  [span] Hình thức học: TẬP TRUNG
9  [span] Ngôn ngữ: Tiếng Việt
```

Giàu hơn view hiện tại: có `Tiết` bắt đầu/kết thúc, giảng viên, email GV, hình thức học, ngôn ngữ.

Quy tắc parse: 2 span đầu **không có nhãn** → span[0] = `Room`, span[1] = `CourseName (CourseCode)`.
Các span sau đều dạng `Nhãn: giá trị`.

### 2.4. Kết luận đã verify

- **`DayOfWeek = colIndex + 1`** với colIndex là cột thật sau khi giải rowspan (col 0 = Tiết, col 1..7 = Thứ hai..Chủ nhật).
  Khớp đúng convention repo đang dùng (2=Thứ Hai .. 8=Chủ Nhật). Đã kiểm chứng: col 6 → Thứ bảy → 7; col 7 → Chủ nhật → 8.
- **`SessionDate = weekStart.AddDays(colIndex - 1)`** với `weekStart` = ngày thứ Hai parse từ caption.
- **Row index == tiết bắt đầu**, và `rowspan` == số tiết → khớp redundant với text `Tiết: 2-5`.
  Dùng text `Tiết: 2-5` cho chắc (dễ đọc, không phụ thuộc layout).

---

## 3. Ba cạm bẫy đã phát hiện — bắt buộc xử lý

### 3.1. `Week` KHÔNG unique — server luôn trả occurrence đầu tiên

`2026$HKD` có 54 phần tử nhưng chỉ 52 giá trị `Week` phân biệt:

```
Week=52 xuất hiện ở DisPlayWeek 1 VÀ DisPlayWeek 53
Week=1  xuất hiện ở DisPlayWeek 2 VÀ DisPlayWeek 54
```

`2025$HKD` tệ hơn: 81 phần tử, chỉ 52 `Week` phân biệt (29 tuần trùng).

Đo thực tế: `?YearStudy=2026&TermID=HKD&Week=52` → trả `Tuần 1: từ ngày 22/12/2025`, tức **occurrence đầu tiên (D1)**.
Không có cách nào lấy D53 qua endpoint này.

**Xử lý:** loop theo **`Week` phân biệt** (`DistinctBy(x => x.Week)`), không loop theo 54/81 phần tử.
Coi caption date là khoá thật, và dedupe theo `SessionDate` trước khi insert. Các `DisPlayWeek` cuối bị mất
là tuần vắt qua năm học sau — chấp nhận được.

### 3.2. Mapping `Week` → ngày phụ thuộc `TermID`

Không thể tự tính ngày từ `Week` bằng ISO week math:

```
YearStudy=2026 TermID=HKD Week=11  → Tuần 12: 09/03/2026   ← năm 2026
YearStudy=2026 TermID=HKC Week=11  → Tuần 37: 08/03/2027   ← năm 2027!
```

**Xử lý:** **luôn parse ngày từ caption của response.** Tuyệt đối không tự suy ra ngày từ `Week` + `YearStudy`.

### 3.3. ⚠ Tiếng Việt trả về ở dạng Unicode TỔ HỢP (NFD) — phát hiện lúc làm Bước 2

Đây là cạm bẫy nguy hiểm nhất vì **nhìn bằng mắt không thấy**: trình duyệt và console đều render
"Tuần 12" hoàn toàn bình thường. Nhưng dump code point ra thì:

```
"Tuần"  →  0054 0075 00E2 0300 006E   =  T, u, â(U+00E2), COMBINING GRAVE(U+0300), n
```

Chữ "ầ" là **2 code point** (â + dấu huyền rời), không phải U+1EA7 dựng sẵn. Hệ quả:
**mọi so khớp chuỗi có dấu đều trượt trong im lặng** — `"Tuần"`, `"Tiết:"`, `"Giờ học:"`,
`"Hình thức học:"`, `"Ngôn ngữ:"`. Kể cả regex né dấu kiểu `Tu.n` cũng trượt, vì giữa `u` và `n`
có 2 ký tự chứ không phải 1.

**Đã xử lý ở Bước 2:** `GetWeekHtmlAsync` chuẩn hoá `html.Normalize(NormalizationForm.FormC)`
ngay khi đọc response → lớp parse ở Bước 3 nhận text dựng sẵn, regex có dấu chạy bình thường.
Đã verify: sau chuẩn hoá code point thành `0054 0075 1EA7 006E`.

**Bước 3 lưu ý:** không cần normalize lại, nhưng **đừng bỏ** bước này nếu refactor đường fetch.

**Còn nợ — cần kiểm tra khi làm Bước 3/4:** view cũ `DrawingStudentSchedule_Perior` (dùng bởi
`ImportFromHtml` hiện tại) **chưa kiểm tra** có bị NFD không. Nếu có thì parser cũ đang âm thầm
parse thiếu field — có thể là một nguyên nhân nữa khiến TKB sai. `FetchScheduleAsync` hiện **chưa**
normalize (cố ý giữ nguyên hành vi cũ ở Bước 2).

### 3.4. Tuần ngoài danh sách → response KHÔNG có caption

```
YearStudy=2026 TermID=HKG Week=11  → không có dòng "Tuần ...:", chỉ có bảng rỗng (len≈9937)
```

**Xử lý:** không parse được caption → **skip tuần đó**, không throw. Đây cũng là guard tự nhiên cho dữ liệu lạ.

---

## 4. Thiết kế: 1 dòng = 1 buổi học có ngày cụ thể

Đổi ngữ nghĩa `CourseSchedule` từ "1 pattern lặp" sang "1 buổi học tại 1 ngày xác định".

**Điểm mấu chốt để migration an toàn:** set `StartDate = EndDate = SessionDate`. Khi đó filter hiện tại của frontend:

```ts
if (dateNorm < start || dateNorm > end) return false;   // khoảng 1 ngày → chỉ khớp đúng ngày đó
if (c.dayOfWeek && c.dayOfWeek !== day.dow) return false; // luôn đúng vì dayOfWeek suy từ chính ngày đó
```

...cho ra **đúng 1 ngày**. Nghĩa là:
- `GetByMonth` (`CourseScheduleRepository.cs:78-90`, query overlap khoảng ngày) **vẫn đúng, không cần sửa**.
- `CourseWeekCalendar.tsx` / `CourseMonthCalendar.tsx` và bản Angular **vẫn chạy đúng, không cần sửa**.

→ Backend đổi trước, frontend tự hưởng lợi. Endpoint tuần ở Bước 5 chỉ là tối ưu, làm sau cũng được.

Đánh đổi: số dòng tăng (~3 buổi/tuần × ~15 tuần ≈ 45 dòng/kỳ thay vì ~3). Không đáng lo ở quy mô này.

---

## 5. Các bước implement

### ✅ Bước 1 — Model + migration — XONG (17/07/2026)

Đã làm:
- `Model/CourseSchedule.cs` — thêm 10 field bên dưới
- `Dto/CourseScheduleDto.cs` — mirror sang cả 3 class (`CourseScheduleDto`, `CourseScheduleCreateDto`, `CourseScheduleUpdateDto`)
- `Mapper/CourseScheduleMapper.cs` — cập nhật cả `ToDto` / `ToEntity` / `UpdateEntity`
- Migration: `Migrations/20260717065029_AddWeeklyCourseSessionFields.cs` — build pass.
  10 cột **đều nullable, thuần additive** → dữ liệu cũ không vỡ, `db.Database.Migrate()` lúc startup tự apply.

Chưa chạy `dotnet ef database update` — sẽ tự apply khi khởi động API.

`API_Raspberry/API_Raspberry/Model/CourseSchedule.cs` — thêm field (giữ nguyên toàn bộ field cũ):

```csharp
public DateTime? SessionDate { get; set; }   // ngày chính xác của buổi học
public int? WeekOfYear { get; set; }         // = param Week đã gọi
public int? DisplayWeek { get; set; }        // số hiển thị trong caption/dropdown
public int? StartPeriod { get; set; }        // từ "Tiết: 2-5" → 2
public int? EndPeriod { get; set; }          // từ "Tiết: 2-5" → 5
public string ClassCode { get; set; }        // LHP: 26D1INF60900101
public string Lecturer { get; set; }         // GV
public string LecturerEmail { get; set; }    // Email
public string LearningMode { get; set; }     // Hình thức học
public string Language { get; set; }         // Ngôn ngữ
```

Nhớ: `<Nullable>disable</Nullable>` → **không** dùng `string?` hay `!`.

Mirror sang `Dto/CourseScheduleDto.cs` (cả 3 class: `CourseScheduleDto`, `CourseScheduleCreateDto`, `CourseScheduleUpdateDto`)
và `Mapper/CourseScheduleMapper.cs` (`ToDto` / `ToEntity` / `UpdateEntity`).

```bash
cd API_Raspberry/API_Raspberry
dotnet ef migrations add AddWeeklyCourseSessionFields
```

`db.Database.Migrate()` chạy sẵn lúc startup → không cần `database update` thủ công khi deploy.

### ✅ Bước 2 — Service fetch theo tuần — XONG (17/07/2026)

Đã làm:
- `Service/UehStudentScheduleService.cs` — viết lại: tách `LoginAsync()` trả về `UehSession`
  (`HttpClient` + cookie đã login) để **login một lần dùng cho cả ~52 request**.
  Thêm `FetchWeekListAsync` / `FetchWeekScheduleAsync` / `FetchAllWeeksAsync`.
  **Giữ nguyên `FetchScheduleAsync`** → `/FetchUehStudentSchedule` không đổi hành vi.
- `Dto/UehStudentScheduleDto.cs` — thêm `UehWeekDto`, `UehWeekListResponseDto`,
  `UehWeekScheduleResponseDto`, `UehWeekHtmlDto`, `UehAllWeeksResponseDto`.
- Chuẩn hoá Unicode FormC trong `GetWeekHtmlAsync` — xem §3.3, đây là bug ẩn quan trọng.
- Config mới: `UehSchedule:WeekRequestDelayMs` (mặc định 400ms giữa các request).
- Một tuần lỗi → log warning và skip, không làm hỏng cả lần import.

**Đã verify với portal thật** (endpoint tạm, đã gỡ sau khi test):
- Danh sách tuần `2026$HKD`: 54 phần tử, 52 distinct, 3 phần tử đầu `{W52,D1} {W1,D2} {W2,D3}`
  → khớp **chính xác** số đo trên browser.
- HTML từng tuần: len 12444 / 12385 / 9999 cho tuần 11 / 29 / 51 → khớp chính xác browser.
- Caption sau chuẩn hoá: tuần 11→"Tuần 12: 09/03/2026", 29→"Tuần 30: 13/07/2026",
  51→"Tuần 52: 14/12/2026" → khớp ground truth.

**Chưa verify:** `FetchAllWeeksAsync` (vòng lặp ~52 request) chưa chạy end-to-end vì chưa có
endpoint gọi tới. Rủi ro rate-limit của portal **vẫn còn là ẩn số** — sẽ lộ ra ở Bước 4.

**Ghi chú môi trường:** `appsettings.Development.json` có `UehLogin` **rỗng**, ghi đè
`appsettings.json` khi chạy Development → login sẽ báo thiếu credentials dù đã điền
`appsettings.json`. Test local thì set env `UEH_LOGIN_TAIKHOAN` / `UEH_LOGIN_MATKHAU`
(env được ưu tiên trước config).

Nội dung thiết kế gốc giữ lại bên dưới để tham chiếu.

`API_Raspberry/API_Raspberry/Service/UehStudentScheduleService.cs`.

Vấn đề cấu trúc: logic login SSO hiện nằm inline trong `FetchScheduleAsync` và `HttpClient` là biến `using` local
→ không tái sử dụng session được. Cần tách:

```csharp
// private: login xong trả về HttpClient đã có cookie (caller chịu trách nhiệm dispose)
private async Task<(HttpClient client, string token, string error)> LoginAsync(bool saveLogin);

// public — thêm vào IUehStudentScheduleService
Task<UehWeekListResponseDto> FetchWeekListAsync();                       // GET /Home/GetWeek/{year}${term}
Task<UehWeekScheduleResponseDto> FetchWeekScheduleAsync(int year, string termId, int week);
Task<UehAllWeeksResponseDto> FetchAllWeeksAsync();  // login 1 lần → GetWeek → loop DrawingSchedules
```

**Giữ nguyên `FetchScheduleAsync`** để endpoint `/FetchUehStudentSchedule` không vỡ.

`FetchAllWeeksAsync` là hàm chính:
1. `LoginAsync()` một lần, dùng chung `HttpClient` cho toàn bộ request sau.
2. Đọc `SemesterMetadata` có `IsCurrentSemester = true` → `Year` + `CodeSemester`.
3. `GET /Home/GetWeek/{Year}${CodeSemester}` → deserialize `List<UehWeekDto>`.
4. `.DistinctBy(x => x.Week)` (xem §3.1).
5. Loop từng `Week` → `GET /Home/DrawingSchedules?YearStudy=&TermID=&Week=` → gom HTML.
6. **Delay ~300-500ms giữa các request** — một lần chạy là ~52 request; không muốn bị portal rate-limit.
7. Trả về `List<(week, html)>`.

DTO mới trong `Dto/UehStudentScheduleDto.cs`:

```csharp
public class UehWeekDto { public int Week { get; set; } public int DisPlayWeek { get; set; } public int WeekOfYear { get; set; } }
```

Tên field JSON là `DisPlayWeek` (chữ `P` hoa) — dùng `[JsonPropertyName]` hoặc để
`PropertyNameCaseInsensitive = true` cho chắc.

### ✅ Bước 3 — Parser tuần — XONG (17/07/2026)

Đã làm: `Service/CourseScheduleImportService.cs` — thêm `ParseWeekHtml` (hàm **thuần**, không ghi DB,
khác `ImportFromExcel`/`ImportFromHtml` vốn tự gọi `AddRange` bên trong) + `ParseWeekCell`,
`TryGetLabelled`, `SplitNameAndCode`, `HasTrailingCode`, `ParsePeriodRange`, `NormalizeVietnamese`.

**Verify với ground truth tuần 11 (2026/HKD) — khớp 100% mọi field:**

| Ngày | DayOfWeek | Tiết | Giờ | Phòng | Môn |
|---|---|---|---|---|---|
| 15/03/2026 | 8 (CN) | 2-5 | 07:10-10:40 | B2-402 | Thiết kế thông tin và chiến lược nội dung (INF609001) |
| 14/03/2026 | 7 (T7) | 8-11 | 12:45-16:15 | E601 | Triết học (PHI610004) |
| 15/03/2026 | 8 (CN) | 8-11 | 12:45-16:15 | B2-402 | Phương pháp nghiên cứu khoa học (RES602014) |

Tuần 51 (rỗng) → 0 buổi, đúng.

**Hai bug đã bắt được khi verify — cả hai đều thuộc loại lỗi câm:**

1. **Chuẩn hoá Unicode đặt sai tầng** (xem §3.3): ban đầu để ở `GetWeekHtmlAsync` trên HTML thô.
   Chẩn đoán cho thấy `htmlAlreadyFormC=true` nhưng `innerTextIsFormC=false` — portal mã hoá
   3 ký tự có dấu bằng **HTML entity**, `Normalize` không nhìn xuyên qua được (lúc đó chúng còn là
   ASCII `&#...;`), rồi `DeEntitize` giải mã ra dạng tổ hợp trở lại → parse ra **0 buổi/52 tuần**.
   **Quy tắc:** chuẩn hoá ở nơi biến markup thành text, **sau** `DeEntitize` — nay nằm trong
   `GetNodeText` và `ParseWeekHtml`. `UehStudentScheduleService` cố ý **không** normalize nữa.

2. **Nhận diện Phòng theo vị trí là sai**: buổi `LMS` / `ONLINE` / `NGHỈ` **không có phòng**,
   span phòng vắng hẳn → tên học phần bị nuốt vào `Room`, ô bị bỏ. Sửa: nhận theo cấu trúc
   (`HasTrailingCode` — span kết thúc bằng `(Mã)` là tên học phần). Kết quả: 59 → **75 buổi**.

Bug 2 chỉ lộ ra nhờ warning log khi bỏ ô — nếu bỏ im lặng thì đã mất 16 buổi mà không ai biết.
**Đừng đổi các `LogWarning` này thành bỏ qua im lặng.**

Ghi chú: `ParseTimeRange` được nới cho ngoặc thành tuỳ chọn (view tuần trả `07g10->10g40` trần,
view Perior trả `8->11 (12g45->16g15)`). Vẫn bắt buộc dạng `HgMM->HgMM` nên phần "8->11" không khớp nhầm.

### ⬜ Bước 3 (thiết kế gốc, giữ để tham chiếu)

`API_Raspberry/API_Raspberry/Service/CourseScheduleImportService.cs` — thêm method mới,
**giữ nguyên `ImportFromHtml` và `ImportFromExcel`**:

```csharp
List<CourseScheduleCreateDto> ParseWeekHtml(string html, int? semesterMetadataId, int week);
```

Logic (HtmlAgilityPack):

1. **Caption** → regex `Tuần\s*(\d+):\s*từ ngày\s*(\d{2}/\d{2}/\d{4})\s*đến ngày\s*(\d{2}/\d{2}/\d{4})`
   trên `DocumentNode.InnerText`. Không match → `return new List<...>()` (§3.3).
   Group 1 = `DisplayWeek`, group 2 = `weekStart` (parse `dd/MM/yyyy`, `CultureInfo.InvariantCulture`).

2. **Occupancy grid** — bắt buộc để giải rowspan. Không được dùng cellIndex thô: nếu một ô rowspan
   nằm ở cột *trước*, các ô ở dòng sau sẽ bị lệch index. (Trong dữ liệu tuần 11 tình cờ không lệch,
   nhưng nói chung là lệch.)

   ```
   với mỗi row ri:
     col = 0
     với mỗi cell trong row.SelectNodes("td"):
       while (occupied[ri][col]) col++;
       rs = rowspan ?? 1;  cs = colspan ?? 1
       đánh dấu occupied[ri..ri+rs-1][col..col+cs-1] = true
       → col chính là cột thật của cell này
       col += cs        // ⚠ cộng colspan, KHÔNG phải rowspan
   ```

   Bỏ qua `ri == 0` (header) và `col == 0` (cột Tiết).

3. **Với mỗi ô có `div.Content`:**
   - `DayOfWeek = col + 1`
   - `SessionDate = weekStart.AddDays(col - 1)`
   - `StartDate = EndDate = SessionDate`  ← điểm mấu chốt ở §4
   - `WeekOfYear = week` (param đã gọi), `DisplayWeek` = từ caption
   - Duyệt các `span` con:
     - span[0] (không nhãn) → `Room`
     - span[1] (không nhãn) → tách `^(.+?)\s*\(([A-Z]{3}\d+)\)$` → `CourseName` + `CourseCode`
     - `LHP: x` → `ClassCode`
     - `Tiết: 2-5` → `StartPeriod=2`, `EndPeriod=5`
     - `Giờ học: 07g10->10g40` → `StartTime="07:10"`, `EndTime="10:40"` (thay `g` → `:`)
     - `GV:` → `Lecturer`; `Email:` → `LecturerEmail`
     - `Hình thức học:` → `LearningMode`; `Ngôn ngữ:` → `Language`
   - `Address`: view tuần **không có** trường này (view Perior thì có). Để trống, hoặc cân nhắc suy từ `Room`.
     → Cần quyết định lúc implement.

4. **Dedupe** theo `(SessionDate, StartPeriod, CourseCode)` trước khi trả về.

### ✅ Bước 4 — Orchestration — XONG (17/07/2026)

Đã làm:
- **Mới** `Service/CourseScheduleUehSyncService.cs` (`ICourseScheduleUehSyncService.ResetImportByWeekAsync`).
  Controller và `ScheduleImportBackgroundService` **trước đây chép lại logic của nhau** — nay cả hai
  gọi chung service này, nên flow tuần chỉ tồn tại ở một chỗ.
- `Controllers/CourseScheduleController.cs` — `ResetImportCourseScheduleFromUeh` gọi sync service.
  Bỏ được 2 dependency (`ISemesterMetadataService`, `IUehStudentScheduleService`).
  Response thêm `weeksScanned`, `weeksWithData`.
- `Service/ScheduleImportBackgroundService.cs` — dùng chung sync service, gọn hơn hẳn.
- `Service/CourseScheduleService.cs` — thêm `AddRange` (trước chỉ repository có, service thiếu).
- `Dto/CourseScheduleDto.cs` — thêm `CourseScheduleUehSyncResultDto`.
- `Program.cs` — đăng ký `ICourseScheduleUehSyncService`.

**Hai guard an toàn (khác hành vi cũ):**
1. **Chỉ xoá sau khi fetch + parse xong toàn bộ.** Code cũ xoá trước rồi mới import — với ~52 request
   thì portal lỗi giữa chừng là mất sạch TKB.
2. **Không xoá khi parse ra 0 buổi.** Học kỳ rỗng thật thì hiếm; portal đổi layout / session hết hạn
   thì thường xuyên — và khi đó xoá sạch là hỏng nặng hơn giữ dữ liệu cũ. Guard này **đã bắn thật**
   lúc bug chuẩn hoá Unicode còn sống và giữ nguyên được dữ liệu.

**Đã chạy end-to-end thật** (background job, `ScheduleImportJob:Enabled=true`):
`Đồng bộ UEH: 75 buổi học từ 26/52 tuần cho học kỳ 1.`

**Rate-limit: không có vấn đề.** 52 request với delay 400ms chạy trọn, không bị portal chặn.
Ẩn số nêu ở Bước 2 coi như đã giải quyết.

### ⬜ Bước 4 (thiết kế gốc, giữ để tham chiếu)

`Controllers/CourseScheduleController.cs` — `ResetImportCourseScheduleFromUeh` đổi sang flow tuần:

1. Lấy `SemesterMetadata` có `IsCurrentSemester = true`.
2. `FetchAllWeeksAsync()`.
3. Với mỗi `(week, html)` → `ParseWeekHtml(html, semesterId, week)` → gom hết vào 1 list.
4. Skip tuần rỗng (không caption / không ô nào) — bình thường, danh sách `GetWeek` rộng hơn học kỳ thật.
5. `DeleteBySemesterMetadataId(semesterId)`.
6. `AddRange(allDtos)`.
7. Trả `{ message, count, weeksScanned, weeksWithData, semesterMetadataId, yearStudy, termId, data }`.

⚠ **Chỉ xoá sau khi fetch+parse thành công.** Hiện tại xoá trước khi import — nếu portal lỗi giữa chừng
thì mất sạch TKB. Với ~52 request thì rủi ro này thật, không phải giả định.

`Service/ScheduleImportBackgroundService.cs` dùng lại đúng flow này (không đổi config):

```json
"ScheduleImportJob": { "Enabled": true, "IntervalMinutes": 120 }
```

⚠ Cân nhắc nâng `IntervalMinutes` — mỗi lần chạy giờ là ~52 request thay vì 1.

### ✅ Bước 5 — Đọc theo tuần — XONG (17/07/2026)

**Lệch khỏi thiết kế gốc — quan trọng:** plan định làm `GetByWeek(year, week)` lọc theo `WeekOfYear`.
**Bỏ cách đó.** Tuần ISO không unique (tuần 1 của năm học 2026 bắt đầu 29/12/**2025**), nên so khớp
theo `(năm, tuần)` sẽ hụt đúng những tuần vắt giao thừa. Thay bằng:

```
GET /GetCourseScheduleByWeek/{date}      date = ngày bất kỳ trong tuần, dạng yyyy-MM-dd
```

Backend tự quy về thứ Hai và lọc theo **khoảng `SessionDate`** — `SessionDate` mới là sự thật.
Đã verify: truyền 09/03 (T2), 11/03 (T4), 15/03 (**CN**, `getDay()===0`) đều trả cùng 3 buổi.

Đã làm:
- `Repository/CourseScheduleRepository.cs` — `GetByWeek(DateTime anyDateInWeek)`.
  ⚠ Query có **OR cho bản ghi `SessionDate == null`** (import Excel / thêm tay) khớp theo khoảng
  ngày lặp — nếu chỉ lọc `SessionDate.HasValue` thì các môn import từ Excel **biến mất** khỏi lịch tuần.
- `Service/CourseScheduleService.cs`, `Controllers/CourseScheduleController.cs` — theo layer chain.
- Mobile: `models/courseSchedule.model.ts` (+11 field, type `LearningMode`),
  `services/courseScheduleService.ts` (`getCourseScheduleByWeek`),
  `components/CourseWeekCalendar.tsx` — gọi API tuần, lọc theo `sessionDate`, màu/nhãn theo
  `learningMode`, modal chi tiết thêm Tiết / Hình thức học / Giảng viên / Lớp học phần.
- Web: `model/course-schedule.model.ts`, `course-week-calendar.component.{ts,html,scss}` — tương tự.

**Dark mode:** buổi `NGHỈ` lấy màu từ token theme (`var(--color-surface-alt)` / `var(--color-text-muted)`
/ `var(--color-border)` bên Angular; `colors.surfaceAlt` / `colors.textSecondary` / `colors.border`
bên RN) nên mờ đúng ở cả sáng lẫn tối. Buổi học thường vẫn giữ màu riêng theo môn.
`COURSE_COLORS` là màu light hardcode — **vốn đã vậy từ trước**, không thuộc phạm vi thay đổi này.

**Đơn giản hoá được:** cả hai `loadCourses` trước đây phải gọi `GetCourseScheduleByMonth` **hai lần**
rồi ghép + khử trùng khi tuần vắt qua ranh giới tháng. Nay một request.

**Lớp phòng thủ NFC ở frontend:** `normalizedMode()` gọi `.normalize('NFC')` trước khi so `'NGHỈ'`.
Backend đã chuẩn hoá khi import, đây là lớp thứ hai cho dữ liệu cũ — xem §3.3 để hiểu vì sao.

**Kiểm tra:** `npx tsc --noEmit` sạch (exit 0); Angular `bundle generation complete`
(build chỉ fail ở bước inline font Google do sandbox không có mạng, không liên quan).

**Chưa làm — follow-up:** lịch **tháng** (`CourseMonthCalendar`) chưa phân biệt `NGHỈ`.
Vẫn hiển thị đúng ngày (nhờ `StartDate = EndDate = SessionDate`), chỉ là chưa làm mờ buổi nghỉ.

### ⬜ Bước 5 (thiết kế gốc, giữ để tham chiếu — lưu ý phần `WeekOfYear` đã bị thay)

Backend, theo chain chuẩn Controller → Service → Repository:

```
GET /GetCourseScheduleByWeek/{year}/{week}
```

Repository: `List<CourseSchedule> GetByWeek(int year, int week)` — filter
`c.WeekOfYear == week && c.SessionDate.Value.Year == year`, `Include(c => c.SemesterMetadata)`,
`OrderBy(c => c.SessionDate).ThenBy(c => c.StartPeriod)`.

Frontend:
- `Mobile_Raspberry/src/services/courseScheduleService.ts` → thêm `getCourseScheduleByWeek(year, week)`
- `Mobile_Raspberry/src/components/CourseWeekCalendar.tsx` → chuyển sang API tuần
- `CourseMonthCalendar.tsx` giữ `GetByMonth` — vẫn đúng nhờ §4
- Angular tương ứng trong `Front_End_Raspberry/src/app/all-app-component/course-schedule/`

### ⬜ Bước 6 — Docs

- Cập nhật `Information_AI/07_feature-course-schedule-crud.md` (entity fields, import flow, endpoint mới)
- Cập nhật `Information_AI/15_feature-ueh-student-schedule.md` (2 endpoint portal, parsing rules, cạm bẫy §3)
- Cập nhật `.claude/skills/feature-map/references/features.md` (endpoint list)
- Xoá file plan này khi implement xong (nội dung đã chuyển vào 07 + 15)

---

## 6. Ràng buộc dự án cần nhớ

- **Nullable disabled** — không `string?`, không `!`
- **Không có prefix `/api`** — route khai báo trực tiếp trên action method (Caddy strip `/api`)
- **DI bắt buộc** — interface + `AddScoped<>` trong `Program.cs`, không `new`
- **Auth mặc định bật** — global JWT `FallbackPolicy`, endpoint mới tự động cần auth
- **Text tiếng Việt có dấu** cho mọi message user thấy (kể cả message trả từ API)
- **Dark mode** bắt buộc nếu động vào UI — Angular dùng `var(--color-*)`, RN dùng `useTheme()`
- **Mobile**: chạy `npx tsc --noEmit` trước khi kết thúc bất kỳ thay đổi UI nào

## 8. Cần quyết định: buổi "NGHỈ" và "Hình thức học"

Phát hiện khi chạy thật Bước 4. Field `LearningMode` (`Hình thức học`) có ít nhất 4 giá trị:

| Giá trị | Ý nghĩa | Có phòng? |
|---|---|---|
| `TẬP TRUNG` | học tại lớp | có (vd `B2-402`) |
| `ONLINE` | học trực tuyến | không |
| `LMS` | tự học trên LMS | không |
| `NGHỈ` | **buổi nghỉ** | không |

Hiện parser **import tất cả**, giữ nguyên `LearningMode`, không lọc. Lý do: portal vẫn hiển thị
các buổi này trong lưới tuần, và giữ dữ liệu thì UI còn quyền chọn; lọc mất ở tầng import thì hết đường.

**Nhưng buổi `NGHỈ` mà hiện như buổi học bình thường thì chính là kiểu sai mà cả feature này đang sửa.**
Bước 5 cần chốt một trong ba hướng:

- **(a) Hiện tất cả, phân biệt bằng màu/nhãn** — `NGHỈ` xám/gạch ngang, `ONLINE`/`LMS` khác màu.
  Trung thực với portal nhất, và người dùng biết được "hôm nay đáng lẽ có tiết nhưng nghỉ".
- **(b) Ẩn `NGHỈ` ở tầng hiển thị** — lịch sạch, dữ liệu vẫn còn trong DB.
- **(c) Không import `NGHỈ`** — không khuyến khích: mất thông tin vĩnh viễn, và không phân biệt được
  "nghỉ" với "không có tiết".

Khuyến nghị: **(a)**. Nếu chọn (a) thì nhớ ràng buộc dark mode của repo — màu phải lấy từ
`var(--color-*)` (Angular) / `useTheme()` (React Native), không hardcode.

## 7. Cách verify khi implement

1. `POST /ResetImportCourseScheduleFromUeh` → kiểm tra `count` khớp kỳ vọng (~3 buổi/tuần × số tuần có học)
2. Đối chiếu tuần 11 (2026/HKD) với ground truth đã đo:

   | SessionDate | DayOfWeek | Tiết | Giờ | Phòng | Môn |
   |---|---|---|---|---|---|
   | 15/03/2026 (CN) | 8 | 2-5 | 07:10-10:40 | B2-402 | Thiết kế thông tin và chiến lược nội dung (INF609001) |
   | 14/03/2026 (T7) | 7 | 8-11 | 12:45-16:15 | E601 | Triết học (PHI610004) |
   | 15/03/2026 (CN) | 8 | 8-11 | 12:45-16:15 | B2-402 | Phương pháp nghiên cứu khoa học |

3. Mở calendar tuần trên mobile + web, xác nhận đúng ngày, và **verify cả light lẫn dark mode**
4. Kiểm tra tuần nghỉ (không có buổi) hiển thị rỗng chứ không hiện lịch "ma" — đây chính là bug đang sửa
