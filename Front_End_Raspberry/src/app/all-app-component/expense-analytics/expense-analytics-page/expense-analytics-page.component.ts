import { Component, OnInit } from '@angular/core';
import { ExpenseAnalyticsService } from 'src/app/services/expense-analytics.service';
import { ReasonType } from 'src/app/model/reason-type.model';
import {
  AnalyticsFilter,
  AnalyticsRawData,
  AnalyticsViewModel,
  HeatCell
} from 'src/app/model/expense-analytics.model';
import {
  buildCategoryRank,
  buildCategoryStack,
  buildCumulative,
  buildHeatmap,
  buildIncomeExpense,
  buildKpis,
  buildWeekday,
  filterExpenses,
  formatCurrencyFull,
  monthKey,
  monthLabelDai,
  shiftMonth,
  visibleMonths
} from '../expense-analytics.transform';

interface MonthOption {
  key: string;
  label: string;
}

/**
 * Trang Phân tích chi tiêu.
 *
 * Là component DUY NHẤT inject service; mọi biểu đồ con đều dumb và chỉ nhận
 * dataset đã tính sẵn.
 *
 * Đổi bộ lọc KHÔNG gọi lại API: raw nạp một lần rồi tính lại tại chỗ. Nhờ vậy
 * chuyện "đổi lọc mà không nhấp nháy" là hiển nhiên - vì không có refetch.
 */
@Component({
  selector: 'app-expense-analytics-page',
  templateUrl: './expense-analytics-page.component.html',
  styleUrls: ['./expense-analytics-page.component.scss']
})
export class ExpenseAnalyticsPageComponent implements OnInit {
  readonly rangeOptions = [
    { label: '6 tháng', value: 6 },
    { label: '12 tháng', value: 12 },
    { label: '24 tháng', value: 24 },
    { label: 'Tất cả', value: 0 }
  ];

  filter: AnalyticsFilter = {
    monthsBack: 12,
    reasonTypeIds: [],
    reasonTypeIdsOut: [],
    anchorMonth: monthKey(new Date())
  };

  raw: AnalyticsRawData | null = null;
  vm: AnalyticsViewModel | null = null;
  reasonTypes: ReasonType[] = [];
  monthOptions: MonthOption[] = [];

  /**
   * Bảng số của heatmap: chỉ những ngày thực sự có chi.
   * Tính sẵn thành field chứ không phải getter - getter sẽ tạo mảng mới mỗi chu
   * kỳ change detection và làm *ngFor dựng lại liên tục.
   */
  heatDaysWithData: HeatCell[] = [];

  loading = false;
  loadError = false;

  format = formatCurrencyFull;

