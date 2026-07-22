import { Component, Input, inject } from '@angular/core';
import { RankRow } from 'src/app/model/expense-analytics.model';
import { AnalyticsFormatService } from '../analytics-format.service';

/**
 * Chi theo loại - thanh ngang xếp hạng.
 *
 * MỌI THANH DÙNG CHUNG MỘT MÀU. Loại chi là danh định: đổi thứ tự không đổi
 * nghĩa. Tô đậm dần theo giá trị sẽ tiêu kênh màu để mã hóa lại đúng cái mà độ
 * dài thanh đã nói - vừa thừa vừa hỏng luật màu phân loại.
 *
 * Dùng HTML/CSS chứ không phải SVG: tên loại tiếng Việt dài và biến thiên, nên
 * cắt chữ và canh nhãn là miễn phí trong flex nhưng rất lằng nhằng trong SVG.
 */
@Component({
  selector: 'app-category-rank-chart',
  templateUrl: './category-rank-chart.component.html',
  styleUrls: ['./category-rank-chart.component.scss']
})
export class CategoryRankChartComponent {
  @Input() rows: RankRow[] = [];

  private readonly fmt = inject(AnalyticsFormatService);

  format = (value: number) => this.fmt.full(value);

  trackByLabel(_: number, r: RankRow): string {
    return r.label;
  }

  get total(): number {
    return (this.rows || []).reduce((s, r) => s + r.total, 0);
  }

  /** Tỷ trọng trên tổng - con số người ta thực sự muốn biết khi nhìn xếp hạng. */
  share(r: RankRow): string {
    const t = this.total;
    if (!t) return this.fmt.percent(0);
    return this.fmt.percent((r.total / t) * 100);
  }
}
