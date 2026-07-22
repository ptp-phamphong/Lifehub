import { Component, Input, inject } from '@angular/core';
import { HeatCell, HeatmapModel } from 'src/app/model/expense-analytics.model';
import { WEEK_DOW_KEYS } from 'src/app/utils/day-of-week';
import { AnalyticsFormatService } from '../analytics-format.service';

/**
 * Nhiệt chi theo ngày trong tháng - lưới lịch.
 *
 * Ramp MỘT SẮC, đậm dần theo mức chi (mã hóa độ lớn, không phải danh tính) nên
 * không bao giờ dùng bảng màu phân loại ở đây.
 *
 * Ô "không chi" mang bậc riêng chứ không phải bậc 1: "không chi" không được
 * trông như "chi ít". Ở nền tối, bậc 1 nằm khá sát nền nên ô rỗng có thêm viền.
 */
@Component({
  selector: 'app-day-heatmap-chart',
  templateUrl: './day-heatmap-chart.component.html',
  styleUrls: ['./day-heatmap-chart.component.scss']
})
export class DayHeatmapChartComponent {
  @Input() model: HeatmapModel = { weeks: [], clampMax: 0, hasClamped: false, monthKey: '' };

  readonly dowKeys = WEEK_DOW_KEYS;
  readonly bacRamp = [1, 2, 3, 4, 5, 6];

  private readonly fmt = inject(AnalyticsFormatService);

  trackByWeek(i: number): number {
    return i;
  }

  trackByCell(_: number, c: HeatCell): string {
    return c.dayKey || `pad-${_}`;
  }

  /**
   * Tooltip là thuộc tính `title` nên phải dựng thành chuỗi ở đây; getter/hàm
   * trong template được tính lại mỗi chu kỳ change detection nên đổi ngôn ngữ
   * là đổi chữ ngay, không cần dựng lại model.
   */
  tooltip(c: HeatCell): string {
    if (c.isPadding) return '';
    if (c.isFuture) return this.fmt.t('analytics.tooltipHeatFuture', { day: c.day });
    if (c.total <= 0) return this.fmt.t('analytics.tooltipHeatEmpty', { day: c.day });
    return this.fmt.t('analytics.tooltipHeatValue', {
      day: c.day,
      amount: this.fmt.full(c.total),
      count: c.count
    });
  }

  /** Nhãn cho thang màu; mốc cao nhất ghi "≥" vì giá trị trên ngưỡng đều bị kẹp. */
  get nhanCao(): string {
    return (this.model.hasClamped ? '≥ ' : '') + this.fmt.compact(this.model.clampMax);
  }
}
