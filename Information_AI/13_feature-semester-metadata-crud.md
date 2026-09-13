# Feature: Semester Metadata CRUD

Settings feature to manage semester metadata and flag the current semester.
Semester metadata is also referenced by course schedules through `SemesterMetadataId`.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | /SemesterMetadata | SemesterMetadataCreateDto | bool |
| GET | /GetAllSemesterMetadata | - | List<SemesterMetadataDto> |
| GET | /GetSemesterMetadataById/{id} | - | SemesterMetadataDto |
| PUT | /UpdateSemesterMetadataById/{id} | SemesterMetadataUpdateDto | bool |
| DELETE | /DeleteSemesterMetadataById/{id} | - | bool |

### Flow

SemesterMetadataController -> ISemesterMetadataService -> ISemesterMetadataRepository -> AppDbContext
                                                             -> ISemesterMetadataMapper (DTO <-> Entity)

### Key files

- Controller: API_Raspberry/Controllers/SemesterMetadataController.cs
- Service: API_Raspberry/Service/SemesterMetadataService.cs
- Repository: API_Raspberry/Repository/SemesterMetadataRepository.cs
- Mapper: API_Raspberry/Mapper/SemesterMetadataMapper.cs
- DTOs: API_Raspberry/Dto/SemesterMetadataDto.cs
- Model: API_Raspberry/Model/SemesterMetadata.cs

### Entity fields

- Id (int, PK, auto increment)
- SemesterName (nvarchar/string, required)
- CodeSemester (nvarchar/string, required)
- Year (int, required)
- IsCurrentSemester (bit/bool)

Table name: semesterMetadata

## Angular Web Frontend

### Navigation and route

- Current route: /settings/semester-settings
- Access path in UI: top menu Cai dat -> left sidebar item Semester Settings
- Legacy routes still redirect to the new route:
  - /semester-settings
  - /setting/semester-settings

### Key files

- Front_End_Raspberry/src/app/all-app-component/semester-metadata/semester-metadata-list/semester-metadata-list.component.ts
- Front_End_Raspberry/src/app/all-app-component/semester-metadata/semester-metadata-form/semester-metadata-form.component.ts
- Front_End_Raspberry/src/app/model/semester-metadata.model.ts

### Pattern

- List component loads all semester rows via GET /GetAllSemesterMetadata.
- Edit dialog opened via MatDialog with SemesterMetadataFormComponent.
- Form handles both create and update:
  - If data.id > 0 -> load existing, submit PUT
  - If data.id === 0 -> create new, submit POST
- Delete handled in list with DELETE /DeleteSemesterMetadataById/{id}.
- Direct HttpClient usage in components, consistent with existing Angular settings features.

### Form fields

- Semester name (required)
- Semester code (required)
- Year (required)
- Đồng bộ học kỳ này từ UEH (boolean) — key `semester.isCurrent`, field name `isCurrentSemester`

### `IsCurrentSemester` — meaning changed: no longer "the one current semester"

`IsCurrentSemester` is **not** a "there can be only one" flag anymore. It now means "sync this semester
from UEH" — **multiple rows can have `IsCurrentSemester = true` at the same time**, e.g. current semester
+ an upcoming one both flagged for sync. See `15_feature-ueh-student-schedule.md` for how the sync job
consumes this flag (`GetSemestersToSyncAsync()` returns every row where it's `true`, not just the first).

Backend never enforced a uniqueness constraint on this field — it only ever accepted the payload as-is.
The previous "only one current semester" behavior existed **only** as an Angular-side check:
`semester-metadata-form.component.ts` used to block submit via `hasAnotherCurrentSemester()` when another
row was already `true`. **That check and the method have been removed** — ticking the box for a second
(or third) row while another is already ticked no longer blocks submit.

UI labels reflect the new meaning:

| Where | vi | en |
|---|---|---|
| Form checkbox (`semester.isCurrent`) | "Đồng bộ học kỳ này từ UEH" | "Sync this semester from UEH" |
| List badge, true (`semester.current`) | "Đang đồng bộ" | "Syncing" |
| List badge, false (`semester.notCurrent`) | "Không" | "No" |

The old i18n key `semester.onlyOneCurrent` (and its blocking-submit message) no longer exists.

## React Native Mobile

- No changes in this feature iteration.
- Semester Metadata CRUD is implemented only for Angular web settings.

## Integration with Course Schedule

- `CourseSchedule` now stores `SemesterMetadataId` (nullable) instead of a raw semester string.
- Course Schedule API responses include `SemesterName` and `SemesterYear` for UI display.
