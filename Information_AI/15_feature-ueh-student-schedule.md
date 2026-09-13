# Feature: UEH Student Schedule (SSO Login + Schedule Fetch)

Logs in to UEH's student portal via SSO and fetches the student timetable. The **per-week** fetch is the
one that matters — it feeds the course schedule import. See `07_feature-course-schedule-crud.md` for how
the data is stored and shown.

> **Read §"Three traps" below before touching the parser.** All three are silent-failure bugs; two of
> them already shipped once during development and produced *zero* parse errors while losing data.

---

## Backend

### Endpoint

| Method | Route | Body | Returns |
|---|---|---|---|
| POST | `/FetchUehStudentSchedule` | `{ saveLogin?: bool }` (optional) | `UehStudentScheduleResponseDto` |

This endpoint still uses the legacy whole-semester view. The per-week fetch has no endpoint of its own —
it is driven by `ICourseScheduleUehSyncService` (see doc 07).

### Service surface (`IUehStudentScheduleService`)

| Method | Portal call |
|---|---|
| `FetchScheduleAsync` | `DrawingStudentSchedule_Perior` — whole semester, legacy |
| `FetchWeekListAsync` | `GetWeek` — list of weeks |
| `FetchWeekScheduleAsync` | `DrawingSchedules` — one week |
| `FetchAllWeeksAsync` | login once → `GetWeek` → loop `DrawingSchedules` over **distinct** weeks, for **one** semester |
| `GetSemestersToSyncAsync` | no portal call — reads `SemesterMetadatas` where `IsCurrentSemester = true`, **multiple rows allowed** |
| `FetchAllWeeksForSemestersAsync` | login once → loop `GetWeek`+`DrawingSchedules` over **every semester passed in** |

`LoginAsync` is private and returns a `UehSession` (an `HttpClient` carrying the auth cookie) so a
single login serves all requests across **all** selected semesters, not just one. A failing week logs
a warning and is skipped rather than failing the whole run; a failing semester behaves the same way one
level up (see "Multi-semester sync" below).

`FetchAllWeeksAsync(request)` keeps its old signature and behavior for backward compatibility: it
internally calls the private `GetCurrentSemesterAsync()` (`FirstOrDefault` ordered by `Id` descending),
which — now that multiple rows can have `IsCurrentSemester = true` — picks **an arbitrary one** of them.
It is only used by the legacy debug endpoints (`FetchScheduleAsync`, `FetchWeekListAsync`,
`FetchWeekScheduleAsync`, and `FetchAllWeeksAsync` itself, `API_Raspberry/Service/UehStudentScheduleService.cs:67-73,290-318`).
**None of these are used by the main sync flow anymore** — that flow always calls
`FetchAllWeeksForSemestersAsync` with the full list from `GetSemestersToSyncAsync()`.

### Multi-semester sync

`GetSemestersToSyncAsync()` (`UehStudentScheduleService.cs:75-82`) returns every `SemesterMetadata` row
with `IsCurrentSemester = true` — the flag is no longer "the one current semester" but "sync this
semester from UEH", and several rows can be true at once (see `13_feature-semester-metadata-crud.md`).

`FetchAllWeeksForSemestersAsync(semesters, request)` (`UehStudentScheduleService.cs:320-348`) logs in
**once**, then loops the semester list calling the same per-semester fetch
(`FetchAllWeeksForSemesterAsync`) used by the legacy single-semester path. One semester failing (portal
has no data for it, session drops mid-run, etc.) does not abort the batch — its error is recorded in that
semester's result and the loop continues to the next semester, mirroring the existing "one bad week
doesn't fail the whole run" rule, applied one level up.

⚠ **Request volume multiplies by the number of semesters selected.** Each semester still costs up to
~52 portal requests (one `GetWeek` + one `DrawingSchedules` per distinct week); marking 3 semesters
`IsCurrentSemester = true` means ~156 requests in one run instead of ~52. There is a delay between weeks
(`UehSchedule:WeekRequestDelayMs`, default 400ms) **and** a delay between semesters
(`UehSchedule:SemesterRequestDelayMs`, default 2000ms, added after the last week of one semester and
before the first request of the next) — both configurable in the same `UehSchedule` config section.