  constructor(private analytics: ExpenseAnalyticsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(forceReload = false): void {
    this.loading = true;
    this.loadError = false;

    this.analytics.loadAll(forceReload).subscribe({
      next: raw => {
        this.raw = raw;
        this.reasonTypes = raw.reasonTypes;
        this.buildMonthOptions();
        this.applyDefaultFilters();
        this.rebuild();
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  /**
   * Trang Chi tiêu tự bật sẵn bộ lọc theo defaultFilterType lúc load
   * (expense-record-list.component.ts: applyDefaultFilters). Nghĩa là con số
   * "Tổng chi tháng" người dùng quen nhìn ở đó ĐÃ bị lọc sẵn.
   *
   * Nếu trang này hiện tổng chưa lọc thì hai tab sẽ đá nhau và trang mới trông
   * như hỏng. Nên ta bật đúng bộ lọc mặc định đó - nhưng vẫn nạp dữ liệu không
   * lọc, để người dùng bỏ lọc ra xem toàn cảnh được.
   *
   * Chỉ áp một lần lúc load; sau đó tôn trọng lựa chọn của người dùng.
   */
  private defaultsApplied = false;

  private applyDefaultFilters(): void {
    if (this.defaultsApplied) return;
    this.defaultsApplied = true;

    const macIn = this.reasonTypes.filter(rt => rt.defaultFilterType === 2).map(rt => rt.id);
    const macOut = this.reasonTypes.filter(rt => rt.defaultFilterType === 3).map(rt => rt.id);

    if (macIn.length) this.filter.reasonTypeIds = macIn;
    if (macOut.length) this.filter.reasonTypeIdsOut = macOut;
  }

  private buildMonthOptions(): void {
    const now = monthKey(new Date());
    const keys = new Set<string>([now]);
    for (const r of this.raw.expenses) keys.add(r.monthKey);
    for (const r of this.raw.incomes) keys.add(r.monthKey);

    this.monthOptions = Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({ key, label: monthLabelDai(key) }));
  }

  /** Tính lại toàn bộ dataset từ raw đã cache. Vài nghìn dòng -> dưới 1ms. */
  rebuild(): void {
    if (!this.raw) return;

    const chi = filterExpenses(this.raw.expenses, this.filter);
    const thu = this.raw.incomes;   // thu KHÔNG có loại -> không bao giờ áp lọc loại vào đây
    const months = visibleMonths(chi, this.filter);

    this.vm = {
      kpis: buildKpis(chi, thu, this.filter.anchorMonth),
      monthlyPairs: buildIncomeExpense(chi, thu, months),
      categoryRank: buildCategoryRank(chi),
      categoryStack: buildCategoryStack(chi, months),
      weekdays: buildWeekday(chi),
      heatmap: buildHeatmap(chi, this.filter.anchorMonth),
      cumulative: buildCumulative(chi, this.filter.anchorMonth),
      hasIncome: thu.length > 0,
      isFiltered: this.filter.reasonTypeIds.length > 0 || this.filter.reasonTypeIdsOut.length > 0
    };

    this.heatDaysWithData = this.vm.heatmap.weeks
      .reduce((acc, w) => acc.concat(w), [] as HeatCell[])
      .filter(c => !c.isPadding && c.total > 0);
  }

  onRangeChange(value: number): void {
    this.filter.monthsBack = value;
    this.rebuild();
  }

  onFilterChange(): void {
    this.rebuild();
  }

  clearReasonFilter(): void {
    this.filter.reasonTypeIds = [];
    this.filter.reasonTypeIdsOut = [];
    this.rebuild();
  }

  get filterCountLabel(): string {
    const parts: string[] = [];
    if (this.filter.reasonTypeIds.length) parts.push(`${this.filter.reasonTypeIds.length} loại`);
    if (this.filter.reasonTypeIdsOut.length) parts.push(`loại trừ ${this.filter.reasonTypeIdsOut.length} loại`);
    return parts.join(', ');
  }

  // ─── Nhãn phụ, trạng thái ───────────────────────────────────────────

  get loadedAtLabel(): string {
    if (!this.raw) return '';
    return this.raw.loadedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Bản ghi không có ngày bị loại khỏi mọi biểu đồ thời gian. PHẢI nói ra:
   * tiền không được biến mất trong im lặng.
   */
  get skippedNote(): string {
    if (!this.raw) return '';
    const n = this.raw.skippedExpenseCount + this.raw.skippedIncomeCount;
    if (!n) return '';
    return `${n} khoản chưa có ngày nên không được tính vào các biểu đồ theo thời gian.`;
  }

  get rangeLabel(): string {
    const o = this.rangeOptions.find(x => x.value === this.filter.monthsBack);
    return o ? o.label.toLowerCase() : '';
  }

  get anchorLabel(): string {
    return monthLabelDai(this.filter.anchorMonth);
  }

  get prevAnchorLabel(): string {
    return monthLabelDai(shiftMonth(this.filter.anchorMonth, -1));
  }

  /** Khi đang lọc loại thì Thu-vs-Chi không còn là so sánh cùng cơ sở - phải nói rõ. */
  get incomeExpenseNote(): string {
    if (!this.vm) return '';
    if (!this.vm.hasIncome) return '';
    if (!this.vm.isFiltered) return '';
    return 'Đang lọc theo loại: cột Chi chỉ gồm các loại đã chọn, còn cột Thu luôn là toàn bộ (thu không có loại).';
  }

  get emptyIncomeText(): string {
    return 'Chưa có khoản thu nào được ghi nhận';
  }
}
