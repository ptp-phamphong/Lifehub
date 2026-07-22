import { Component, Input } from '@angular/core';
import { VisitorDailyPoint, VisitorSummary } from 'src/app/model/visitor-log.model';

@Component({
  selector: 'app-visitor-overview',
  templateUrl: './visitor-overview.component.html',
  styleUrls: ['./visitor-overview.component.scss']
})
export class VisitorOverviewComponent {
  @Input() summary: VisitorSummary | null = null;

  /** Chỉ có dữ liệu khi đang chọn khoảng "Tất cả" - xem visitor-log-page.component.ts */
  @Input() history: VisitorDailyPoint[] = [];

  /**
   * `s` / `m` là ký hiệu đơn vị quốc tế nên không dịch — cùng cách xử lý với
   * `ms`, `GiB`, `°C` ở các feature khác.
   */
  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '-';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}m ${rest}s`;
  }

  /** Bề rộng thanh trong bảng xếp hạng, tính theo mục cao nhất. */
  barWidth(count: number, items: { count: number }[]): string {
    if (!items || !items.length) return '0%';
    const max = Math.max(...items.map(i => i.count), 1);
    return `${Math.round((count / max) * 100)}%`;
  }
}
