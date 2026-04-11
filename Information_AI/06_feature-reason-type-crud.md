# Feature: Reason Type CRUD

Settings feature to manage expense categories (reason types). Used as a lookup/reference for Expense Records.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | `/ReasonType` | `ReasonTypeCreateDto` | `bool` |
| GET | `/GetAllReasonType` | — | `List<ReasonTypeDto>` |
| GET | `/GetReasonTypeById/{id}` | — | `ReasonTypeDto` |
| PUT | `/UpdateReasonTypeById/{id}` | `ReasonTypeUpdateDto` | `bool` |

Note: There is no DELETE endpoint for reason types. They are soft-managed through the `Active` field.

### Flow

```
ReasonTypeController → IReasonTypeService → IReasonTypeRepository → AppDbContext
                                           → IReasonTypeMapper (DTO ↔ Entity)
```

### Key files

- Controller: `API_Raspberry/Controllers/ReasonTypeController.cs`
- Service: `API_Raspberry/Service/ReasonTypeService.cs`
- Repository: `API_Raspberry/Repository/ReasonTypeRepository.cs`
- Mapper: `API_Raspberry/Mapper/ReasonTypeMapper.cs`
- DTOs: `API_Raspberry/Dto/ReasonTypeDto.cs`
- Model: `API_Raspberry/Model/ReasonType.cs`

### Entity fields

- `Id` (int, PK)
- `ReasonName` (string, required)
- `Active` (bool)
- `SortOrder` (int?, nullable)

Table name: `reasonType`

### Default ordering

`GetAllReasonType` returns records ordered by `SortOrder` ascending.

### Mapper behavior

- `ToEntity(CreateDto)`: sets `Active = true` by default
- `UpdateEntity(entity, UpdateDto)`: overwrites name, sort order, active status

## Active field usage rules

`Active` is treated as a soft-enable/disable flag and is consumed by Expense features as follows:

1. Expense add/edit form dropdowns (Angular + React Native): only show reason types where `Active = true`.
2. Expense list filter dropdowns (Angular + React Native): show both active and inactive reason types.
3. Inactive items shown in filters/lists must include an explicit marker, e.g. `(inactive)`.
4. Existing expense rows linked to inactive reason types must still render that reason type text.
5. API contract remains unchanged: `GET /GetAllReasonType` continues returning all records.

## Angular Web Frontend

### Navigation and route

- Current route: `/settings/reason-type-settings`
- Access path in UI: top menu `Cài đặt` → left sidebar item `Reason type Settings`
- Legacy routes still redirect to the new route:
  - `/reason-type-settings`
  - `/setting/reason-type-settings`

### Key files

- `Front_End_Raspberry/src/app/all-app-component/reason-type/reason-type-list/reason-type-list.component.ts`
- `Front_End_Raspberry/src/app/all-app-component/reason-type/reason-type-form/reason-type-form.component.ts`
- `Front_End_Raspberry/src/app/model/reason-type.model.ts`

### Pattern

- List component loads all reason types via `GET /GetAllReasonType`.
- Edit dialog opened via `MatDialog` with `ReasonTypeFormComponent`.
- Form component handles both create and update:
  - If `data.id > 0` → load existing, submit PUT
  - If `data.id === 0` → create new, submit POST
- Direct `HttpClient` usage in components — no Angular service layer.
- No delete functionality in the UI (commented out).

### Form fields

- Reason name (required)
- Sort order (optional number)
- Active status (boolean, shown on edit)

## React Native Mobile

### Key files

- `Mobile_Raspberry/src/screens/ReasonTypeScreen.tsx`
- `Mobile_Raspberry/src/services/reasonTypeService.ts`
- `Mobile_Raspberry/src/models/reasonType.model.ts`

### Current state

The mobile ReasonType screen is a **placeholder only**. It shows static text:
> "📋 Reason Type Settings — Cài đặt loại chi tiêu sẽ ở đây"

The service module only provides `getAllReasonTypes()` (used by expense filter), and does not have create/update/delete functions.

Even though mobile ReasonType CRUD screen is not implemented, the `Active` flag is already consumed in Expense flows:

- Expense form picker: active only.
- Expense filters/list: active + inactive with `(inactive)` label.

### What exists in mobile

- `reasonTypeService.ts` has `getAllReasonTypes(): Promise<ReasonType[]>` — used by `ExpenseListScreen` and `FilterReasonType` component.
- `ReasonType` model interface with `id`, `reasonName`, `active`, `sortOrder`.

### What is missing in mobile

- No CRUD UI for managing reason types from the mobile app.
- No add/edit/toggle-active service functions.

## Platform comparison

| Aspect | Angular | React Native |
|---|---|---|
| List view | Full table | Placeholder only |
| Create | MatDialog form | Not implemented |
| Update | MatDialog form | Not implemented |
| Delete | Not implemented (soft-delete via Active flag) | Not implemented |
| Service layer | None (direct HttpClient) | Partial (read only) |

## Mobile build note for this feature

- ReasonType active/inactive display behavior is handled at JS/TS UI layer.
- For Expo apps with OTA enabled, this can be shipped via `eas update` (no new APK typically required).
- New APK/AAB is needed for native-level changes (plugins/modules/config) or non-OTA delivery.
