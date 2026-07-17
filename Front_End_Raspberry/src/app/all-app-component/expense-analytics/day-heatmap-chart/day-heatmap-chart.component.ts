import { Component, Input } from '@angular/core';
import { HeatCell, HeatmapModel } from 'src/app/model/expense-analytics.model';
import { formatCurrencyCompact, formatCurrencyFull } from '../expense-analytics.transform';

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
  @Input() model: HeatmapModel = { weeks: [], clampMax: 0, hasClamped: false, monthLabel: '' };

  readonly thu = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  readonly bacRamp = [1, 2, 3, 4, 5, 6];

  trackByWeek(i: number): number {
    return i;
  }

  trackByCell(_: number, c: HeatCell): string {
    return c.dayKey || `pad-${_}`;
  }

  tooltip(c: HeatCell): string {
    if (c.isPadding) return '';
    if (c.isFuture) return `Ngày ${c.day}: chưa tới`;
    if (c.total <= 0) return `Ngày ${c.day}: không chi`;
    return `Ngày ${c.day}: ${formatCurrencyFull(c.total)} · ${c.count} khoản`;
  }

  /** Nhãn cho thang màu; mốc cao nhất ghi "≥" vì giá trị trên ngưỡng đều bị kẹp. */
  get nhanCao(): string {
    return (this.model.hasClamped ? '≥ ' : '') + formatCurrencyCompact(this.model.clampMax);
  }
}