### Flow

```
1. Read credentials: env vars (UEH_LOGIN_TAIKHOAN, UEH_LOGIN_MATKHAU) → fallback appsettings (UehLogin:*)
2. Read current semester from DB (IsCurrentSemester = true) → YearStudy + TermID (= CodeSemester)
3. GET  https://loginst.ueh.edu.vn/signin → extract __RequestVerificationToken
4. POST https://loginst.ueh.edu.vn/signin with credentials + token
5. GET  https://student.ueh.edu.vn/Home/GetWeek/{YearStudy}${TermID}          → JSON week list
6. GET  https://student.ueh.edu.vn/Home/DrawingSchedules?YearStudy=&TermID=&Week=   → HTML per week
```

### Portal endpoints

**Week list** — returns clean JSON, not HTML:

```
GET /Home/GetWeek/2026$HKD
→ [{"Week":52,"DisPlayWeek":1,"WeekOfYear":29}, {"Week":11,"DisPlayWeek":12,"WeekOfYear":29}, ...]
```

| Field | Meaning |
|---|---|
| `Week` | ISO week of the calendar year — **this is the `Week` param** for `DrawingSchedules`. Not unique (trap 1) |
| `DisPlayWeek` | the number the portal shows in its dropdown; a year-wide index that does not reset per term |
| `WeekOfYear` | the *current* ISO week; constant for every element. The portal uses it to pick a default. **Unused by the import** |

The `$` in the route is a literal separator, not an escape. `TermID` ∈ `HKD` | `HKG` | `HKC`
(matches `SemesterMetadata.CodeSemester`). List size varies by year *and* term: `2026$HKD` → 54 entries,
`2026$HKG` → 15 (starting at `DisPlayWeek` 21, not 1), `2026$HKC` → 41, `2025$HKD` → 81.

**Week schedule** — HTML fragment. The `t=<random>` param the portal sends is only a cache-buster and is
not required. First line is the ground truth for dates:

```
Tuần 12: từ ngày 09/03/2026 đến ngày 15/03/2026
```

The number in the caption is `DisPlayWeek` (12), **not** the `Week` param (11). The table has 8 columns:
column 0 = Tiết, columns 1..7 = Thứ hai..Chủ nhật → **`DayOfWeek = column + 1`** (2..8, matching the
existing convention). A session cell carries `rowspan` = number of periods.

### Cell structure

`<td rowspan="4"><div class="Content">` with `<span>`s separated by `<br>`:

```
B2-402                                                  ← Room — NO label, and ABSENT for ONLINE/LMS/NGHỈ
Thiết kế thông tin và chiến lược nội dung (INF609001)    ← Name (Code) — NO label
LHP: 26D1INF60900101
Số tiết: 4          ← ignored, derivable from "Tiết"
Tiết: 2-5
Giờ học: 07g10->10g40
GV: TS.Ngô Tấn Vũ Khanh
Email: khanhntv@ueh.edu.vn
Hình thức học: TẬP TRUNG
Ngôn ngữ: Tiếng Việt
```

Richer than the Perior view: it has periods, lecturer, email, learning mode, and language. It does
**not** have campus/address.

### Key files

- Controller: `API_Raspberry/Controllers/UehStudentScheduleController.cs`
- Service: `API_Raspberry/Service/UehStudentScheduleService.cs`
- Sync orchestration: `API_Raspberry/Service/CourseScheduleUehSyncService.cs`
- Week parsing: `API_Raspberry/Service/CourseScheduleImportService.cs` → `ParseWeekHtml`
- DTOs: `API_Raspberry/Dto/UehStudentScheduleDto.cs`

### Configuration

```json
"UehSchedule": { "WeekRequestDelayMs": 400, "SemesterRequestDelayMs": 2000 }
```

