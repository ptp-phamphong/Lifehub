import { Component, Input, OnChanges } from '@angular/core';
import { CumulativePoint, CumulativeSeries } from 'src/app/model/expense-analytics.model';
import { formatCurrencyCompact, formatCurrencyFull } from '../expense-analytics.transform';

interface Diem {
  x: number;
  y: number;
  day: number;
  total: number;
}

/**
 * Chi lũy kế trong tháng - đường, dạng NHẤN MẠNH.
 *
 * Tháng neo là câu chuyện, tháng trước chỉ là bối cảnh -> tháng trước tô xám,
 * không phải hai chuỗi phân loại ngang hàng. Đây là dạng hay bị làm sai nhất:
 * lấy hai màu phân loại ra vẽ sẽ khiến người đọc không biết nên nhìn cái nào.
 *
 * Tháng đang diễn ra thì đường dừng ở HÔM NAY (transform tự cắt). Kéo phẳng tới
 * cuối tháng sẽ đọc thành "đã ngừng chi" - một lời nói dối.
 */
@Component({
  selector: 'app-cumulative-month-chart',
  templateUrl: './cumulative-month-chart.component.html',
  styleUrls: ['./cumulative-month-chart.component.scss']
})
export class CumulativeMonthChartComponent implements OnChanges {
  @Input() series: CumulativeSeries = {
    current: [], previous: [], currentLabel: '', previousLabel: '', daysInMonth: 31, isPartial: false
  };

  readonly viewWidth = 720;
  readonly viewHeight = 220;
  readonly paddingLeft = 54;
  readonly paddingRight = 8;
  readonly paddingBottom = 22;
  readonly paddingTop = 10;

  duongNay = '';
  duongTruoc = '';
  chotNay: Diem | null = null;
  gridLines: { y: number; label: string }[] = [];
  moc: { x: number; label: string }[] = [];

  formatFull = formatCurrencyFull;

  ngOnChanges(): void {
    this.build();
  }

  trackByGrid(i: number): number {
    return i;
  }

  private build(): void {
    this.duongNay = '';
    this.duongTruoc = '';
    this.chotNay = null;
    this.gridLines = [];
    this.moc = [];

    const s = this.series;
    if (!s || (!s.current.length && !s.previous.length)) return;

    const max = Math.max(
      ...s.current.map(p => p.total),
      ...s.previous.map(p => p.total),
      1
    );
    const days = Math.max(s.daysInMonth, 2);

    const chartWidth = this.viewWidth - this.paddingLeft - this.paddingRight;
    const chartHeight = this.viewHeight - this.paddingBottom - this.paddingTop;
    const baseline = this.paddingTop + chartHeight;

    const toX = (day: number) => this.paddingLeft + ((day - 1) / (days - 1)) * chartWidth;
    const toY = (total: number) => baseline - (total / max) * chartHeight;

    const map = (pts: CumulativePoint[]): Diem[] =>
      pts.map(p => ({ x: toX(p.day), y: toY(p.total), day: p.day, total: p.total }));

    const nay = map(s.current);
    const truoc = map(s.previous);

    this.duongNay = toPath(nay);
    this.duongTruoc = toPath(truoc);
    this.chotNay = nay.length ? nay[nay.length - 1] : null;

    for (let i = 0; i <= 2; i++) {
      const value = (max / 2) * i;
      this.gridLines.push({ y: toY(value), label: formatCurrencyCompact(Math.round(value)) });
    }

    for (const d of [1, 5, 10, 15, 20, 25, days]) {
      if (d <= days) this.moc.push({ x: toX(d), label: `${d}` });
    }
  }
}

function toPath(pts: Diem[]): string {
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
