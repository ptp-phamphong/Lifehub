# Feature: System Configuration CRUD

Settings feature for managing key-value configuration used in special cases.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | /SystemConfiguration | SystemConfigurationCreateDto | bool |
| GET | /GetAllSystemConfiguration | - | List<SystemConfigurationDto> |
| GET | /GetSystemConfigurationById/{id} | - | SystemConfigurationDto |
| PUT | /UpdateSystemConfigurationById/{id} | SystemConfigurationUpdateDto | bool |
| DELETE | /DeleteSystemConfigurationById/{id} | - | bool |

### Flow

SystemConfigurationController -> ISystemConfigurationService -> ISystemConfigurationRepository -> AppDbContext
                                                                    -> ISystemConfigurationMapper (DTO <-> Entity)

### Key files

- Controller: API_Raspberry/Controllers/SystemConfigurationController.cs
- Service: API_Raspberry/Service/SystemConfigurationService.cs
- Repository: API_Raspberry/Repository/SystemConfigurationRepository.cs
- Mapper: API_Raspberry/Mapper/SystemConfigurationMapper.cs
- DTOs: API_Raspberry/Dto/SystemConfigurationDto.cs
- Model: API_Raspberry/Model/SystemConfiguration.cs
- EF migration: API_Raspberry/Migrations/20260411145405_AddSystemConfigurationTable.cs

### Entity fields

- Id (int, PK, auto increment)
- KeyConfig (nvarchar/string, required)
- ValueConfig (nvarchar/string, required)

Table name: systemConfiguration

## Angular Web Frontend

### Navigation and route

- Current route: /settings/system-configuration-settings
- Access path in UI: top menu Cai dat -> left sidebar item Cau hinh dac biet
- Legacy routes still redirect to the new route:
  - /system-configuration-settings
  - /setting/system-configuration-settings

### Key files

- Front_End_Raspberry/src/app/all-app-component/system-configuration/system-configuration-list/system-configuration-list.component.ts
- Front_End_Raspberry/src/app/all-app-component/system-configuration/system-configuration-form/system-configuration-form.component.ts
- Front_End_Raspberry/src/app/model/system-configuration.model.ts

### Pattern

- List component loads all rows via GET /GetAllSystemConfiguration.
- Edit dialog opened via MatDialog with SystemConfigurationFormComponent.
- Form handles both create and update:
  - If data.id > 0 -> load existing, submit PUT
  - If data.id === 0 -> create new, submit POST
- Delete handled in list with DELETE /DeleteSystemConfigurationById/{id}.
- Direct HttpClient usage in components, consistent with existing Angular settings features.

### Form fields

- KeyConfig (required)
- ValueConfig (required)

## React Native Mobile

- No changes in this feature iteration.
- System Configuration CRUD is implemented only for Angular web settings.

## Known keys with special operational meaning

Most rows here are arbitrary key-value pairs with no code reading them back — but a few keys are read by
the backend at specific points and change real behavior. Known so far:

| `KeyConfig` | `ValueConfig` example | Read by | Effect |
|---|---|---|---|
| `ScheduleImportCron` | `0 */4 * * *` (cron expression) | `Program.cs`, once at app startup | Overrides the UEH course-schedule sync job's recurring cron schedule |
| `UehKeepAliveCron` | `*/10 * * * *` (cron expression) | `Program.cs`, once at app startup | Ghi đè lịch của job **giữ phiên UEH** (`ueh-keep-alive-job`, mặc định `*/15 * * * *`). Chỉ bản thật |

Cả hai khóa đi qua cùng một hàm cục bộ `AddOrUpdateWithCronOverride` (`Program.cs:312-338`), nên cùng quy tắc
ưu tiên, cùng cách kiểm tra cú pháp và cùng điều kiện phải khởi động lại backend.

### `ScheduleImportCron`

Read in `Program.cs` when registering the `ScheduleImportRecurringId` Hangfire recurring job, with this
priority: **this System Configuration row (if present and valid) > `appsettings.json`
`HangfireJobs:ScheduleImportCron` > hardcoded hourly default**.

- Set via the normal CRUD UI at `/settings/system-configuration-settings` — add a row with
  `KeyConfig = "ScheduleImportCron"` and `ValueConfig` set to a cron expression, e.g. `0 */4 * * *`.
- ⚠ **Takes effect only after restarting the backend.** There is no runtime reload — the value is read
  once during startup when the recurring job is registered.
- ⚠ **Syntax is validated before use, not assumed correct.** The system attempts
  `recurringJobManager.AddOrUpdate` with the override value first; if Hangfire rejects it (invalid cron
  syntax), a warning is logged and the system falls back to the appsettings/default value instead of
  crashing at startup. (Cronos, which normally validates cron expressions, is bundled inside
  `Hangfire.Core 1.8.21` as an internal type — it can't be called directly, so validating via a live
  `AddOrUpdate` attempt is the mechanism used instead.)

Full sync-flow context: `15_feature-ueh-student-schedule.md`.

### `UehKeepAliveCron`

Cùng cơ chế với `ScheduleImportCron`, áp dụng cho job `ueh-keep-alive-job` (`UehKeepAliveRecurringId`).
Thứ tự ưu tiên: **row này (nếu có và hợp lệ) > `appsettings.json` `HangfireJobs:UehKeepAliveCron` (`*/15 * * * *`)
> mặc định trong code (`*/15 * * * *`)**.

- Thêm row `KeyConfig = "UehKeepAliveCron"`, `ValueConfig` là cron, ví dụ `*/10 * * * *`.
- ⚠ Chỉ có hiệu lực sau khi **khởi động lại backend**. Cú pháp sai thì ghi warning và dùng lại giá trị
  appsettings/mặc định, không làm sập app.
- Job này **không đăng ký trên demo**, nên row này vô nghĩa ở đó.
- Job làm gì và vì sao cần: `26_feature-ueh-session-extension.md` §9, `22_feature-hangfire-jobs.md`.

> Ghi chú vận hành (08/11/2026): trong lúc chuyển sang đồng bộ bằng extension, job đồng bộ được tạm dừng bằng
> `ScheduleImportCron = 0 0 31 2 *` (31/02, không bao giờ tới). Khi chạy ổn thì xóa row này rồi khởi động lại
> backend để quay về mỗi giờ.
