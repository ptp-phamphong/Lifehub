import { CourseSchedule } from '../models/courseSchedule.model';

/**
 * Tiện ích cho `learningMode` (Hình thức học) của buổi học lấy từ portal UEH.
 *
 * Dùng chung cho lịch tuần và lịch tháng: quy tắc chuẩn hoá NFC bên dưới rất dễ làm sai,
 * nên chỉ nên tồn tại ở một chỗ.
 */

const IN_PERSON = 'TẬP TRUNG';
const CANCELLED = 'NGHỈ';

/**
 * Chuẩn hoá về NFC trước khi so sánh: portal UEH trả tiếng Việt ở dạng tổ hợp
 * ("NGHỈ" có thể không bằng literal "NGHỈ" trong file này dù nhìn giống hệt).
 * Backend đã chuẩn hoá khi import; đây là lớp phòng thủ thứ hai cho dữ liệu cũ.
 * Xem Information_AI/15_feature-ueh-student-schedule.md §"Three traps".
 */
export function normalizedLearningMode(course?: CourseSchedule | null): string {
  return (course?.learningMode || '').normalize('NFC').trim().toUpperCase();
}

/** Buổi nghỉ — không phải buổi học, dù portal vẫn xếp nó vào lưới thời khóa biểu. */
export function isCancelledSession(course?: CourseSchedule | null): boolean {
  return normalizedLearningMode(course) === CANCELLED;
}

/** TẬP TRUNG là mặc định nên không gắn nhãn; chỉ ONLINE / LMS / NGHỈ mới cần. */
export function learningModeLabel(course?: CourseSchedule | null): string {
  const mode = normalizedLearningMode(course);
  return !mode || mode === IN_PERSON ? '' : mode;
}
