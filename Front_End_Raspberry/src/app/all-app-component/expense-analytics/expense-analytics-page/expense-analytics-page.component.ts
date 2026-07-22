import { Component, OnInit, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ExpenseAnalyticsService } from 'src/app/services/expense-analytics.service';
import { LanguageService } from 'src/app/services/language.service';
import { ReasonType } from 'src/app/model/reason-type.model';
import {
  AnalyticsFilter,
  AnalyticsRawData,
  AnalyticsViewModel,
  HeatCell
} from 'src/app/model/expense-analytics.model';
import {
  TransformLabels,
  buildCategoryRank,
  buildCategoryStack,
  buildCumulative,
  buildHeatmap,
  buildIncomeExpense,
  buildKpis,
  buildWeekday,
  filterExpenses,
  monthKey,
  shiftMonth,
  visibleMonths
} from '../expense-analytics.transform';
import { AnalyticsFormatService } from '../analytics-format.service';

/**
 * Trang Phân tích chi tiêu.
 *
 * Là component DUY NHẤT inject service dữ liệu; mọi biểu đồ con đều dumb và chỉ
 * nhận dataset đã tính sẵn.
 *
 * Đổi bộ lọc KHÔNG gọi lại API: raw nạp một lần rồi tính lại tại chỗ. Nhờ vậy
 * chuyện "đổi lọc mà không nhấp nháy" là hiển nhiên - vì không có refetch.
 *
 * ĐỔI NGÔN NGỮ cũng đi qua đúng đường đó. Phần lớn chữ trong trang nằm bên
 * trong SVG (nhãn trục, tooltip, chú giải) nên không có pipe nào chạy lại giúp;
 * thay vào đó `effect` dưới đây dựng lại view-model, `@Input` của các biểu đồ
 * nhận mảng mới và `ngOnChanges` sinh lại chuỗi theo ngôn ngữ mới. Vẫn không có
 * request nào được gọi lại.
 */
