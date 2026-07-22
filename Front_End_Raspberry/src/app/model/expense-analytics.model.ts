// Kiểu dữ liệu cho trang Phân tích chi tiêu.
// Xem Information_AI/19_feature-expense-analytics.md để biết vì sao thiết kế như vậy.

import { DowKey } from '../utils/day-of-week';
import { ReasonType } from './reason-type.model';

/**
 * Khoá NỘI BỘ cho khoản chi không gắn loại (reasonTypeId nullable trong schema).
 *
 * Cố ý KHÔNG phải chuỗi hiển thị. Trước đây hằng này là `'Chưa phân loại'` và
 * đóng hai vai cùng lúc: khoá gom nhóm ở `normalizeRaw` và sentinel so sánh ở
 * `buildCategoryRank`. Nếu dịch thẳng hằng đó thì nhóm đã gom bằng chuỗi tiếng
 * Việt còn phép so sánh lại dùng chuỗi tiếng Anh → `isMuted` im lặng thành
 * `false` và nhóm chưa phân loại mất kiểu hiển thị mờ.
 *
 * Nay khoá là chuỗi trung tính, còn nhãn hiển thị (`analytics.uncategorized`)
 * được truyền vào tầng transform lúc dựng — xem `buildCategoryRank`.
 */
export const UNCATEGORIZED = '__uncategorized__';

/**
 * Bản ghi đã chuẩn hóa: chắc chắn CÓ ngày hợp lệ và CÓ tên loại.
 * Bản ghi thiếu ngày bị loại ngay ở normalizeRaw, một lần duy nhất.
 */
export interface DatedRecord {
  id: number;
  reason: string;
  amount: number;
  date: Date;
  monthKey: string;   // 'YYYY-MM'
  dayKey: string;     // 'YYYY-MM-DD'
  reasonTypeId: number | null;
  reasonName: string; // UNCATEGORIZED khi không có loại
}

export interface AnalyticsRawData {
  expenses: DatedRecord[];
  incomes: DatedRecord[];
  reasonTypes: ReasonType[];
  /** Số khoản bị loại vì không có ngày - PHẢI hiện ra cho người dùng thấy. */
  skippedExpenseCount: number;
  skippedIncomeCount: number;
  loadedAt: Date;
}

export interface AnalyticsFilter {
  /** 6 | 12 | 24 tháng gần nhất; 0 = toàn bộ lịch sử. */
  monthsBack: number;
  /**
   * Lọc THEO loại. Rỗng = mọi loại. CHỈ áp cho chi - thu không có loại.
   * Gương của reasonTypeIdsFilterIn ở trang Chi tiêu.
   */
  reasonTypeIds: number[];
  /**
   * Lọc theo KHÔNG PHẢI loại. Gương của reasonTypeIdsFilterOut ở trang Chi tiêu.
   * Phải có cả hai thì tổng của hai trang mới khớp nhau được.
   */
  reasonTypeIdsOut: number[];
  /** 'YYYY-MM' - tháng neo cho KPI, heatmap và biểu đồ lũy kế. */
  anchorMonth: string;
}

// ─── #1 KPI ───────────────────────────────────────────────────────────

/**
 * Thẻ KPI mang KHOÁ i18n chứ không mang chuỗi đã dịch: bốn thẻ này render thẳng
 * ra DOM nên `| translate` tự chạy lại khi đổi ngôn ngữ, không cần dựng lại
 * view-model. (Nhãn nằm trong SVG thì không có cửa đó — xem `MonthlyPair`.)
 */
export interface KpiTile {
  labelKey: string;
  value: number;
  /** null = không so sánh được (tháng trước bằng 0 -> không chia được). */
  deltaPercent: number | null;
  /** Tăng là tốt hay xấu: chi tăng = xấu, thu tăng = tốt. */
  higherIsBetter: boolean;
  hintKey: string;
  hintParams?: Record<string, unknown>;
}

// ─── #2 Thu vs Chi theo tháng ─────────────────────────────────────────

/**
 * Chỉ mang `monthKey`; nhãn trục do biểu đồ tự định dạng qua
 * `AnalyticsFormatService`. Tầng transform không sinh chuỗi hiển thị nào.
 */
