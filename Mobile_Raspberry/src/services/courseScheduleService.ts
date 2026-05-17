import { apiGet } from './apiClient';
import { CourseSchedule } from '../models/courseSchedule.model';

/** Lấy thời khóa biểu theo tháng/năm */
export async function getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]> {
  return apiGet<CourseSchedule[]>(`/GetCourseScheduleByMonth/${month}/${year}`);
}
