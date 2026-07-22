import Lunisolar from 'lunisolar';

/**
 * Convert a Gregorian date to Vietnamese lunar calendar
 * @param date - JavaScript Date object
 * @returns Lunar date info: { month, day, year, isLeapMonth }
 */
export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

export function toLunarDate(date: Date): LunarDate {
  try {
    const lunar = Lunisolar(date).lunar;
    return {
      day: lunar.day,
      month: lunar.month,
      year: lunar.year,
      isLeapMonth: lunar.isLeapMonth || false,
    };
  } catch (err) {
    console.warn('Lỗi chuyển đổi lịch âm:', err);
    // Fallback: return empty lunar date info
    return { day: 0, month: 0, year: 0, isLeapMonth: false };
  }
}

/**
 * Format lunar date, e.g. "15/8" or "Nhuận 6/2025".
 *
 * Ngày/tháng là số nên không cần dịch; chỉ tiền tố tháng nhuận là chữ, vì vậy
 * nó được TRUYỀN VÀO thay vì viết cứng — util này là hàm thuần, không đụng tới
 * `TranslateService`. Mặc định là tiếng Việt để chỗ gọi cũ không đổi hành vi.
 * @param leapLabel - nhãn tháng nhuận, lấy từ khoá `course.lunarLeap`.
 */
export function formatLunarDateVN(lunarDate: LunarDate, leapLabel: string = 'Nhuận'): string {
  if (lunarDate.day === 0) return '';
  const leap = lunarDate.isLeapMonth ? `${leapLabel} ` : '';
  return `${leap}${lunarDate.day}/${lunarDate.month}`;
}

/**
 * Format short lunar date for calendar cell, e.g. "(15/8)" or "(N6)".
 * @param leapLabel - nhãn tháng nhuận rút gọn, khoá `course.lunarLeapShort`.
 */
export function formatLunarDateShort(lunarDate: LunarDate, leapLabel: string = 'N'): string {
  if (lunarDate.day === 0) return '';
  const leap = lunarDate.isLeapMonth ? leapLabel : '';
  return `(${leap}${lunarDate.day}/${lunarDate.month})`;
}
