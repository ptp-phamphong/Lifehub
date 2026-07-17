// Kiểu dữ liệu cho trang Phân tích chi tiêu.
// Xem Information_AI/19_feature-expense-analytics.md để biết vì sao thiết kế như vậy.

import { ReasonType } from './reason-type.model';

/** Nhãn cho khoản chi không gắn loại (reasonTypeId nullable trong schema). */
export const KHONG_PHAN_LOAI = 'Chưa phân loại';

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
  reasonName: string; // KHONG_PHAN_LOAI khi không có loại
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

export interface KpiTile {
  label: string;
  value: number;
  /** null = không so sánh được (tháng trước bằng 0 -> không chia được). */
  deltaPercent: number | null;
  /** Tăng là tốt hay xấu: chi tăng = xấu, thu tăng = tốt. */
  higherIsBetter: boolean;
  hint: string;
}

// ─── #2 Thu vs Chi theo tháng ─────────────────────────────────────────

export interface MonthlyPair {
  monthKey: string;
  label: string;
  expense: number;
  income: number;
}

// ─── #3 Chi theo loại ─────────────────────────────────────────────────

export interface RankRow {
  label: string;
  total: number;
  count: number;
  /** 0..100 - bề rộng thanh so với mục cao nhất. */
  percent: number;
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
  label: string;
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

export interface WeekdayRow {
  label: string;   // 'T2'..'CN'
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
  monthLabel: string;
}

// ─── #7 Chi lũy kế trong tháng ────────────────────────────────────────

export interface CumulativePoint {
  day: number;
  total: number;
}

export interface CumulativeSeries {
  current: CumulativePoint[];
  previous: CumulativePoint[];
  currentLabel: string;
  previousLabel: string;
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
