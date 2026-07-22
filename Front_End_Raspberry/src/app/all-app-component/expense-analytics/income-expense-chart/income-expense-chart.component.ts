import { Component, Input, OnChanges, inject } from '@angular/core';
import { MonthlyPair } from 'src/app/model/expense-analytics.model';
import { AnalyticsFormatService } from '../analytics-format.service';

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  tooltip: string;
}

interface Slot {
  label: string;
  labelX: number;
  chi: Bar;
  thu: Bar;
}

/**
 * Thu vs Chi theo tháng - cột nhóm, hai chuỗi.
 *
 * MỘT TRỤC Y DUY NHẤT. Thu và chi cùng đơn vị VNĐ nên không có cớ gì dùng hai
 * thang. Biểu đồ hai trục là lỗi phổ biến nhất: cách căn hai thang là tùy tiện
 * nên nó bịa ra một tương quan vốn không có trong dữ liệu.
 *
 * Trục X do trang truyền xuống đã liên tục (tháng trống = cột 0), nên khoảng
 * ngưng chi hiện ra đúng là khoảng ngưng chứ không bị nén mất.
 */
@Component({
  selector: 'app-income-expense-chart',
  templateUrl: './income-expense-chart.component.html',
  styleUrls: ['./income-expense-chart.component.scss']
})
export class IncomeExpenseChartComponent implements OnChanges {
  @Input() pairs: MonthlyPair[] = [];

  readonly viewWidth = 720;
  readonly viewHeight = 170;
  readonly paddingLeft = 54;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  slots: Slot[] = [];
  gridLines: { y: number; label: string }[] = [];

  /**
   * Nhãn trục và tooltip nằm TRONG SVG nên phải dựng bằng tay, không qua pipe.
   * Đổi ngôn ngữ được xử lý ở trang cha: nó dựng lại view-model, `@Input` nhận
   * mảng mới → `ngOnChanges` chạy → chuỗi ở đây được sinh lại theo ngôn ngữ mới.
   */
  private readonly fmt = inject(AnalyticsFormatService);

  ngOnChanges(): void {
    this.build();
  }

  trackBySlot(_: number, s: Slot): string {
    return s.label;
  }

  trackByGrid(i: number): number {
    return i;
  }

  showLabel(index: number): boolean {
    const total = this.slots.length;
    if (total <= 8) return true;
    return index % Math.ceil(total / 8) === 0;
  }

  private build(): void {
    this.slots = [];
    this.gridLines = [];

    const pairs = this.pairs || [];
    if (!pairs.length) return;

    // Math.max(..., 1): lọc ra toàn số 0 mà không chặn thì mọi tọa độ thành NaN
    // -> biểu đồ vô hình mà console vẫn sạch.
    const max = Math.max(...pairs.map(p => Math.max(p.expense, p.income)), 1);

    const chartWidth = this.viewWidth - this.paddingLeft;
    const chartHeight = this.viewHeight - this.paddingBottom - this.paddingTop;
    const baseline = this.paddingTop + chartHeight;

    const slotWidth = chartWidth / pairs.length;
    // Cột mảnh: chặn 24px và chừa khoảng thở trong ô, không lấp đầy slot.
    const barWidth = Math.max(2, Math.min(24, (slotWidth * 0.62) / 2));
    const gap = 2;   // khe màu nền giữa hai cột cạnh nhau

    this.slots = pairs.map((p, i) => {
      const center = this.paddingLeft + i * slotWidth + slotWidth / 2;
      const month = this.fmt.monthShort(p.monthKey);
      return {
        label: month,
        labelX: center,
        chi: this.toBar(center - barWidth - gap / 2, p.expense, max, chartHeight, baseline, barWidth,
          this.fmt.t('analytics.tooltipExpense', { month, amount: this.fmt.full(p.expense) })),
        thu: this.toBar(center + gap / 2, p.income, max, chartHeight, baseline, barWidth,
          this.fmt.t('analytics.tooltipIncome', { month, amount: this.fmt.full(p.income) }))
      };
    });

    for (let i = 0; i <= 2; i++) {
      const value = (max / 2) * i;
      this.gridLines.push({
        y: baseline - (value / max) * chartHeight,
        label: this.fmt.compact(Math.round(value))
      });
    }
  }

  private toBar(
    x: number,
    value: number,
    max: number,
    chartHeight: number,
    baseline: number,
    width: number,
    tooltip: string
  ): Bar {
    const height = (value / max) * chartHeight;
    return {
      x,
      y: baseline - height,
      width,
      height: Math.max(height, value > 0 ? 2 : 0),   // 1 đồng vẫn phải thấy được
      tooltip
    };
  }
}
