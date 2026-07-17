import { Component, Input, OnChanges } from '@angular/core';
import { WeekdayRow } from 'src/app/model/expense-analytics.model';
import { formatCurrencyCompact, formatCurrencyFull } from '../expense-analytics.transform';

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  label: string;
  tooltip: string;
}

/**
 * Chi theo thứ trong tuần - cột, một chuỗi.
 *
 * Một chuỗi thì KHÔNG cần ô chú giải: chỉ có một màu, tiêu đề đã nói rõ đang vẽ
 * cái gì. Một ô chú giải một mục chỉ lặp lại tiêu đề và tốn chỗ.
 *
 * Thứ tự T2..CN do tầng transform xoay sẵn (getDay() trả 0 = Chủ nhật).
 */
@Component({
  selector: 'app-weekday-chart',
  templateUrl: './weekday-chart.component.html',
  styleUrls: ['./weekday-chart.component.scss']
})
export class WeekdayChartComponent implements OnChanges {
  @Input() rows: WeekdayRow[] = [];

  readonly viewWidth = 720;
  readonly viewHeight = 200;
  readonly paddingLeft = 54;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  bars: Bar[] = [];
  gridLines: { y: number; label: string }[] = [];

  formatFull = formatCurrencyFull;

  ngOnChanges(): void {
    this.build();
  }

  trackByLabel(_: number, b: Bar): string {
    return b.label;
  }

  trackByGrid(i: number): number {
    return i;
  }

  private build(): void {
    this.bars = [];
    this.gridLines = [];

    const rows = this.rows || [];
    if (!rows.length) return;

    const max = Math.max(...rows.map(r => r.total), 1);

    const chartWidth = this.viewWidth - this.paddingLeft;
    const chartHeight = this.viewHeight - this.paddingBottom - this.paddingTop;
    const baseline = this.paddingTop + chartHeight;

    const slotWidth = chartWidth / rows.length;
    const barWidth = Math.max(2, Math.min(24, slotWidth * 0.5));

    this.bars = rows.map((r, i) => {
      const height = (r.total / max) * chartHeight;
      const x = this.paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      return {
        x,
        y: baseline - height,
        width: barWidth,
        height: Math.max(height, r.total > 0 ? 2 : 0),
        centerX: x + barWidth / 2,
        label: r.label,
        tooltip: `${r.label}: ${formatCurrencyFull(r.total)} · ${r.count} khoản`
      };
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
