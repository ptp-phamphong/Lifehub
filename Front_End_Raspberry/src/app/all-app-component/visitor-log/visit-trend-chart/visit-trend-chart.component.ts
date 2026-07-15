import { Component, Input, OnChanges } from '@angular/core';
import { VisitorDailyPoint } from 'src/app/model/visitor-log.model';

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  views: number;
  visitors: number;
}

/**
 * Biểu đồ cột vẽ tay bằng SVG.
 *
 * Cố tình KHÔNG dùng thư viện chart: chart.js vẽ lên <canvas> nên không đọc được
 * biến CSS (var(--color-*)), sẽ thành một mảng trắng chói giữa nền tối.
 * SVG thì dùng thẳng var(--...) trong fill/stroke nên tự đổi màu theo dark mode.
 */
@Component({
  selector: 'app-visit-trend-chart',
  templateUrl: './visit-trend-chart.component.html',
  styleUrls: ['./visit-trend-chart.component.scss']
})
export class VisitTrendChartComponent implements OnChanges {
  @Input() points: VisitorDailyPoint[] = [];
  @Input() title: string = '';

  // Toạ độ trong hệ viewBox; SVG tự co giãn theo bề rộng thật của khung.
  readonly viewWidth = 720;
  readonly viewHeight = 200;
  readonly paddingLeft = 34;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  bars: Bar[] = [];
  maxViews = 0;
  gridLines: { y: number; value: number }[] = [];

  ngOnChanges(): void {
    this.build();
  }

  private build(): void {
    this.bars = [];
    this.gridLines = [];

    const points = this.points || [];
    if (!points.length) {
      this.maxViews = 0;
      return;
    }

    this.maxViews = Math.max(...points.map(p => p.views), 1);

    const chartWidth = this.viewWidth - this.paddingLeft;
    const chartHeight = this.viewHeight - this.paddingBottom - this.paddingTop;

    const slot = chartWidth / points.length;
    const barWidth = Math.max(1, Math.min(28, slot * 0.65));

    this.bars = points.map((p, i) => {
      const height = (p.views / this.maxViews) * chartHeight;

      return {
        x: this.paddingLeft + i * slot + (slot - barWidth) / 2,
        y: this.paddingTop + (chartHeight - height),
        width: barWidth,
        height: Math.max(height, p.views > 0 ? 2 : 0), // luôn thấy được cột dù chỉ 1 lượt
        label: this.formatDate(p.date),
        views: p.views,
        visitors: p.visitors
      };
    });

    // 3 đường lưới ngang: 0, giữa, đỉnh.
    for (let i = 0; i <= 2; i++) {
      const value = Math.round((this.maxViews / 2) * i);
      const y = this.paddingTop + chartHeight - (value / this.maxViews) * chartHeight;
      this.gridLines.push({ y, value });
    }
  }

  /** Nhãn trục X: chỉ hiện vài mốc để không bị chồng chữ khi có nhiều ngày. */
  showLabel(index: number): boolean {
    const total = this.bars.length;
    if (total <= 8) return true;
    const step = Math.ceil(total / 8);
    return index % step === 0;
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}
