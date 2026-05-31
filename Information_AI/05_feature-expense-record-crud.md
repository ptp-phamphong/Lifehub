# Feature: Expense Record CRUD

Core feature for tracking personal expenses. Full create, read, update, delete with filtering, sorting, and aggregation.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | `/ExpenseNote` | `ExpenseRecordCreateDto` | `int` (new id) |
| POST | `/GetAllExpenseNote` | `ParamFilter` | `List<ExpenseRecordDto>` |
| GET | `/GetExpenseById/{id}` | — | `ExpenseRecordDto` |
| PUT | `/UpdateById/{id}` | `ExpenseRecordUpdateDto` | `bool` |
| DELETE | `/DeleteById/{id}` | — | `bool` |
| GET | `/SumAll` | — | `int` |
| POST | `/SumAllWithFilter` | `ParamFilter` | `int` |
| GET | `/GetExpensesByMonth/{month}/{year}` | — | `List<ExpenseRecordDto>` |
| GET | `/SumByMonth/{month}/{year}` | — | `int` |
| POST | `/SumByCurrentMonth` | `ParamFilter` | `int` |
| POST | `/SumByCurrentWeek` | `ParamFilter` | `int` |

### Flow

```
ExpenseRecordController → IExpenseService → IExpenseRepository → AppDbContext
                                          → IExpenseRecordMapper (DTO ↔ Entity)
                                          → IReasonTypeRepository (join reason type names)
```

### Key files

- Controller: `API_Raspberry/Controllers/ExpenseRecordController.cs`
- Service: `API_Raspberry/Service/ExpenseService.cs`
- Repository: `API_Raspberry/Repository/ExpenseRepository.cs`
- Mapper: `API_Raspberry/Mapper/ExpenseRecordMapper.cs`
- DTOs: `API_Raspberry/Dto/ExpenseRecordDto.cs`
- Model: `API_Raspberry/Model/ExpenseRecord.cs`

### Entity fields

- `Id` (int, PK)
- `Reason` (string, required)
- `Amount` (int, required)
- `CreatedDate` (DateTime?, nullable)
- `ReasonTypeId` (int?, FK to ReasonType, nullable)
- `ReasonType` (navigation property)

### ParamFilter shape

```json
{
  "month": 4,
  "year": 2026,
  "reasonTypeIdsFilterIn": [1, 2],
  "reasonTypeIdsFilterOut": [5],
  "sortColumn": "createdDate",
  "sortDirection": "desc"
}
```

### Filtering logic (repository)

- Filter by month and year on `CreatedDate`
- Filter by `ReasonTypeId` IN list or NOT IN list
- Default sort: `CreatedDate` descending

### Sorting logic (service)

Service applies additional sorting after query using LINQ on the result list. Supported columns: `id`, `createddate`, `reason`, `reasontype`, `amount`.

### Mapper behavior

- `ToEntity(CreateDto)`: sets `CreatedDate` to `DateTime.Now` if null
- `UpdateEntity(entity, UpdateDto)`: overwrites reason, amount, date, reason type
- `ToDto(entity)`: maps entity + nested ReasonType to DTO
- `ToDtoList(entities)`: batch conversion

## Angular Web Frontend

### Key files

- `Front_End_Raspberry/src/app/all-app-component/expense-record/expense-record.component.ts` — add/edit form (dialog)
- `Front_End_Raspberry/src/app/all-app-component/expense-record-list/expense-record-list.component.ts` — list view
- `Front_End_Raspberry/src/app/model/expense.model.ts` — model class

### Pattern

- List component injects `HttpClient` directly, calls POST `/GetAllExpenseNote` with filter.
- Route `/expense-record-list` now has 2 tabs (`Tien chi`, `Tien thu`); this expense feature is the `Tien chi` tab.
- Uses `MatDialog` to open add/edit form as a dialog.
- Form component loads expense by ID for editing, creates/updates via HTTP.
- Month pagination component controls which month is displayed.
- Filter by ReasonType using `@ng-select/ng-select`.
- Column sorting supported.
- Shows summaries: month total, week total, overall total.

### Tab behavior differences

- **Tiền chi (Expense)**: Defaults to show current month. Has a "Hiển thị toàn bộ lịch sử" checkbox to toggle between month view and all history.
- **Tiền thu (Income)**: Always defaults to "show all history" mode (no month filter). The toggle checkbox is hidden for income tab.

### Group by day (UI-only feature)

When viewing by month (not "show all history"), a toggle button appears in the toolbar:
- **Off** (default): Records display in a flat table/list as before.
- **On**: Records are grouped by date (dd/MM/yyyy). Each group shows a header with the date and item count, followed by the records for that day.

**Behavior:**
- The button is hidden when "Hiển thị toàn bộ lịch sử" is active (to avoid long UI).
- Grouping is done entirely on the client side — no backend changes needed.
- Sorting still applies within the flat data before grouping.
- Both "Tiền chi" and "Tiền thu" tabs support the toggle when in month view.

