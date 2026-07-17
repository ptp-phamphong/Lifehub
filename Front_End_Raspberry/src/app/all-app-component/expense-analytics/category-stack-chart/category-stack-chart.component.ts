import { Component, Input, OnChanges } from '@angular/core';
import { StackModel } from 'src/app/model/expense-analytics.model';
import { formatCurrencyCompact, formatCurrencyFull } from '../expense-analytics.transform';

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
  @Input() model: StackModel = { columns: [], legend: [], otherLabel: 'Khác' };

  readonly viewWidth = 720;
  readonly viewHeight = 240;
  readonly paddingLeft = 54;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  columns: Column[] = [];
  gridLines: { y: number; label: string }[] = [];

  formatFull = formatCurrencyFull;

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
          tooltip: `${c.label} · ${seg.label}: ${formatCurrencyFull(seg.value)}`
        });

        cursor -= raw;
      }

      return { label: c.label, labelX: x + barWidth / 2, pieces };
    });

    for (let i = 0; i <= 2; i++) {
      const value = (max / 2) * i;
      this.gridLines.push({
        y: baseline - (value / max) * chartHeight,
        label: formatCurrencyCompact(Math.round(value))
      });
    }
  }
}
