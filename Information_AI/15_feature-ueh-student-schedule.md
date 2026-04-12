# Feature: UEH Student Schedule (SSO Login + Schedule Fetch)

Automatically logs in to UEH's student portal via SSO, fetches the student timetable HTML, and optionally imports it directly into the course schedule database.

---

## Backend

### Endpoint

| Method | Route | Body | Returns |
|---|---|---|---|
| POST | `/FetchUehStudentSchedule` | `{ saveLogin?: bool }` (optional) | `UehStudentScheduleResponseDto` |

### Flow

```
UehStudentScheduleController
  → IUehStudentScheduleService.FetchScheduleAsync()
  1. Read credentials from env vars (UEH_LOGIN_TAIKHOAN, UEH_LOGIN_MATKHAU), fallback to appsettings (UehLogin:TaiKhoan, UehLogin:MatKhau)
      2. Read current semester from DB (IsCurrentSemester = true) → YearStudy + TermID
      3. GET https://loginst.ueh.edu.vn/signin → extract __RequestVerificationToken
      4. POST https://loginst.ueh.edu.vn/signin with credentials + token
      5. GET https://student.ueh.edu.vn/Home/DrawingStudentSchedule_Perior?YearStudy={Year}&TermID={CodeSemester}
      6. Return ScheduleHtml (full HTML string)
```

### Key files

- Controller: `API_Raspberry/Controllers/UehStudentScheduleController.cs`
- Service: `API_Raspberry/Service/UehStudentScheduleService.cs`
- DTOs: `API_Raspberry/Dto/UehStudentScheduleDto.cs`

### Configuration

Preferred on Raspberry Pi (systemd service or shell):

```bash
UEH_LOGIN_TAIKHOAN=your_student_id
UEH_LOGIN_MATKHAU=your_password
```

Fallback (if env vars are missing) in `appsettings.json` / `appsettings.Development.json`:

```json
"UehLogin": {
  "TaiKhoan": "",
  "MatKhau": ""
}
```

- **Do not commit real credentials.** Keep secrets in environment variables on the deployed Raspberry Pi.
- `SaveLogin` defaults to `true` if not provided in request body.

### Response DTO

```csharp
public class UehStudentScheduleResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public int? YearStudy { get; set; }       // from SemesterMetadata.Year
    public string TermId { get; set; }         // from SemesterMetadata.CodeSemester
    public string LoginPageToken { get; set; } // __RequestVerificationToken extracted
    public string ScheduleHtml { get; set; }   // full HTML content from UEH
}
```

### Error cases

| Condition | Message |
|---|---|
| Missing credentials in env + appsettings | `Thiếu thông tin đăng nhập UEH. Hãy set UEH_LOGIN_TAIKHOAN/UEH_LOGIN_MATKHAU hoặc cấu hình UehLogin trong appsettings.` |
| No current semester in DB | `Không tìm thấy SemesterMetadata có IsCurrentSemester = true.` |
| Login page unreachable | `Không tải được trang login. Status: NNN` |
| Token not found in login page HTML | `Không lấy được __RequestVerificationToken từ trang login.` |
| Login POST fails | `Login thất bại. Status: NNN` |
| Schedule fetch fails | `Gọi API lịch học thất bại. Status: NNN` |

---

## HTML parsing (used by import flow)

The HTML returned by UEH contains a `<table>` with the following column structure:

| Index | Column | Notes |
|---|---|---|
| 0 | STT | Row number (rowspan for multi-slot courses) |
| 1 | Mã LHP / Tên HP / CBGD | Course info (rowspan) |
| 2 | Số TC | Credits (rowspan) |
| 3 | Mã lớp | Class code (rowspan) |
| 4 | Thứ | Day of week |
| 5 | Tiết bắt đầu | Time slot |
| 6 | Phòng | Room |
| 7 | Tuần | Date range |
| 8 | Cơ sở | Campus |
| 9 | Địa chỉ | Address |

### Parsing rules

- **Course info cell** (column 1): contains multiple `<span>` tags. Value for each field stops at the next HTML tag (`[^<]+` regex against InnerHtml).
  - `Mã LHP: <value>` → CourseCode
  - `Tên HP: <value>` → CourseName (trailing parenthetical code like `(DAT609002)` is stripped)
- **Rowspan handling**: when `cells.Count >= 10` → full row with course info; when `cells.Count == 6` → continuation row reusing previous course info.
- **DayOfWeek** (HTML mode): UEH may render "Thứ Bảy" as just `" Bảy"`. Short forms without "Thứ" prefix are recognized: `Hai`, `Ba`, `Tư`, `Năm`, `Sáu`, `Bảy` (only in HTML flow — Excel requires full form).
- **Time**: `8->11 (12g45->16g15)` → `"12:45"` / `"16:15"`.
- **Date range**: `04/07/2026->26/09/2026)` → parsed as `dd/MM/yyyy`.

### DayOfWeek mapping

| Value | Meaning |
|---|---|
| 2 | Thứ Hai (Monday) |
| 3 | Thứ Ba (Tuesday) |
| 4 | Thứ Tư (Wednesday) |
| 5 | Thứ Năm (Thursday) |
| 6 | Thứ Sáu (Friday) |
| 7 | Thứ Bảy (Saturday) |
| 8 | Chủ Nhật (Sunday) |

---

## Integration with Course Schedule Reset

`POST /ResetImportCourseScheduleFromUeh` (in `CourseScheduleController`) combines this service with the import flow:

1. Fetch current semester from DB.
2. Call `IUehStudentScheduleService.FetchScheduleAsync()`.
3. Delete all courses for current semester (`DeleteBySemesterMetadataId`).
4. Call `ICourseScheduleImportService.ImportFromHtml(html, semesterMetadataId)`.
5. Return result with count and imported data.

See `07_feature-course-schedule-crud.md` for the full course schedule feature documentation.

---

## Keywords

ueh, login, sso, schedule, lịch học, student portal, html import, fetch, timetable, scraping
