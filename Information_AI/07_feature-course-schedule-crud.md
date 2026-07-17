# Feature: Course Schedule CRUD

Manages university course schedules with full CRUD, Excel import, manual UEH reset-import, and optional background refresh by semester metadata.

## Data model: one row = one session on a specific date

**This is the most important thing to know about this feature.** As of 17/07/2026, a `CourseSchedule`
row is **one class session on one exact date** (`SessionDate`), not a repeating pattern.

The UEH import used to read the whole-semester "TKB thứ - tiết" view and store each course as a single
row with `StartDate..EndDate` + `DayOfWeek`; the UI then *inferred* "every Thursday in this range has a
class". That silently broke on every week that deviated — holidays, exam weeks, make-up classes,
room changes. The import now reads UEH's **per-week view**, which is the ground truth for each week.

**`StartDate` and `EndDate` are both set equal to `SessionDate`.** This is deliberate: the existing
range-overlap query (`GetByMonth`) and the existing calendar filters (`date within [start,end]` AND
`dayOfWeek` matches) then resolve to exactly one day, so they keep working unchanged.

Rows created by **Excel import or manual add have `SessionDate == null`** and still behave as repeating
patterns. Both shapes coexist — any query or UI filter must handle both. See
`15_feature-ueh-student-schedule.md` for the import mechanics and the portal's traps.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| GET | `/GetAllCourseSchedule` | — | `List<CourseScheduleDto>` |
| GET | `/GetCourseScheduleById/{id}` | — | `CourseScheduleDto` |
| POST | `/AddCourseSchedule` | `CourseScheduleCreateDto` | `bool` |
| PUT | `/UpdateCourseSchedule/{id}` | `CourseScheduleUpdateDto` | `bool` |
| DELETE | `/DeleteCourseSchedule/{id}` | — | `bool` |
| DELETE | `/DeleteBySemesterMetadataId/{semesterMetadataId}` | — | `bool` |
| GET | `/GetCourseScheduleByMonth/{month}/{year}` | — | `List<CourseScheduleDto>` |
| GET | `/GetCourseScheduleByWeek/{date}` | `date` = any date in the week, `yyyy-MM-dd` | `List<CourseScheduleDto>` |
| POST | `/ImportCourseSchedule` | `IFormFile file`, `int? semesterMetadataId` (multipart/form-data) | `{ count, data }` |
| POST | `/ResetImportCourseScheduleFromUeh` | `{ saveLogin?: bool }` (optional JSON body) | `{ message, count, weeksScanned, weeksWithData, semesterMetadataId, yearStudy, termId, data }` |

### Flow

```
CourseScheduleController → ICourseScheduleService → ICourseScheduleRepository → AppDbContext
                         → ICourseScheduleImportService (Excel import / HTML import / week parse)
                         → ICourseScheduleUehSyncService (orchestrates the per-week UEH sync)
                              → IUehStudentScheduleService (UEH SSO login + fetch)
                              → ICourseScheduleImportService.ParseWeekHtml
                              → ICourseScheduleService (delete + AddRange)
                         → ICourseScheduleMapper (DTO ↔ Entity)
```

`ScheduleImportBackgroundService` calls the **same** `ICourseScheduleUehSyncService` as the controller —
the two used to duplicate this logic. Put changes to the sync flow there, not in either caller.

### Key files

- Controller: `API_Raspberry/Controllers/CourseScheduleController.cs`
- Service: `API_Raspberry/Service/CourseScheduleService.cs`
- **UEH sync orchestration**: `API_Raspberry/Service/CourseScheduleUehSyncService.cs`
- Import service: `API_Raspberry/Service/CourseScheduleImportService.cs` — Excel, UEH HTML, and per-week parsing
- UEH fetch service: `API_Raspberry/Service/UehStudentScheduleService.cs`
- Repository: `API_Raspberry/Repository/CourseScheduleRepository.cs`
- Mapper: `API_Raspberry/Mapper/CourseScheduleMapper.cs`
- DTOs: `API_Raspberry/Dto/CourseScheduleDto.cs`
- Model: `API_Raspberry/Model/CourseSchedule.cs`

### Entity fields

- `Id` (int, PK)
- `CourseName` (string, required)
- `CourseCode` (string, required)
- `StartDate` (DateTime?, nullable) — equals `SessionDate` for UEH-imported rows
- `EndDate` (DateTime?, nullable) — equals `SessionDate` for UEH-imported rows
- `StartTime` (string) — e.g., "07:00"
- `EndTime` (string) — e.g., "09:30"
- `Room` (string) — empty for ONLINE/LMS/NGHỈ sessions, which have no room
- `Address` (string) — **not available from the per-week view**; only the Perior view supplies it
- `SemesterMetadataId` (int?, nullable FK -> `semesterMetadata.Id`)
- `DayOfWeek` (int?) — 2=Monday, 3=Tuesday, ..., 8=Sunday
- `CreatedDate` (DateTime?)

