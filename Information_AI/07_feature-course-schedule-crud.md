# Feature: Course Schedule CRUD

Manages university course schedules with full CRUD, Excel import, and bulk delete by semester metadata.

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
| POST | `/ImportCourseSchedule` | `IFormFile file`, `int? semesterMetadataId` (multipart/form-data) | `{ count, data }` |
| POST | `/ResetImportCourseScheduleFromUeh` | `{ saveLogin?: bool }` (optional JSON body) | `{ message, count, semesterMetadataId, yearStudy, termId, data }` |

### Flow

```
CourseScheduleController → ICourseScheduleService → ICourseScheduleRepository → AppDbContext
                         → ICourseScheduleImportService (Excel import / HTML import)
                         → IUehStudentScheduleService (UEH SSO login + schedule fetch)
                         → ICourseScheduleMapper (DTO ↔ Entity)
```

### Key files

- Controller: `API_Raspberry/Controllers/CourseScheduleController.cs`
- Service: `API_Raspberry/Service/CourseScheduleService.cs`
- Import service: `API_Raspberry/Service/CourseScheduleImportService.cs` — handles both Excel and UEH HTML import
- UEH fetch service: `API_Raspberry/Service/UehStudentScheduleService.cs`
- Repository: `API_Raspberry/Repository/CourseScheduleRepository.cs`
- Mapper: `API_Raspberry/Mapper/CourseScheduleMapper.cs`
- DTOs: `API_Raspberry/Dto/CourseScheduleDto.cs`
- Model: `API_Raspberry/Model/CourseSchedule.cs`

### Entity fields

- `Id` (int, PK)
- `CourseName` (string, required)
- `CourseCode` (string, required)
- `StartDate` (DateTime?, nullable)
- `EndDate` (DateTime?, nullable)
- `StartTime` (string) — e.g., "07:00"
- `EndTime` (string) — e.g., "09:30"
- `Room` (string)
- `Address` (string)
- `SemesterMetadataId` (int?, nullable FK -> `semesterMetadata.Id`)
- `DayOfWeek` (int?) — 2=Monday, 3=Tuesday, ..., 8=Sunday
- `CreatedDate` (DateTime?)

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

1. Looks up the SemesterMetadata where `IsCurrentSemester = true`.
2. Calls `IUehStudentScheduleService.FetchScheduleAsync()` to login UEH SSO and get schedule HTML.
3. Deletes all existing courses for the current semester (`DeleteBySemesterMetadataId`).
4. Calls `ImportFromHtml()` to parse and re-insert from fresh HTML.
5. Returns count, semesterMetadataId, yearStudy, termId, data.

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
```

Only read-by-month is implemented in mobile service. No create/update/delete/import.

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