`WeekRequestDelayMs` — delay between week requests within one semester; defaults to 400ms if absent. A
full run (52 requests at 400ms) has been verified against the live portal with no rate limiting.

`SemesterRequestDelayMs` — extra delay applied between semesters when syncing more than one in the same
run; defaults to 2000ms if absent. Not strictly required for rate-limiting (the sync runs in the
background, rarely triggered manually), but cheap enough to keep as a safety margin.

⚠ `appsettings.Development.json` carries its own `UehLogin` block. An empty one there **overrides**
`appsettings.json` when running Development, producing "Thiếu thông tin đăng nhập UEH" even though
`appsettings.json` looks correct. Env vars take precedence over both.

---

## Three traps (all silent — no exception, no parse error)

### 1. `Week` is not unique; the portal returns the first occurrence

`2026$HKD` has 54 entries but only **52 distinct** `Week` values — a semester straddling new year repeats
them (`Week=52` appears at `DisPlayWeek` 1 *and* 53). `2025$HKD` is worse: 81 entries, 52 distinct.

Verified: `?YearStudy=2026&TermID=HKD&Week=52` → `Tuần 1: từ ngày 22/12/2025`, i.e. the **first**
occurrence. The later one is unreachable through this endpoint.

**Therefore:** loop over `.Distinct()` weeks — duplicates cost a request and return nothing new. Treat the
caption date as the key. Never store or query by `(year, WeekOfYear)` alone; `SessionDate` is the truth.

### 2. `Week` → date depends on `TermID`; never compute it yourself

```
YearStudy=2026 TermID=HKD Week=11  → Tuần 12: 09/03/2026     ← 2026
YearStudy=2026 TermID=HKC Week=11  → Tuần 37: 08/03/2027     ← 2027!
```

ISO-week arithmetic cannot reproduce this. **Always parse the date out of the response caption.**

A week outside the term's list (e.g. `2026/HKG/Week=11`) returns a table with **no caption** — that is
the signal to skip the week, not an error.

### 3. Vietnamese arrives as decomposed Unicode — normalize AFTER `DeEntitize`

The portal returns `"ầ"` as **U+00E2 + U+0300** (2 code points), not the precomposed U+1EA7. Browsers and
consoles render it identically, so **this is invisible to inspection**. Every accented string comparison
silently misses: `"Tuần"`, `"Tiết:"`, `"Giờ học:"`, `"Hình thức học:"`, `"Thứ Hai"`. Even a diacritic-free
regex like `Tu.n` fails, because there are two characters between `u` and `n`, not one.

**Normalizing the raw HTML does not work.** The portal also encodes some accents as **HTML entities**;
while they are still `&#...;` text, `Normalize` cannot see them, and `DeEntitize` then decodes them back
into decomposed form. This exact mistake made the parser return **0 sessions from 52 weeks** while
reporting success.

Diagnostic that pinned it — note how the raw HTML passes and the extracted text fails:

```
htmlAlreadyFormC             : true
innerTextIsFormC             : false      ← decomposed
captionMatchesOnDeEntitized  : false
captionMatchesAfterNormalize : true       ← the fix
```

**The rule: normalize where markup becomes text, after `DeEntitize`.** In this codebase that is
`CourseScheduleImportService.NormalizeVietnamese`, called from `GetNodeText` and `ParseWeekHtml`.
`UehStudentScheduleService` deliberately does **not** normalize; there is a comment there saying so.
Frontends normalize again with `.normalize('NFC')` before comparing `learningMode`.

---

## Week HTML parsing (`ParseWeekHtml`)

