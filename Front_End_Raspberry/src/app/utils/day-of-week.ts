/**
 * Quy ước thứ trong tuần của app: 2 = Thứ 2 … 8 = Chủ nhật.
 *
 * KHÁC `Date.getDay()` (0 = Chủ nhật … 6 = Thứ 7) — đây là quy ước của portal
 * UEH, backend lưu nguyên như vậy nên frontend phải theo.
 *
 * Ba component thời khóa biểu đều cần đổi số này thành nhãn; gom vào một chỗ
 * để tên khoá không bị lệch giữa chúng.
 */

/** Xếp theo thứ tự của quy ước trên: chỉ số 0 ứng với dow = 2. */
const DOW_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type DowKey = (typeof DOW_KEYS)[number];

/** Khoá i18n của một thứ, hoặc `null` nếu số không hợp lệ / không có. */
export function dowKey(dow?: number): DowKey | null {
  if (!dow || dow < 2 || dow > 8) return null;
  return DOW_KEYS[dow - 2];
}

/** Khoá đầy đủ để truyền thẳng cho `translate`, vd. `course.dowLong.mon`. */
export function dowTranslationKey(dow: number | undefined, form: 'dowShort' | 'dowLong'): string | null {
  const key = dowKey(dow);
  return key ? `course.${form}.${key}` : null;
}

/** Danh sách khoá của 7 cột lịch, bắt đầu từ Thứ 2. */
export const WEEK_DOW_KEYS: readonly DowKey[] = DOW_KEYS;
