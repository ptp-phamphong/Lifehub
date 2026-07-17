import { Component, Input } from '@angular/core';
import { KpiTile } from 'src/app/model/expense-analytics.model';
import { formatCurrencyFull } from '../expense-analytics.transform';

/**
 * Hàng thẻ số. Không phải biểu đồ: bốn con số đơn lẻ thì thẻ số là dạng đúng,
 * vẽ thành biểu đồ cột 1 cột chỉ tổ rối.
 */
@Component({
  selector: 'app-analytics-kpi-row',
  templateUrl: './analytics-kpi-row.component.html',
  styleUrls: ['./analytics-kpi-row.component.scss']
})
export class AnalyticsKpiRowComponent {
  @Input() tiles: KpiTile[] = [];

  format = formatCurrencyFull;

  trackByLabel(_: number, t: KpiTile): string {
    return t.label;
  }

  /** '+12,3%' / '-4%' - dấu luôn hiện để đọc được hướng ngay. */
  deltaText(t: KpiTile): string {
    if (t.deltaPercent === null) return '—';
    const sign = t.deltaPercent > 0 ? '+' : '';
    return `${sign}${t.deltaPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
  }

  /**
   * Không so sánh được khi mốc trước bằng 0 - mọi phần trăm đều là bịa.
   * UI nói thẳng là không có gì để so.
   */
  deltaTitle(t: KpiTile): string {
    if (t.deltaPercent === null) return 'Không có dữ liệu tháng trước để so sánh';
    return t.hint;
  }

  /** Màu theo hướng NHÂN với tăng-là-tốt-hay-xấu: chi tăng là xấu, thu tăng là tốt. */
  deltaClass(t: KpiTile): string {
    if (t.deltaPercent === null || t.deltaPercent === 0) return 'flat';
    const tot = t.deltaPercent > 0 === t.higherIsBetter;
    return tot ? 'good' : 'bad';
  }

  deltaArrow(t: KpiTile): string {
    if (t.deltaPercent === null || t.deltaPercent === 0) return '';
    return t.deltaPercent > 0 ? '▲' : '▼';
  }
}