Added 17/07/2026 (migration `20260717065029_AddWeeklyCourseSessionFields`, all nullable):

- `SessionDate` (DateTime?) — **exact date of the session**; null for Excel/manual rows
- `WeekOfYear` (int?) — ISO week; equals the `Week` param sent to UEH. **Not unique** — see doc 15
- `DisplayWeek` (int?) — the week number UEH shows in its dropdown; differs from `WeekOfYear`
- `StartPeriod` / `EndPeriod` (int?) — from `Tiết: 2-5`
- `ClassCode` (string) — `LHP: 26D1INF60900101`
- `Lecturer` / `LecturerEmail` (string)
- `LearningMode` (string) — `TẬP TRUNG` | `ONLINE` | `LMS` | **`NGHỈ`** (cancelled session, not a class)
- `Language` (string)

### GetByWeek query logic

Takes **any date in the week** and resolves to that week's Monday..Sunday. It deliberately does *not*
filter on `(year, WeekOfYear)`: ISO weeks are not unique across a semester (week 1 of academic year
2026 starts 29/12/**2025**), so a year+week match drops exactly the weeks that straddle new year.
`SessionDate` is the source of truth.

The query also returns rows with `SessionDate == null` whose `StartDate..EndDate` overlaps the week —
otherwise Excel-imported courses would vanish from the week view. The display layer matches `DayOfWeek`
for those, as it already does for the month view.

DTO response now also includes:
- `SemesterName` (string?)
- `SemesterYear` (int?)

Table name: `CourseSchedule`

### GetByMonth query logic

Returns courses where the course's `[StartDate, EndDate]` range overlaps with the given month. Ordered by `StartTime`.

### Excel import

- Accepts `.xlsx` files only.
- Uses `ClosedXML` library.
- Import is processed by `CourseScheduleImportService.ImportFromExcel()`.
- Supports optional `semesterMetadataId` to tag imported courses.
- Repository has `AddRange()` for batch insert.
- DayOfWeek: maps full Vietnamese weekday names ("Thứ Hai", "Thứ Bảy", ...) → 2–8.

### HTML import from UEH

- Method: `CourseScheduleImportService.ImportFromHtml(scheduleHtml, semesterMetadataId)`.
- Uses `HtmlAgilityPack` to parse the UEH schedule table.
- Handles `rowspan`: when a course has multiple time slots, continuation rows (6 cells) inherit the previous row's course info.
- Parses fields from HTML:
  - **CourseCode**: extracted from `Mã LHP: ...` span, stops at first HTML tag boundary `[^<]+`.
  - **CourseName**: extracted from `Tên HP: ...` span; trailing parenthetical code `(XXXNNNNN)` is stripped.
  - **DayOfWeek**: UEH HTML may omit "Thứ" prefix (e.g., cell contains " Bảy" not "Thứ Bảy") — short forms "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy" are also recognized when `isHtml=true`.
  - **StartTime / EndTime**: parsed from `(HHgMM->HHgMM)` pattern.
  - **StartDate / EndDate**: parsed from `dd/MM/yyyy->dd/MM/yyyy` pattern.
  - **Room**, **Address**: plain cell text.

### Reset import from UEH (`/ResetImportCourseScheduleFromUeh`)

Delegates entirely to `ICourseScheduleUehSyncService.ResetImportByWeekAsync()`:

1. `IUehStudentScheduleService.FetchAllWeeksAsync()` — one SSO login, fetch the week list, then fetch
   each distinct week (~52 requests, ~400ms apart).
2. `ParseWeekHtml()` each week's HTML; empty weeks are normal and skipped.
3. Only **after** everything is parsed: `DeleteBySemesterMetadataId` then `AddRange`.
4. Returns `{ message, count, weeksScanned, weeksWithData, semesterMetadataId, yearStudy, termId, data }`.

**Two safety guards — do not remove them:**

- **Delete happens last.** The old code deleted first and imported second. With ~52 requests, a portal
  failure mid-run would have wiped the whole schedule.
- **Never delete when 0 sessions parsed.** A genuinely empty semester is rare; a portal layout change or
  an expired session is not — and wiping the schedule is far worse than keeping stale data. This guard
  already fired for real during development and saved the data. Use `DeleteBySemesterMetadataId` to
  clear an empty semester deliberately.

Typical real run: `75 sessions from 26/52 weeks`.

### Background refresh job

- Hosted service: `ScheduleImportBackgroundService`
- Registration: `Program.cs` via `AddHostedService<ScheduleImportBackgroundService>()`
- Trigger source: in-app `BackgroundService`, not Linux `crontab`
- Config in `appsettings.json`:

```json
"ScheduleImportJob": {
  "Enabled": true,
  "IntervalMinutes": 120
}
```

- Behavior:
  - waits briefly after app startup
  - finds `SemesterMetadata` where `IsCurrentSemester = true`
  - fetches fresh UEH HTML via `IUehStudentScheduleService`
  - clears current semester courses
  - re-imports them via `ImportFromHtml()`
- If migrating from the old Raspberry Pi cron script, remove the old `crontab` entry so the job does not run twice.

Credentials for UEH login are read in this order:

1. Environment variables `UEH_LOGIN_TAIKHOAN`, `UEH_LOGIN_MATKHAU` (recommended for Raspberry Pi)
2. Fallback to `appsettings.json` / `appsettings.Development.json`

Fallback appsettings shape:
```json
"UehLogin": {
  "TaiKhoan": "",
  "MatKhau": ""
}
```

### Bulk delete

`DeleteBySemesterMetadataId` deletes all courses matching a semester metadata id.

## Angular Web Frontend

### Navigation and route

- Current route: `/settings/course-schedule-settings`
- Access path in UI: top menu `Cài đặt` → left sidebar item `Course Schedule Settings`
- Legacy routes still redirect to the new route:
    - `/course-schedule-settings`
    - `/setting/course-schedule-settings`

### Key files

- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-schedule-list/course-schedule-list.component.ts` — list + CRUD + import
- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-schedule-form/course-schedule-form.component.ts` — add/edit dialog
- `Front_End_Raspberry/src/app/model/course-schedule.model.ts` — model

### List component features

- Loads all courses via `GET /GetAllCourseSchedule`.
- Edit via MatDialog (`CourseScheduleFormComponent`).
- Delete single course with `window.confirm`.
- Excel import: file input + semester dropdown → POST multipart form data.
- **Reset + Import từ UEH** button (`🔄`): calls `POST /ResetImportCourseScheduleFromUeh` — double confirmation, disabled while running, shows result message. Clears current semester courses and re-imports from UEH.
- Bulk delete by semester metadata id with double confirmation.
- `dayOfWeekLabel()` helper: 2→"Thứ 2", 3→"Thứ 3", ..., 8→"CN".

### Form component

- Same pattern as other forms: dialog-based, handles both create and update.
- Semester field is now a dropdown bound to `semesterMetadataId`.
- Direct `HttpClient` usage.

## React Native Mobile

### Key files

- `Mobile_Raspberry/src/screens/CourseScheduleScreen.tsx` — schedule display
- `Mobile_Raspberry/src/services/courseScheduleService.ts` — API wrapper
- `Mobile_Raspberry/src/models/courseSchedule.model.ts` — model
- `Mobile_Raspberry/src/components/CourseWeekCalendar.tsx` — week view
- `Mobile_Raspberry/src/components/CourseMonthCalendar.tsx` — month view

### Service functions

```typescript
getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]>
getCourseScheduleByWeek(anyDateInWeek: Date): Promise<CourseSchedule[]>
```

Only reads are implemented in the mobile service. No create/update/delete/import.

`CourseWeekCalendar` uses `getCourseScheduleByWeek` (one request). It previously called
`getCourseScheduleByMonth` twice and merged when a week straddled two months; the Angular week
calendar had the identical workaround. Both are gone.

### Rendering sessions by `learningMode`

Week calendars (both platforms) show every session and distinguish them rather than hiding any:

- `NGHỈ` → muted background + strikethrough name, using theme tokens
  (`var(--color-surface-alt)` / `var(--color-text-muted)` / `var(--color-border)` in Angular;
  `colors.surfaceAlt` / `colors.textSecondary` / `colors.border` in React Native), so it reads
  correctly in **both light and dark**.
- `ONLINE` / `LMS` → course colour kept, mode shown as the label where the room would be.
- `TẬP TRUNG` → default; no label, room shown.

Month calendars do the same, via `getChipColor`.

Comparisons go through a shared util — `Front_End_Raspberry/src/app/utils/learning-mode.ts` and
`Mobile_Raspberry/src/utils/learningMode.ts` — which calls `.normalize('NFC')` before comparing. See
doc 15 on why Vietnamese from UEH cannot be compared naively. Keep this in the util: inlining it into
components would mean four copies of the same subtle rule (week + month × two platforms).

⚠ **Do not use the `border` token for a cancelled session's colour.** In both calendars the `border`
value is applied to the left border **and** to the time text. `--color-border` (#334155) is identical to
`--color-surface-alt` (#334155) in the dark theme, so the time became invisible. Use `--color-text-muted`
(Angular) / `colors.textSecondary` (React Native).

### Mobile UI

The mobile `CourseScheduleScreen` focuses on **displaying** the schedule (calendar views), not on CRUD management.

### What is missing in mobile

- No add/edit/delete course UI.
- No Excel import.
- No bulk delete.
- CRUD management is web-only.

## Platform comparison

| Aspect | Angular | React Native |
|---|---|---|
| List/table view | Full list with all courses | Calendar views only |
| Create | MatDialog form | Not implemented |
| Update | MatDialog form | Not implemented |
| Delete | Single + bulk by semester metadata id | Not implemented |
| Excel import | File upload with semester dropdown | Not implemented |
| Calendar view | Week and month views | Week and month views |
