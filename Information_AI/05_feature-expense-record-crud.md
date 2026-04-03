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
- Uses `MatDialog` to open add/edit form as a dialog.
- Form component loads expense by ID for editing, creates/updates via HTTP.
- Month pagination component controls which month is displayed.
- Filter by ReasonType using `@ng-select/ng-select`.
- Column sorting supported.
- Shows summaries: month total, week total, overall total.

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
