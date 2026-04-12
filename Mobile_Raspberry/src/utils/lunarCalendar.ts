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
 * Format lunar date in Vietnamese style
 * @param lunarDate - LunarDate object
 * @returns Formatted string like "15/8 ÂM" or "Nhuận 6/2025"
 */
export function formatLunarDateVN(lunarDate: LunarDate): string {
  if (lunarDate.day === 0) return '';
  const leap = lunarDate.isLeapMonth ? 'Nhuận ' : '';
  return `${leap}${lunarDate.day}/${lunarDate.month}`;
}

/**
 * Format short lunar date for calendar cell
 * @param lunarDate - LunarDate object
 * @returns Short format like "(15/8)" or "(N6)"
 */
export function formatLunarDateShort(lunarDate: LunarDate): string {
  if (lunarDate.day === 0) return '';
  const leap = lunarDate.isLeapMonth ? 'N' : '';
  return `(${leap}${lunarDate.day}/${lunarDate.month})`;
}