export interface MonthlyPair {
  monthKey: string;
  expense: number;
  income: number;
}

// ─── #3 Chi theo loại ─────────────────────────────────────────────────

export interface RankRow {
  /**
   * Tên loại lấy từ DB nên hiển thị NGUYÊN VĂN, trừ nhóm chưa phân loại: chỗ đó
   * transform thay sentinel bằng nhãn đã dịch mà chỗ gọi truyền vào.
   */
  label: string;
  total: number;
  count: number;
  /** 0..100 - bề rộng thanh so với mục cao nhất. */
  percent: number;
  /** Nhóm chưa phân loại. Tính từ sentinel TRƯỚC khi đổi sang nhãn hiển thị. */
  isMuted: boolean;
}

// ─── #4 Cơ cấu loại qua các tháng ─────────────────────────────────────

export interface StackSegment {
  label: string;
  value: number;
  /** 1..8 = slot phân loại; 0 = muted (Khác / Chưa phân loại). */
  slot: number;
}

export interface StackColumn {
  monthKey: string;
  total: number;
  segments: StackSegment[];
}

export interface StackLegendItem {
  label: string;
  slot: number;
  total: number;
}

export interface StackModel {
  columns: StackColumn[];
  legend: StackLegendItem[];
  /** Nhãn thực tế của nhóm gộp - có thể khác 'Khác' nếu bị trùng tên loại thật. */
  otherLabel: string;
}

// ─── #5 Chi theo thứ trong tuần ───────────────────────────────────────

/**
 * Mang KHOÁ thứ (`mon`..`sun`) chứ không mang nhãn: nhãn 'T2'/'Mon' lấy từ
 * `course.dowShort.*` — cùng bộ khoá mà Thời khóa biểu đang dùng, để hai chỗ
 * không bao giờ viết tắt khác nhau.
 */
export interface WeekdayRow {
  dow: DowKey;
  total: number;
  count: number;
}

// ─── #6 Heatmap chi theo ngày ─────────────────────────────────────────

export interface HeatCell {
  dayKey: string;
  day: number;
  total: number;
  count: number;
  /** 0 = không chi (ô rỗng); 1..6 = bậc ramp. */
  level: number;
  /** Ô đệm đầu/cuối lưới để canh đúng thứ - không phải ngày thật. */
  isPadding: boolean;
  /**
   * Ngày chưa tới (tháng neo là tháng đang diễn ra). Phải khác hẳn ngày "không
   * chi": tô chúng giống nhau là nói rằng hôm đó không tiêu gì, trong khi sự
   * thật là hôm đó chưa xảy ra.
   */
  isFuture: boolean;
}

export interface HeatmapModel {
  weeks: HeatCell[][];
  /** Ngưỡng kẹp (p95). Giá trị trên mức này đều nhận bậc đậm nhất. */
  clampMax: number;
  hasClamped: boolean;
  /** 'YYYY-MM' của tháng neo; tiêu đề do trang tự định dạng. */
  monthKey: string;
}

// ─── #7 Chi lũy kế trong tháng ────────────────────────────────────────

export interface CumulativePoint {
  day: number;
  total: number;
}

export interface CumulativeSeries {
  current: CumulativePoint[];
  previous: CumulativePoint[];
  /** 'YYYY-MM'; chú giải do biểu đồ tự định dạng theo ngôn ngữ đang chọn. */
  currentMonthKey: string;
  previousMonthKey: string;
  daysInMonth: number;
  /** Tháng neo là tháng đang diễn ra -> đường current dừng ở hôm nay. */
  isPartial: boolean;
}

// ─── Gói dữ liệu cho cả trang ─────────────────────────────────────────

export interface AnalyticsViewModel {
  kpis: KpiTile[];
  monthlyPairs: MonthlyPair[];
  categoryRank: RankRow[];
  categoryStack: StackModel;
  weekdays: WeekdayRow[];
  heatmap: HeatmapModel;
  cumulative: CumulativeSeries;
  hasIncome: boolean;
  isFiltered: boolean;
}