**Angular implementation:**
- `groupByDay: boolean` property on the component.
- `groupedRecords` getter computes date groups from `expenseRecords`.
- Template switches between flat `<table>` and grouped `<div *ngFor>` with per-group tables.
- Button uses `.btn-group-day` CSS class with `.active` state.

**React Native implementation:**
- `groupByDay` state toggle.
- `groupedSections()` function returns `{ title, data }[]` for `SectionList`.
- Conditionally renders `FlatList` (flat) or `SectionList` (grouped) with section headers.
- `showAll` and `groupByDay` controls are shown on the same toolbar row. In show-all mode, group-by-day button remains visible but disabled.

### Mobile list-space optimization controls

React Native expense screen includes compact controls to maximize list viewport:

- **Summary collapse**: Summary card has a header arrow button to quickly hide/show totals (`month`, `week`, `all`, `filtered`).
- **Filter/sort collapse**: Filter area is hidden by default and can be expanded with a toggle button (`Mở lọc/sắp xếp`).
- **Sort popup menu**: Replaces inline sort chips with a modal menu for:
  - Sort column: `Ngày`, `Số tiền`, `Lý do`, `Loại`
  - Sort direction: `Tăng dần` / `Giảm dần`
- **Inline top controls**: `Hiển thị toàn bộ lịch sử` and `Gom theo ngày` are aligned on one row.

### Default filters from ReasonType

On load, the expense list reads `defaultFilterType` from each reason type:
- Reason types with `defaultFilterType = 2` are auto-selected in the "Lọc theo lý do" filter.
- Reason types with `defaultFilterType = 3` are auto-selected in the "Lọc theo không phải lý do" filter.
- This applies to both Angular web and React Native mobile.

### ReasonType active/inactive behavior

- Expense add/edit form dropdown only shows active reason types (`active = true`).
- Expense list filter dropdowns (IN/OUT) still show all reason types.
- Inactive reason types in filter dropdown include a suffix `(inactive)` for visibility.
- Expense rows that reference inactive reason types still display the reason type text with `(inactive)` suffix.
- Existing records are not auto-cleared when linked reason type becomes inactive.

### Data access

- No dedicated Angular service — all HTTP calls are in components.
- Uses `environment.apiBaseUrl` for URL prefix.

## React Native Mobile

### Key files

- `Mobile_Raspberry/src/screens/ExpenseListScreen.tsx` — main list screen
- `Mobile_Raspberry/src/components/ExpenseFormModal.tsx` — add/edit modal
- `Mobile_Raspberry/src/components/FilterReasonType.tsx` — reason type filter
- `Mobile_Raspberry/src/components/MonthPagination.tsx` — month selector
- `Mobile_Raspberry/src/services/expenseService.ts` — API wrapper
- `Mobile_Raspberry/src/models/expense.model.ts` — model interface

### Pattern

- `ExpenseListScreen` is a functional component with extensive local state (`useState`).
- Uses service functions from `expenseService.ts` (`getAllExpenseNotes`, `sumByCurrentMonth`, etc.).
- Service module contains `postJson` and `getJson` helpers wrapping `fetch()`.
- Loads data via `useCallback` + `useEffect`.
- CRUD operations: add, edit (modal), delete (Alert confirm).
- Month pagination, show-all toggle, reason type filter IN/OUT.
- Sorting by column with direction toggle.

### ReasonType active/inactive behavior

- Expense add/edit modal only shows active reason types (`active = true`) in the picker.
- Expense list filter controls still show all reason types.
- Inactive reason types in filters are labeled with `(inactive)`.
- Expense list row shows reason type with `(inactive)` suffix when applicable.
- Existing records linked to inactive reason types remain readable/editable.

### Mobile release note

- This active/inactive behavior is JS/TS/UI logic.
- If app distribution uses Expo OTA (`eas update`), usually no new APK is needed.
- Build new APK/AAB only when not using OTA, or when there are native/plugin/config changes.

### Service API functions

```typescript
getAllExpenseNotes(filter: ParamFilter): Promise<ExpenseRecord[]>
sumByCurrentMonth(filter: ParamFilter): Promise<number>
sumByCurrentWeek(filter: ParamFilter): Promise<number>
sumAll(): Promise<number>
sumAllWithFilter(filter: ParamFilter): Promise<number>
getExpenseById(id: number): Promise<ExpenseRecord>
addExpense(record: ExpenseRecord): Promise<boolean>
updateExpense(id: number, record: ExpenseRecord): Promise<boolean>
deleteExpenseById(id: number): Promise<void>
```

## Platform comparison

| Aspect | Angular | React Native |
|---|---|---|
| API call location | Component (HttpClient) | Service module (fetch) |
| Form UI | MatDialog popup | Modal component |
| Filter UI | ng-select dropdown | Custom FilterReasonType component |
| State management | Component fields | useState hooks |
| Month pagination | Shared component | Shared component |
| Sorting | Column click | Column click |
| Group by day | `*ngIf` switches flat table / grouped tables | Conditional FlatList / SectionList |