@Component({
  selector: 'app-expense-analytics-page',
  templateUrl: './expense-analytics-page.component.html',
  styleUrls: ['./expense-analytics-page.component.scss']
})
export class ExpenseAnalyticsPageComponent implements OnInit {
  readonly rangeOptions = [
    { labelKey: 'analytics.range6', value: 6 },
    { labelKey: 'analytics.range12', value: 12 },
    { labelKey: 'analytics.range24', value: 24 },
    { labelKey: 'analytics.rangeAll', value: 0 }
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
  /** Chỉ khóa 'YYYY-MM'; nhãn do `monthTitle()` dựng theo ngôn ngữ đang chọn. */
  monthOptions: string[] = [];

  /**
   * Bảng số của heatmap: chỉ những ngày thực sự có chi.
   * Tính sẵn thành field chứ không phải getter - getter sẽ tạo mảng mới mỗi chu
   * kỳ change detection và làm *ngFor dựng lại liên tục.
   */
  heatDaysWithData: HeatCell[] = [];

  loading = false;
  loadError = false;

  private readonly fmt = inject(AnalyticsFormatService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  format = (value: number) => this.fmt.full(value);
  monthShort = (key: string) => this.fmt.monthShort(key);
  monthTitle = (key: string) => this.fmt.monthTitle(key);

  constructor(private analytics: ExpenseAnalyticsService) {
    // Đổi ngôn ngữ -> dựng lại toàn bộ dataset. Xem chú thích của class: đây là
    // cách duy nhất để chữ NẰM TRONG SVG đổi theo, vì chỗ đó không có pipe.
    // Chỉ tính lại từ raw đã cache nên không phát sinh request nào.
    effect(() => {
      this.language.language();
      this.rebuild();
    });
  }

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

    this.monthOptions = Array.from(keys).sort((a, b) => b.localeCompare(a));
  }

  /**
   * Nhãn mà tầng transform cần nhưng không tự dịch được (nó là hàm thuần).
   *
   * `otherCandidates` phải là danh sách: người dùng có thể đã đặt một loại tên
   * đúng bằng 'Khác'/'Other', khi đó transform lấy ứng viên kế tiếp để hai thứ
   * khác nhau không nằm chung một đoạn cột.
   */
  private get transformLabels(): TransformLabels {
    return {
      uncategorized: this.translate.instant('analytics.uncategorized'),
      otherCandidates: [
        this.translate.instant('analytics.otherGroup'),
        this.translate.instant('analytics.otherGroupAlt1'),
        this.translate.instant('analytics.otherGroupAlt2')
      ],
      otherNumbered: (index: number) =>
        this.translate.instant('analytics.otherGroupNumbered', { index })
    };
  }

  /** Tính lại toàn bộ dataset từ raw đã cache. Vài nghìn dòng -> dưới 1ms. */
  rebuild(): void {
    if (!this.raw) return;

    const chi = filterExpenses(this.raw.expenses, this.filter);
    const thu = this.raw.incomes;   // thu KHÔNG có loại -> không bao giờ áp lọc loại vào đây
    const months = visibleMonths(chi, this.filter);
    const labels = this.transformLabels;

    this.vm = {
      kpis: buildKpis(chi, thu, this.filter.anchorMonth),
      monthlyPairs: buildIncomeExpense(chi, thu, months),
      categoryRank: buildCategoryRank(chi, labels),
      categoryStack: buildCategoryStack(chi, months, labels),
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

  // ─── Nhãn phụ, trạng thái ───────────────────────────────────────────

  get filteringNote(): string {
    const parts: string[] = [];
    if (this.filter.reasonTypeIds.length) {
      parts.push(this.translate.instant('analytics.filterCountIn', {
        count: this.filter.reasonTypeIds.length
      }));
    }
    if (this.filter.reasonTypeIdsOut.length) {
      parts.push(this.translate.instant('analytics.filterCountOut', {
        count: this.filter.reasonTypeIdsOut.length
      }));
    }
    return this.translate.instant('analytics.filteringNote', { detail: parts.join(', ') });
  }

  get loadedAtLabel(): string {
    if (!this.raw) return '';
    return this.translate.instant('analytics.loadedAt', {
      time: this.fmt.time(this.raw.loadedAt)
    });
  }

  /**
   * Bản ghi không có ngày bị loại khỏi mọi biểu đồ thời gian. PHẢI nói ra:
   * tiền không được biến mất trong im lặng.
   */
  get skippedCount(): number {
    if (!this.raw) return 0;
    return this.raw.skippedExpenseCount + this.raw.skippedIncomeCount;
  }

  /**
   * 'Khoảng 12 tháng gần nhất' / 'Last 12 months'.
   *
   * Là khoá có tham số chứ không phải phép nối chuỗi: bản cũ ghép
   * `'Khoảng ' + rangeLabel + ' gần nhất'` với `rangeLabel` là nhãn nút đã
   * `toLowerCase()`, cách đó không dịch được và sang tiếng Anh còn hạ sai chữ.
   */
  get rangeSubtitle(): string {
    return this.rangeSubtitleFor('analytics.subtitleRange', 'analytics.subtitleRangeAll');
  }

  get rangeSubtitleByTotal(): string {
    return this.rangeSubtitleFor('analytics.subtitleRangeByTotal', 'analytics.subtitleRangeAllByTotal');
  }

  private rangeSubtitleFor(key: string, allKey: string): string {
    const n = this.filter.monthsBack;
    return n > 0
      ? this.translate.instant(key, { count: n })
      : this.translate.instant(allKey);
  }

  /** Dạng TIÊU ĐỀ: 'Tháng 7 năm 2026' / 'July 2026'. */
  get anchorTitle(): string {
    return this.fmt.monthTitle(this.filter.anchorMonth);
  }

  /**
   * Dạng viết GIỮA CÂU. Trước đây là `anchorLabel.toLowerCase()`, sang tiếng
   * Anh sẽ ra 'july 2026' — sai chính tả. Hai dạng nay tách hẳn ra.
   */
  get anchorInline(): string {
    return this.fmt.monthInline(this.filter.anchorMonth);
  }

  get prevAnchorInline(): string {
    return this.fmt.monthInline(shiftMonth(this.filter.anchorMonth, -1));
  }

  /** Khi đang lọc loại thì Thu-vs-Chi không còn là so sánh cùng cơ sở - phải nói rõ. */
  get incomeExpenseNote(): string {
    if (!this.vm) return '';
    if (!this.vm.hasIncome) return '';
    if (!this.vm.isFiltered) return '';
    return this.translate.instant('analytics.incomeExpenseNote');
  }
}
