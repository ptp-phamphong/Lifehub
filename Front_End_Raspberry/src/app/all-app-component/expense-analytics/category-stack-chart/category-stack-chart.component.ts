import { Component, Input, OnChanges, inject } from '@angular/core';
import { StackModel } from 'src/app/model/expense-analytics.model';
import { AnalyticsFormatService } from '../analytics-format.service';

interface Piece {
  x: number;
  y: number;
  width: number;
  height: number;
  slot: number;
  tooltip: string;
}

interface Column {
  label: string;
  labelX: number;
  pieces: Piece[];
}

/**
 * Cơ cấu loại chi qua các tháng - cột chồng.
 *
 * Slot màu do tầng transform gán MỘT LẦN trên cả cửa sổ thời gian, không phải
 * xếp hạng lại theo từng tháng: nếu gán theo cột thì một loại sẽ đổi màu giữa
 * các tháng và biểu đồ thành vô nghĩa.
 *
 * Các đoạn tách nhau bằng KHE 2px màu nền, không phải bằng viền: viền là mực
 * không mang dữ liệu.
 */
@Component({
  selector: 'app-category-stack-chart',
  templateUrl: './category-stack-chart.component.html',
  styleUrls: ['./category-stack-chart.component.scss']
})
export class CategoryStackChartComponent implements OnChanges {
  /**
   * `otherLabel` mặc định để rỗng: nhãn thật do tầng transform chọn (có thể
   * khác 'Khác' nếu người dùng đã có một loại tên đúng như vậy), và biểu đồ
   * chỉ hiển thị lại chứ không tự đặt tên.
   */
  @Input() model: StackModel = { columns: [], legend: [], otherLabel: '' };

  readonly viewWidth = 720;
  readonly viewHeight = 190;
  readonly paddingLeft = 54;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  columns: Column[] = [];
  gridLines: { y: number; label: string }[] = [];

  /** Nhãn/tooltip nằm trong SVG — xem chú thích ở `income-expense-chart`. */
  private readonly fmt = inject(AnalyticsFormatService);

  ngOnChanges(): void {
    this.build();
  }

  trackByColumn(_: number, c: Column): string {
    return c.label;
  }

  trackByPiece(i: number): number {
    return i;
  }

  trackByGrid(i: number): number {
    return i;
  }

  showLabel(index: number): boolean {
    const total = this.columns.length;
    if (total <= 8) return true;
    return index % Math.ceil(total / 8) === 0;
  }

  private build(): void {
    this.columns = [];
    this.gridLines = [];

    const cols = this.model?.columns || [];
    if (!cols.length) return;

    const max = Math.max(...cols.map(c => c.total), 1);

    const chartWidth = this.viewWidth - this.paddingLeft;
    const chartHeight = this.viewHeight - this.paddingBottom - this.paddingTop;
    const baseline = this.paddingTop + chartHeight;

    const slotWidth = chartWidth / cols.length;
    const barWidth = Math.max(2, Math.min(24, slotWidth * 0.6));
    const gap = 2;

    this.columns = cols.map((c, i) => {
      const x = this.paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      const month = this.fmt.monthShort(c.monthKey);
      const pieces: Piece[] = [];

      let cursor = baseline;
      for (const seg of c.segments) {
        const raw = (seg.value / max) * chartHeight;
        // Trừ khe đi nhưng vẫn giữ đoạn nhìn thấy được khi nó quá mỏng.
        const height = Math.max(raw - gap, 1);
        const y = cursor - height;

        pieces.push({
          x,
          y,
          width: barWidth,
          height,
          slot: seg.slot,
          // `seg.label` là tên loại từ DB (hoặc nhãn nhóm gộp đã dịch sẵn ở
          // tầng transform) — chèn nguyên văn.
          tooltip: this.fmt.t('analytics.tooltipStack', {
            month,
            category: seg.label,
            amount: this.fmt.full(seg.value)
          })
        });

        cursor -= raw;
      }

      return { label: month, labelX: x + barWidth / 2, pieces };
    });

    for (let i = 0; i <= 2; i++) {
      const value = (max / 2) * i;
      this.gridLines.push({
        y: baseline - (value / max) * chartHeight,
        label: this.fmt.compact(Math.round(value))
      });
    }
  }
}
