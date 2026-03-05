import { getApiBaseUrl } from '../config';
import { CourseSchedule } from '../models/courseSchedule.model';

async function getJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

/** Lấy thời khóa biểu theo tháng/năm */
export async function getCourseScheduleByMonth(month: number, year: number): Promise<CourseSchedule[]> {
  return getJson<CourseSchedule[]>(`/GetCourseScheduleByMonth/${month}/${year}`);
}
