# Feature: Semester Metadata CRUD

Settings feature to manage semester metadata and flag the current semester.

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
- Is current semester (boolean)

### Validation rule

Business rule: only one semester can have IsCurrentSemester = true.

Current implementation:
- Validation is handled on Angular form before submit.
- When user sets current semester = true, form checks in-memory list from dialog data.
- If another record is already true (and different id), submit is blocked and error message is shown.

Note:
- Backend currently accepts payload as-is and does not enforce unique current semester constraint.
- This follows current request scope (frontend validation first).

## React Native Mobile

- No changes in this feature iteration.
- Semester Metadata CRUD is implemented only for Angular web settings.
