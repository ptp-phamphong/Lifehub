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
