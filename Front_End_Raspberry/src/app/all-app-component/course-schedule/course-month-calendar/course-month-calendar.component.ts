import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';

const COURSE_COLORS = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  { bg: '#ccfbf1', border: '#14b8a6', text: '#115e59' },
  { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  { bg: '#e2e8f0', border: '#64748b', text: '#334155' },
];

export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  courses: CourseSchedule[];
}

@Component({
  selector: 'app-course-month-calendar',
  templateUrl: './course-month-calendar.component.html',
  styleUrls: ['./course-month-calendar.component.scss']
})
export class CourseMonthCalendarComponent {
  currentMonth: number = new Date().getMonth() + 1;
    currentYear: number = new Date().getFullYear();
    weeks: CalendarDay[][] = [];
    weekDays: string[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    courses: CourseSchedule[] = [];
    selectedCourse: CourseSchedule | null = null;
    selectedDay: CalendarDay | null = null;
    maxVisibleCourses = 1;
    private colorMap: Map<string, number> = new Map();
  
    constructor(private http: HttpClient) {}
  
    ngOnInit() {
      this.loadMonth();
    }
  
    get monthYearLabel(): string {
      const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
      ];
      return `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
    }
  
    prevMonth() {
      this.currentMonth--;
      if (this.currentMonth < 1) {
        this.currentMonth = 12;
        this.currentYear--;
      }
      this.selectedCourse = null;
      this.loadMonth();
    }
  
    nextMonth() {
      this.currentMonth++;
      if (this.currentMonth > 12) {
        this.currentMonth = 1;
        this.currentYear++;
      }
      this.selectedCourse = null;
      this.loadMonth();
    }
  
    goToToday() {
      const now = new Date();
      this.currentMonth = now.getMonth() + 1;
      this.currentYear = now.getFullYear();
      this.selectedCourse = null;
      this.loadMonth();
    }
  
    loadMonth() {
      this.http.get<CourseSchedule[]>(
        `${environment.apiBaseUrl}/GetCourseScheduleByMonth/${this.currentMonth}/${this.currentYear}`
      ).subscribe({
        next: (data) => {
          this.courses = data;
          this.buildColorMap();
          this.buildCalendar();
        },
        error: (err) => {
          console.error('Lỗi khi tải thời khóa biểu:', err);
          this.courses = [];
          this.buildCalendar();
        }
      });
    }
  
    buildCalendar() {
      const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      // Monday = 0, Sunday = 6
      let startDow = firstDay.getDay() - 1;
      if (startDow < 0) startDow = 6; // Sunday
  
      const days: CalendarDay[] = [];
  
      // Padding days from previous month
      const prevMonthLast = new Date(this.currentYear, this.currentMonth - 1, 0);
      for (let i = startDow - 1; i >= 0; i--) {
        const d = new Date(prevMonthLast);
        d.setDate(prevMonthLast.getDate() - i);
        days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, courses: [] });
      }
  
      // Current month days
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(this.currentYear, this.currentMonth - 1, d);
        date.setHours(0, 0, 0, 0);
        const coursesForDay = this.getCoursesForDate(date);
        days.push({
          date,
          day: d,
          isCurrentMonth: true,
          isToday: date.getTime() === today.getTime(),
          courses: coursesForDay
        });
      }
  
      // Padding days from next month
      const remaining = 7 - (days.length % 7);
      if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
          const d = new Date(this.currentYear, this.currentMonth, i);
          days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, courses: [] });
        }
      }
  
      // Split into weeks
      this.weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        this.weeks.push(days.slice(i, i + 7));
      }
    }
  
    getCoursesForDate(date: Date): CourseSchedule[] {
      // Convert JS getDay() (0=Sun,1=Mon..6=Sat) to our format (2=Mon..8=Sun)
      const jsDow = date.getDay();
      const dow = jsDow === 0 ? 8 : jsDow + 1;
  
      return this.courses.filter(c => {
        if (!c.startDate || !c.endDate) return false;
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(c.endDate);
        end.setHours(0, 0, 0, 0);
        if (date < start || date > end) return false;
        // Only show on matching day of week
        if (c.dayOfWeek && c.dayOfWeek !== dow) return false;
        return true;
      }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }
  
    dayOfWeekLabel(dow?: number): string {
      const labels: { [key: number]: string } = {
        2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5',
        6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật'
      };
      return dow ? labels[dow] || '' : '';
    }
  
    truncate(text: string | undefined, maxLen: number): string {
      if (!text) return '';
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    }

    private buildColorMap() {
      this.colorMap.clear();
      let idx = 0;
      for (const c of this.courses) {
        const key = c.courseCode || c.courseName || String(c.id);
        if (!this.colorMap.has(key)) {
          this.colorMap.set(key, idx % COURSE_COLORS.length);
          idx++;
        }
      }
    }

    getChipColor(course: CourseSchedule): { bg: string; border: string; text: string } {
      const key = course.courseCode || course.courseName || String(course.id);
      const idx = this.colorMap.get(key) || 0;
      return COURSE_COLORS[idx];
    }
  
    selectCourse(course: CourseSchedule, event: Event) {
      event.stopPropagation();
      this.selectedCourse = course;
      this.selectedDay = null;
    }
  
    closeDetail() {
      this.selectedCourse = null;
    }

    openDayDetail(day: CalendarDay, event: Event) {
      event.stopPropagation();
      this.selectedDay = day;
    }

    closeDayDetail() {
      this.selectedDay = null;
    }
}
