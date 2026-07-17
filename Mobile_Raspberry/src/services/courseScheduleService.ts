import { apiGet } from './apiClient';
import { CourseSchedule } from '../models/courseSchedule.model';

/** Lấy thời khóa biểu theo tháng/năm */
export async function getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]> {
  return apiGet<CourseSchedule[]>(`/GetCourseScheduleByMonth/${month}/${year}`);
}

/**
 * Lấy thời khóa biểu của tuần chứa ngày truyền vào (tuần tính từ thứ Hai).
 * Truyền ngày bất kỳ trong tuần — backend tự quy về thứ Hai.
 */
export async function getCourseScheduleByWeek(anyDateInWeek: Date): Promise<CourseSchedule[]> {
  const y = anyDateInWeek.getFullYear();
  const m = String(anyDateInWeek.getMonth() + 1).padStart(2, '0');
  const d = String(anyDateInWeek.getDate()).padStart(2, '0');
  return apiGet<CourseSchedule[]>(`/GetCourseScheduleByWeek/${y}-${m}-${d}`);
}