Pure function — unlike `ImportFromExcel`/`ImportFromHtml`, it does **not** write to the DB. The caller
gathers every week first, then deletes and inserts once (see doc 07's safety guards).

1. **Caption** → regex on `DeEntitize`d + FormC-normalized `InnerText`. No match → return empty (trap 2).
   Group 1 = `DisplayWeek`, group 2 = `weekStart` (`dd/MM/yyyy`, InvariantCulture).
2. **Occupancy grid** to resolve `rowspan`/`colspan`. Raw cell indices are **not** usable: a `rowspan`
   cell in an earlier column shifts the indices of cells on the rows it covers. Advance the cursor by
   **colspan**, and mark `rowspan × colspan` occupied.
3. Per cell with `div.Content`: `DayOfWeek = col + 1`, `SessionDate = weekStart.AddDays(col - 1)`, and
   `StartDate = EndDate = SessionDate`.
4. **Room vs course name is decided by structure, not position.** ONLINE/LMS/NGHỈ sessions have no room,
   so the room span is simply missing; assuming "first unlabelled span = room" swallows the course name
   and drops the cell. `HasTrailingCode` (span ends in `(CODE)`) identifies the name span instead.
   This bug cost 16 sessions (59 → 75) and was only visible via the skip warning.
5. Labels are matched against a **fixed whitelist**, not a generic `x: y` pattern — a course name may
   contain a colon.
6. Dedupe on `(SessionDate, StartPeriod, CourseCode)`.

`CourseName`/`CourseCode` are `[Required]`; a cell missing either is skipped **with a `LogWarning`**.
Keep it that way — that warning is what exposed trap-adjacent bug #4 above.

### `Hình thức học` values

| Value | Meaning | Room? |
|---|---|---|
| `TẬP TRUNG` | in-person | yes |
| `ONLINE` | online | no |
| `LMS` | self-study on LMS | no |
| `NGHỈ` | **cancelled session** | no |

All are imported; the UI distinguishes them (doc 07). Filtering at import would be irreversible and
would lose the difference between "cancelled" and "no class".

### `ParseTimeRange`

Shared with the Excel/Perior flows. Parentheses were made optional so it handles both
`8->11 (12g45->16g15)` (Perior) and bare `07g10->10g40` (week view). It still requires the `HgMM->HgMM`
shape, so the leading `8->11` period range cannot match by accident.

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

## Legacy: Perior view HTML parsing (`ImportFromHtml`)

> Used only by `FetchScheduleAsync` / `/FetchUehStudentSchedule`. **The course schedule import no longer
> goes through here** — it uses `ParseWeekHtml` above. Kept because the endpoint still exists.
>
> Not checked: whether the Perior view also serves decomposed Unicode (trap 3). It plausibly does, in
> which case this parser has been silently losing accented fields all along. `GetNodeText` now normalizes,
> which fixes it either way.

The HTML returned by the Perior view contains a `<table>` with the following column structure:

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

`POST /ResetImportCourseScheduleFromUeh` and the Hangfire recurring job `ScheduleImportJob` both delegate to
`ICourseScheduleUehSyncService.ResetImportByWeekAsync()` — they used to duplicate the logic between them.
Change the sync flow there, not in either caller. Full description and the two safety guards:
`07_feature-course-schedule-crud.md`.

**It now syncs every semester with `IsCurrentSemester = true`, not just one.** `ResetImportByWeekAsync`
(`API_Raspberry/Service/CourseScheduleUehSyncService.cs:34-73`):

1. `GetSemestersToSyncAsync()` → if empty, returns a failure with message
   `"Không có học kỳ nào được đánh dấu đồng bộ (IsCurrentSemester = true)."` (no portal call made).
2. `FetchAllWeeksForSemestersAsync(semesters, request)` — logs in once, fetches all weeks for every
   semester in the list.
3. Each semester's fetched weeks are parsed, deduped, and imported independently via `ImportOneSemester`
   (`CourseScheduleUehSyncService.cs:77-153`) — the two existing safety guards still apply **per
   semester**: no delete when zero sessions parse, and delete only happens after that semester's weeks are
   fully fetched and parsed. `DeleteBySemesterMetadataId` only removes rows for that one
   `SemesterMetadataId`, so looping semesters never touches another semester's already-imported data.

### Response shape (`CourseScheduleUehSyncResultDto`)

```csharp
public class CourseScheduleUehSyncResultDto
{
    public bool Success { get; set; }      // true if AT LEAST ONE semester synced successfully
    public string Message { get; set; }    // aggregate, e.g. "Đồng bộ 3/4 học kỳ thành công, tổng 210 buổi học."
    public int Count { get; set; }         // total sessions imported across ALL semesters
    public List<CourseScheduleUehSyncSemesterResultDto> Semesters { get; set; }
}

public class CourseScheduleUehSyncSemesterResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public int Count { get; set; }
    public int SemesterMetadataId { get; set; }
    public int? YearStudy { get; set; }
    public string TermId { get; set; }
    public int WeeksScanned { get; set; }
    public int WeeksWithData { get; set; }
}
```

(`API_Raspberry/Dto/CourseScheduleDto.cs:6-31`.) The old top-level `Success`/`Message`/`Count` fields are
kept as-is so the frontend (`course-schedule-list.component.ts:164`, which only reads `count`/`message`)
doesn't break; `Semesters` is new, and the raw parsed list (`Data`) was **deliberately not added** to the
response — it isn't consumed anywhere and would bloat the payload once multiplied by N semesters.

`Success` at the top level is `true` if **at least one** semester succeeded, not all of them — a single
semester failing (temporary portal hiccup, expired session mid-run) would otherwise cause Hangfire's
`[AutomaticRetry]` to re-run the whole batch, including semesters that already succeeded, wasting portal
requests for no gain.

Runtime configuration (runs on Hangfire — see `23_feature-hangfire-jobs.md`):

```json
"HangfireJobs": {
  "ScheduleImportCron": "0 * * * *"
}
```

- `ScheduleImportCron`: cron for the automatic refresh (replaced the old `Enabled`/`IntervalMinutes`).
  This appsettings value is now only the **fallback** — see below for the System Configuration override.
- On-demand trigger: `POST /Jobs/Trigger/schedule-import`, or "Chạy ngay" on `/app/settings/jobs-settings`
- ⚠ Each run is now **~52 portal requests per selected semester**, not ~52 total. Verified fine at 400ms
  (week) / 2000ms (semester) spacing, but consider a longer cron interval than the old default the more
  semesters get flagged for sync.
- Recommended migration step: remove any old Raspberry Pi `crontab` entry for `reset_schedule.sh` to avoid duplicate imports

### Cron override via System Configuration

`Program.cs` reads the cron expression for `ScheduleImportRecurringId` in this priority order at
**app startup only**: **System Configuration row (`KeyConfig = "ScheduleImportCron"`) → appsettings
`HangfireJobs:ScheduleImportCron` → hardcoded `Cron.Hourly()`**. Add/edit the row through the existing
Settings UI at `/settings/system-configuration-settings` — no new UI needed.

- The override is validated by attempting `recurringJobManager.AddOrUpdate` with it before committing to
  it; if Hangfire throws (bad cron syntax), the app logs a warning and falls back to the
  appsettings/default value instead of crashing at startup. (`Cronos.CronExpression`, the type that would
  otherwise validate this directly, is internal inside `Hangfire.Core 1.8.21`, so it can't be called
  directly — validating via a real `AddOrUpdate` call is the only way to catch a bad expression before it
  takes effect.)
- **Changing the value only takes effect after an app restart** — there is no runtime reload; the
  recurring job registration happens once during `Program.cs` startup.
- Full behavior and caveats of the System Configuration table itself: `14_feature-system-configuration-crud.md`.

See `07_feature-course-schedule-crud.md` for the full course schedule feature documentation.

---

## Keywords

ueh, login, sso, schedule, lịch học, student portal, html import, fetch, timetable, scraping, week,
tuần, GetWeek, DrawingSchedules, unicode, NFC, decomposed, NGHỈ, learning mode, multi-semester sync,
đồng bộ nhiều học kỳ, IsCurrentSemester, ScheduleImportCron, System Configuration override
