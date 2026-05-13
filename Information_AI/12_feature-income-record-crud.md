# Feature: Income Record CRUD

Core feature for tracking money received (income). Full create, read, update, delete with sorting and aggregation.

## Backend

### Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | `/IncomeNote` | `IncomeRecordCreateDto` | `int` (new id) |
| POST | `/GetAllIncomeNote` | `ParamFilter` | `List<IncomeRecordDto>` |
| GET | `/GetIncomeById/{id}` | - | `IncomeRecordDto` |
| PUT | `/UpdateIncomeById/{id}` | `IncomeRecordUpdateDto` | `bool` |
| DELETE | `/DeleteIncomeById/{id}` | - | `bool` |
| GET | `/SumAllIncome` | - | `int` |
| POST | `/SumAllIncomeWithFilter` | `ParamFilter` | `int` |
| GET | `/GetIncomesByMonth/{month}/{year}` | - | `List<IncomeRecordDto>` |
| GET | `/SumIncomeByMonth/{month}/{year}` | - | `int` |
| POST | `/SumIncomeByCurrentMonth` | `ParamFilter` | `int` |
| POST | `/SumIncomeByCurrentWeek` | `ParamFilter` | `int` |

### Flow

```
IncomeRecordController -> IIncomeService -> IIncomeRepository -> AppDbContext
                                     -> IIncomeRecordMapper (DTO <-> Entity)
```

### Key files

- Controller: `API_Raspberry/Controllers/IncomeRecordController.cs`
- Service: `API_Raspberry/Service/IncomeService.cs`
- Repository: `API_Raspberry/Repository/IncomeRepository.cs`
- Mapper: `API_Raspberry/Mapper/IncomeRecordMapper.cs`
- DTOs: `API_Raspberry/Dto/IncomeRecordDto.cs`
- Model: `API_Raspberry/Model/IncomeRecord.cs`

### Entity fields

- `Id` (int, PK)
- `Reason` (string, required)
- `Amount` (int, required)
- `CreatedDate` (DateTime?, nullable)

### Filtering and sorting

- Filter by month and year on `CreatedDate`
- Sorting columns: `id`, `createddate`, `reason`, `amount`
- Default sort in repository: `CreatedDate` descending

## Angular Web Frontend

### Route and tabs

- Existing route: `/expense-record-list`
- Page now has 2 tabs:
  - `Tien chi`
  - `Tien thu`

### Reuse strategy

- Reuses existing list component: `expense-record-list.component.*`
- Reuses existing dialog form component: `expense-record.component.*`
- Components switch behavior by `flowType` (`expense` or `income`)

### UI behavior for income tab

- Uses income endpoints for list, CRUD, and sums
- Hides reason-type filter section
- Hides reason-type column in table
- Keeps month pagination, sorting, and summary cards
- **Defaults to "show all history" mode** (showAll = true) when switching to income tab
- The "Hiển thị toàn bộ lịch sử" checkbox is hidden for the income tab since it always shows all

## Mobile

- Not implemented yet (as requested).
