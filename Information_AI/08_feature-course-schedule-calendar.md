# Feature: Course Schedule Calendar Display

Displays the course schedule in visual calendar formats (week view and month view). Consumption-only, no editing from calendar views. Both web and mobile calendars support lunar date display and swipe navigation.

## Backend

The calendar views use these endpoints:

| Method | Route | Returns |
|---|---|---|
| GET | `/GetCourseScheduleByMonth/{month}/{year}` | `List<CourseScheduleDto>` |
| GET | `/GetExpensesByMonth/{month}/{year}` | `List<ExpenseRecordDto>` |

The course endpoint returns all courses whose date range overlaps with the given month. The expense endpoint is called additionally when the expense overlay is active.

## Expense Overlay Feature (Month View Only)

When the user switches to month view, a second toggle appears: **Thời khóa biểu / Chi tiêu**. This is hidden in week view.

| Toggle state | Day cell content | Click action |
|---|---|---|
| Thời khóa biểu (default) | Course chips as usual | Opens course detail / day course list |
| Chi tiêu | Green chip with daily total (e.g. `150,000đ`) | Opens dialog showing all expenses (name + amount) for that day |

- Days with 0 expenses show no chip in expense mode.
- Switching back to week view automatically resets to schedule mode.
- Expense data is loaded via `GET /GetExpensesByMonth/{month}/{year}` grouped by day from `createdDate`.

## Angular Web Frontend

### Key files

- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-calendar/course-calendar.component.ts` — container with toggle; holds `showMonth` and `showExpense` flags
- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-week-calendar/course-week-calendar.component.ts` — week view
- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-month-calendar/course-month-calendar.component.ts` — month view; accepts `@Input() showExpense`
- `Front_End_Raspberry/src/app/utils/lunar-calendar.ts` — Gregorian to lunar conversion helper
- `Front_End_Raspberry/src/main.ts` — loads `hammerjs` for touch gesture support

### Container component

`CourseCalendarComponent` holds:
- `showMonth: boolean` — toggles between week and month views.
- `showExpense: boolean` — toggles between schedule and expense overlay (only visible/usable in month mode).

The second toggle (`Thời khóa biểu / Chi tiêu`) is rendered with `*ngIf="showMonth"` and passes `[showExpense]="showExpense"` to `app-course-month-calendar`.

### Week calendar

- Fetches courses by month via `HttpClient`.
- Renders a weekly timetable grid.
- Columns: Monday to Sunday (mapped from `DayOfWeek`).
- Rows: time slots.
- Each cell shows course name, room, time range.
- Detail popup displays `SemesterName` when available.
- Displays lunar date under each day header.
- Supports swipe gesture: right = previous week, left = next week.

### Month calendar

- Accepts `@Input() showExpense: boolean`.
- Fetches courses by month via `HttpClient`.
- When `showExpense` is active, also fetches expenses via `GET /GetExpensesByMonth`.
- Expense data is grouped by day in `expensesByDay: Map<string, ExpenseRecord[]>`.
- Renders a monthly grid.
- Each day cell shows **courses** (default) OR **daily expense total chip** (expense mode).
- Clicking the expense total chip opens an expense detail overlay with name + amount list and daily sum.
- Displays lunar date in each current-month day cell.
- Supports swipe gesture: right = previous month, left = next month.

#### Expense-related methods added to `CourseMonthCalendarComponent`
- `loadExpenses()` — fetches expense data for current month
- `buildExpensesByDay()` — builds a map keyed by `year-month-day`
- `getDailyExpenses(date)` — returns expense list for a specific date
- `getDailyTotal(date)` — returns sum of amounts for a specific date
- `openExpenseDetail(date, event)` / `closeExpenseDetail()` — controls expense dialog

### Navigation

- Week view: button navigation and swipe gesture between weeks.
- Month view: button navigation and swipe gesture between months.
- Clicking the center label still jumps to current week/current month.

## React Native Mobile

### Key files

- `Mobile_Raspberry/src/screens/CourseScheduleScreen.tsx` — screen container; holds `showMonth` and `showExpense` state
- `Mobile_Raspberry/src/components/CourseWeekCalendar.tsx` — week view
- `Mobile_Raspberry/src/components/CourseMonthCalendar.tsx` — month view; accepts `showExpense` prop
- `Mobile_Raspberry/src/services/courseScheduleService.ts` — course API call
- `Mobile_Raspberry/src/services/expenseService.ts` — expense API call (see `getExpensesByMonth`)
- `Mobile_Raspberry/src/utils/lunarCalendar.ts` — Gregorian to lunar conversion helper

### Pattern

- `CourseScheduleScreen` holds `showMonth` and `showExpense` state.
- The second toggle (Thời khóa biểu / Chi tiêu) is only rendered when `showMonth === true`.
- Switching to week view resets `showExpense` to `false`.
- `CourseMonthCalendar` accepts `{ showExpense?: boolean }` prop.
- When `showExpense` is true, it loads expenses via `getExpensesByMonth()` and groups them by day.
- Day cells show daily expense total chip; pressing opens `selectedDayExpenses` modal.
- Calendar components fetch data via `getCourseScheduleByMonth()` and render course blocks in a grid layout.
- Week and month components show lunar date labels.
- Week and month components support swipe gesture for timeline navigation.

### Services

```typescript
// courseScheduleService.ts
getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]>

// expenseService.ts
getExpensesByMonth(month: number, year: number): Promise<ExpenseRecord[]>
```

### Course Schedule model (mobile)

```typescript
export interface CourseSchedule {
  id?: number;
  courseName?: string;
  courseCode?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  address?: string;
  semesterMetadataId?: number;
  semesterName?: string;
  semesterYear?: number;
  dayOfWeek?: number;
  createdDate?: string;
}
```

## DayOfWeek convention

Both platforms use the same convention:
- 2 = Monday (Thứ 2)
- 3 = Tuesday (Thứ 3)
- 4 = Wednesday (Thứ 4)
- 5 = Thursday (Thứ 5)
- 6 = Friday (Thứ 6)
- 7 = Saturday (Thứ 7)
- 8 = Sunday (CN)

## Platform comparison

| Aspect | Angular | React Native |
|---|---|---|
| Week view | Grid component | Calendar component |
| Month view | Grid component | Calendar component |
| View toggle | Boolean flag in container | Screen-level toggle |
| Lunar date | Yes (`lunisolar`) | Yes (`lunisolar`) |
| Swipe navigation | Yes (touch + `hammerjs`) | Yes (`PanResponder`) |
| Data source | HttpClient in component | Service module with fetch |
