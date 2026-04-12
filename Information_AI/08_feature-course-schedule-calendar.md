# Feature: Course Schedule Calendar Display

Displays the course schedule in visual calendar formats (week view and month view). Consumption-only — no editing from calendar views.

## Backend

The calendar views reuse the same endpoint as the CRUD feature:

| Method | Route | Returns |
|---|---|---|
| GET | `/GetCourseScheduleByMonth/{month}/{year}` | `List<CourseScheduleDto>` |

This returns all courses whose date range overlaps with the given month.

## Angular Web Frontend

### Key files

- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-calendar/course-calendar.component.ts` — container with toggle
- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-week-calendar/course-week-calendar.component.ts` — week view
- `Front_End_Raspberry/src/app/all-app-component/course-schedule/course-month-calendar/course-month-calendar.component.ts` — month view

### Container component

`CourseCalendarComponent` holds a `showMonth: boolean` flag to toggle between week and month views.

### Week calendar

- Fetches courses by month via `HttpClient`.
- Renders a weekly timetable grid.
- Columns: Monday to Sunday (mapped from `DayOfWeek`).
- Rows: time slots.
- Each cell shows course name, room, time range.
- Detail popup displays `SemesterName` when available.

### Month calendar

- Fetches courses by month via `HttpClient`.
- Renders a monthly grid.
- Each day cell shows courses scheduled for that day.
- Uses `DayOfWeek` field to place courses on correct weekdays.
- Detail popup displays `SemesterName` when available.

### Navigation

Both views include month pagination to navigate between months.

## React Native Mobile

### Key files

- `Mobile_Raspberry/src/screens/CourseScheduleScreen.tsx` — screen container
- `Mobile_Raspberry/src/components/CourseWeekCalendar.tsx` — week view
- `Mobile_Raspberry/src/components/CourseMonthCalendar.tsx` — month view
- `Mobile_Raspberry/src/services/courseScheduleService.ts` — API call

### Pattern

- `CourseScheduleScreen` loads courses for the selected month via `getCourseScheduleByMonth()`.
- Toggles between week and month calendar views.
- `MonthPagination` component for month navigation.
- Calendar components render course blocks in a grid layout.

### Service

```typescript
getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]>
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
| Month navigation | Shared MonthPagination | Shared MonthPagination |
| Data source | HttpClient in component | Service module with fetch |
