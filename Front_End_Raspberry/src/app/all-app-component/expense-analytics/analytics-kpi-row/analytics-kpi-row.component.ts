import { Component, Input, inject } from '@angular/core';
import { KpiTile } from 'src/app/model/expense-analytics.model';
import { AnalyticsFormatService } from '../analytics-format.service';

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

  private readonly fmt = inject(AnalyticsFormatService);

  format = (value: number) => this.fmt.full(value);

  trackByLabel(_: number, t: KpiTile): string {
    return t.labelKey;
  }

  /**
   * Chú thích dưới thẻ.
   *
   * `hintParams.prevMonthKey` là khóa thô ('2026-06') và được định dạng ở ĐÂY
   * chứ không phải lúc dựng view-model: chỉ chỗ này mới biết ngôn ngữ đang
   * chọn. Dùng dạng viết giữa câu (`monthInline`) thay vì tự hạ chữ thường —
   * `'July 2026'.toLowerCase()` sẽ ra `'july 2026'`, sai chính tả tiếng Anh.
   */
  hint(t: KpiTile): string {
    const params = { ...(t.hintParams || {}) } as Record<string, unknown>;
    if (params['prevMonthKey']) {
      params['month'] = this.fmt.monthInline(params['prevMonthKey'] as string);
    }
    return this.fmt.t(t.hintKey, params);
  }

  /** '+12,3%' / '-4%' - dấu luôn hiện để đọc được hướng ngay. */
  deltaText(t: KpiTile): string {
    if (t.deltaPercent === null) return '—';
    const sign = t.deltaPercent > 0 ? '+' : '';
    return sign + this.fmt.percent(t.deltaPercent);
  }

  /**
   * Không so sánh được khi mốc trước bằng 0 - mọi phần trăm đều là bịa.
   * UI nói thẳng là không có gì để so.
   */
  deltaTitle(t: KpiTile): string {
    if (t.deltaPercent === null) return this.fmt.t('analytics.kpiNoCompare');
    return this.hint(t);
  }

  /** Màu theo hướng NHÂN với tăng-là-tốt-hay-xấu: chi tăng là xấu, thu tăng là tốt. */
  deltaClass(t: KpiTile): string {
    if (t.deltaPercent === null || t.deltaPercent === 0) return 'flat';
    const tot = t.deltaPercent > 0 === t.higherIsBetter;
    return tot ? 'good' : 'bad';
  }

  deltaArrow(t: KpiTile): string {
    if (t.deltaPercent === null || t.deltaPercent === 0) return '';
    return t.deltaPercent > 0 ? 'arrow_drop_up' : 'arrow_drop_down';
  }
}
