import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/services/language.service';

/**
 * Định dạng tiền và tháng cho trang Phân tích chi tiêu.
 *
 * Vì sao cần một service riêng thay vì để `expense-analytics.transform.ts` tự
 * lo: tầng transform là HÀM THUẦN, cố ý không biết `TranslateService` là gì
 * (cùng nguyên tắc đã áp cho `utils/lunar-calendar.ts`). Nhưng chuỗi tiền và
 * nhãn tháng lại cần cả locale lẫn từ điển, và **năm component biểu đồ** đều
 * dựng chúng bên trong `build()` của mình. Gom vào đây là chỗ duy nhất phải
 * biết ngôn ngữ hiện tại.
 *
 * Không cache gì cả: mọi hàm đọc `locale()` / `translate.instant()` ngay lúc
 * gọi, nên đổi ngôn ngữ xong thì lần dựng lại kế tiếp đã ra chuỗi mới.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsFormatService {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  /** '1.250.000 VNĐ' / '1,250,000 VND'. Giống hệt trang Chi tiêu để hai trang khớp nhau. */
  full(amount?: number): string {
    const suffix = this.translate.instant('common.currencySuffix');
    return `${(amount || 0).toLocaleString(this.language.locale())} ${suffix}`;
  }

  /**
   * Bản rút gọn cho nhãn trục, nơi chuỗi đầy đủ quá dài.
   *
   * Cả con số lẫn khoảng trắng đều nằm trong mẫu dịch: tiếng Việt viết
   * `12,5 tr` (dấu phẩy thập phân, có dấu cách), tiếng Anh viết `12.5M`.
   */
  compact(amount: number): string {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return this.compactAt('analytics.compactBillion', amount / 1_000_000_000);
    if (abs >= 1_000_000) return this.compactAt('analytics.compactMillion', amount / 1_000_000);
    if (abs >= 1_000) return this.compactAt('analytics.compactThousand', amount / 1_000);
    return amount.toLocaleString(this.language.locale());
  }

  private compactAt(key: string, value: number): string {
    const shown = value.toLocaleString(this.language.locale(), { maximumFractionDigits: 1 });
    return this.translate.instant(key, { value: shown });
  }

  /** Phần trăm theo locale: '12,5%' / '12.5%'. */
  percent(value: number, digits = 1): string {
    return value.toLocaleString(this.language.locale(), { maximumFractionDigits: digits }) + '%';
  }

  /**
   * Nhãn trục X: 'T7/26' / 'Jul 26'.
   *
   * Mẫu nằm trong từ điển và được cấp đủ tham số cho cả hai kiểu viết — tiếng
   * Việt dùng số tháng, tiếng Anh dùng tên tháng viết tắt. Không dùng `Intl`
   * trực tiếp cho cả hai vì `vi-VN` trả `thg 7`, dài hơn `T7` và sẽ tràn nhãn
   * ở cột hẹp (cùng lý do đã chọn từ điển cho tiêu đề cột lịch ở Thời khóa biểu).
   */
  monthShort(key: string): string {
    const [y, m] = key.split('-').map(Number);
    const mon = new Date(y, m - 1, 1)
      .toLocaleDateString(this.language.locale(), { month: 'short' });
    return this.translate.instant('analytics.monthShort', {
      m,
      mon,
      y2: String(y).slice(2),
      y
    });
  }

  /**
   * Tên tháng đầy đủ dùng GIỮA CÂU: 'tháng 7 năm 2026' / 'July 2026'.
   *
   * Đây là dạng gốc `Intl` trả về. KHÔNG tự hạ chữ thường ở chỗ gọi — bản cũ
   * làm `anchorLabel.toLowerCase()`, sang tiếng Anh sẽ ra `july 2026` (sai
   * chính tả). Hai dạng viết hoa/thường tách thành hai hàm chính vì lý do đó.
   */
  monthInline(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1)
      .toLocaleDateString(this.language.locale(), { month: 'long', year: 'numeric' });
  }

  /** Tên tháng làm TIÊU ĐỀ: 'Tháng 7 năm 2026' / 'July 2026'. */
  monthTitle(key: string): string {
    const raw = this.monthInline(key);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  /** Giờ nạp dữ liệu, chỉ giờ và phút. */
  time(value: Date): string {
    return value.toLocaleTimeString(this.language.locale(), { hour: '2-digit', minute: '2-digit' });
  }

  /** Cho component nào cần dịch một khoá lẻ mà không muốn tự inject thêm service. */
  t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }
}
