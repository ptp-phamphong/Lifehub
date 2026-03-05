import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CourseSchedule } from 'src/app/model/course-schedule.model';

export interface WeekDay {
  date: Date;
  label: string;      // "T2", "T3", ... "CN"
  dateLabel: string;   // "03/03"
  dow: number;         // 2-8
}

export interface CourseBlock {
  course: CourseSchedule;
  top: number;         // px offset from grid top
  height: number;      // px height
  color: string;       // background color
  textColor: string;   // text color
}

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

@Component({
  selector: 'app-course-week-calendar',
  templateUrl: './course-week-calendar.component.html',
  styleUrls: ['./course-week-calendar.component.scss']
})
export class CourseWeekCalendarComponent implements OnInit {
  weekDays: WeekDay[] = [];
  hours: number[] = [];
  courses: CourseSchedule[] = [];
  selectedCourse: CourseSchedule | null = null;

  // Map courseCode/courseName → color index for consistent coloring
  private colorMap: Map<string, number> = new Map();

  // Config
  hourStart = 6;   // start at 6:00
  hourEnd = 22;     // end at 22:00
  hourHeight = 60;  // px per hour

  // Current week reference (Monday)
  currentWeekMonday: Date = new Date();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.hours = [];
    for (let h = this.hourStart; h <= this.hourEnd; h++) {
      this.hours.push(h);
    }
    this.goToCurrentWeek();
  }

  get weekRangeLabel(): string {
    if (this.weekDays.length === 0) return '';
    const first = this.weekDays[0].date;
    const last = this.weekDays[6].date;
    return `${this.formatDate(first)} – ${this.formatDate(last)}`;
  }

  private formatDate(d: Date): string {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  goToCurrentWeek() {
    const now = new Date();
    this.currentWeekMonday = this.getMonday(now);
    this.buildWeek();
    this.loadCourses();
  }

  prevWeek() {
    this.currentWeekMonday = new Date(this.currentWeekMonday);
    this.currentWeekMonday.setDate(this.currentWeekMonday.getDate() - 7);
    this.selectedCourse = null;
    this.buildWeek();
    this.loadCourses();
  }

  nextWeek() {
    this.currentWeekMonday = new Date(this.currentWeekMonday);
    this.currentWeekMonday.setDate(this.currentWeekMonday.getDate() + 7);
    this.selectedCourse = null;
    this.buildWeek();
    this.loadCourses();
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  buildWeek() {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekMonday);
      date.setDate(date.getDate() + i);
      const dayNum = date.getDate().toString().padStart(2, '0');
      const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
      this.weekDays.push({
        date,
        label: labels[i],
        dateLabel: `${dayNum}/${monthNum}`,
        dow: i + 2 > 8 ? 8 : i + 2  // Mon=2 ... Sun=8
      });
    }
    // Fix: Sun's dow should be 8
    this.weekDays[6].dow = 8;
  }

  loadCourses() {
    // Load courses for the month of the current week's Monday (may span 2 months)
    const month1 = this.currentWeekMonday.getMonth() + 1;
    const year1 = this.currentWeekMonday.getFullYear();
    const sunday = this.weekDays[6]?.date;
    const month2 = sunday ? sunday.getMonth() + 1 : month1;
    const year2 = sunday ? sunday.getFullYear() : year1;

    // Load first month
    this.http.get<CourseSchedule[]>(
      `${environment.apiBaseUrl}/GetCourseScheduleByMonth/${month1}/${year1}`
    ).subscribe({
      next: (data) => {
        if (month1 !== month2 || year1 !== year2) {
          // Week spans two months, load second month too
          this.http.get<CourseSchedule[]>(
            `${environment.apiBaseUrl}/GetCourseScheduleByMonth/${month2}/${year2}`
          ).subscribe({
            next: (data2) => {
              // Merge and deduplicate by id
              const merged = [...data];
              for (const c of data2) {
                if (!merged.find(m => m.id === c.id)) {
                  merged.push(c);
                }
              }
              this.courses = merged;
              this.buildColorMap();
            },
            error: () => {
              this.courses = data;
              this.buildColorMap();
            }
          });
        } else {
          this.courses = data;
          this.buildColorMap();
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải thời khóa biểu:', err);
        this.courses = [];
      }
    });
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

  getCoursesForDay(day: WeekDay): CourseBlock[] {
    const date = day.date;
    const dateNorm = new Date(date);
    dateNorm.setHours(0, 0, 0, 0);

    return this.courses
      .filter(c => {
        if (!c.startDate || !c.endDate) return false;
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(c.endDate);
        end.setHours(0, 0, 0, 0);
        if (dateNorm < start || dateNorm > end) return false;
        if (c.dayOfWeek && c.dayOfWeek !== day.dow) return false;
        return true;
      })
      .map(c => this.toCourseBlock(c))
      .sort((a, b) => a.top - b.top);
  }

  private toCourseBlock(c: CourseSchedule): CourseBlock {
    const startMinutes = this.parseTime(c.startTime);
    const endMinutes = this.parseTime(c.endTime);

    const topMinutes = Math.max(startMinutes - this.hourStart * 60, 0);
    const bottomMinutes = Math.min(endMinutes - this.hourStart * 60, (this.hourEnd - this.hourStart + 1) * 60);
    const height = Math.max(bottomMinutes - topMinutes, 0);

    const top = (topMinutes / 60) * this.hourHeight;
    const h = (height / 60) * this.hourHeight;

    const key = c.courseCode || c.courseName || String(c.id);
    const colorIdx = this.colorMap.get(key) || 0;
    const palette = COURSE_COLORS[colorIdx];

    return {
      course: c,
      top,
      height: Math.max(h, 20), // minimum height
      color: palette.bg,
      textColor: palette.text,
    };
  }

  private parseTime(time?: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
  }

  getBorderColor(block: CourseBlock): string {
    const key = block.course.courseCode || block.course.courseName || String(block.course.id);
    const colorIdx = this.colorMap.get(key) || 0;
    return COURSE_COLORS[colorIdx].border;
  }

  get gridHeight(): number {
    return (this.hourEnd - this.hourStart + 1) * this.hourHeight;
  }

  formatHour(h: number): string {
    return h.toString().padStart(2, '0') + ':00';
  }

  isToday(day: WeekDay): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(day.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }

  currentTimeTop(): number | null {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const startMin = this.hourStart * 60;
    const endMin = (this.hourEnd + 1) * 60;
    if (minutes < startMin || minutes > endMin) return null;
    return ((minutes - startMin) / 60) * this.hourHeight;
  }

  isCurrentWeek(): boolean {
    const today = new Date();
    const mon = this.getMonday(today);
    return mon.getTime() === this.currentWeekMonday.getTime();
  }

  selectCourse(block: CourseBlock, event: Event) {
    event.stopPropagation();
    this.selectedCourse = block.course;
  }

  closeDetail() {
    this.selectedCourse = null;
  }

  dayOfWeekLabel(dow?: number): string {
    const labels: { [key: number]: string } = {
      2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5',
      6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật'
    };
    return dow ? labels[dow] || '' : '';
  }
}
