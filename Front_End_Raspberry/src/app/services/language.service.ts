import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LOCALE_BY_LANGUAGE,
  Language,
  isLanguage,
} from '../i18n/types';

/**
 * Nguồn sự thật cho ngôn ngữ đang dùng.
 *
 * Cùng vai trò với `ThemeService` đối với dark mode, nhưng lưu ở localStorage
 * chứ không gọi API: preference ngôn ngữ hiện chưa có chỗ chứa ở backend.
 * Muốn đồng bộ giữa nhiều thiết bị thì thêm key `LANG_WEB` vào bảng
 * `SystemConfiguration` (giống `THEME_WEB_DARK`) — chỗ đọc/ghi nằm gọn trong
 * service này nên không phải sửa component nào.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'web-language';
  private readonly translate = inject(TranslateService);

  private readonly _language = signal<Language>(DEFAULT_LANGUAGE);

  /** Ngôn ngữ đang hiển thị. */
  readonly language = this._language.asReadonly();

  /**
   * Locale cho DatePipe/CurrencyPipe. Phải truyền tường minh vào từng pipe —
   * `{{ x | date:'short':undefined:locale() }}` — vì `LOCALE_ID` cố định lúc
   * bootstrap nên không tự đổi khi người dùng chuyển ngôn ngữ.
   */
  readonly locale = computed(() => LOCALE_BY_LANGUAGE[this._language()]);

  readonly available = LANGUAGES;

  /** Gọi một lần lúc app khởi động, trước khi render. */
  init(): void {
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);
    this.apply(this.resolveInitialLanguage());
  }

  setLanguage(lang: Language): void {
    if (lang === this._language()) return;
    this.apply(lang);
    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
    } catch {
      // Chế độ riêng tư chặn localStorage — vẫn đổi được ngôn ngữ, chỉ là
      // không nhớ cho lần sau.
    }
  }

  private apply(lang: Language): void {
    this._language.set(lang);
    this.translate.use(lang);
    // Cho screen reader và cơ chế gợi ý dịch của trình duyệt biết ngôn ngữ trang.
    document.documentElement.lang = lang;
  }

  /**
   * Thứ tự ưu tiên: lựa chọn đã lưu → ngôn ngữ trình duyệt → tiếng Việt.
   * (Khi nào backend lưu được preference thì chèn nó lên trước localStorage.)
   */
  private resolveInitialLanguage(): Language {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (isLanguage(saved)) return saved;
    } catch {
      // bỏ qua, rơi xuống ngôn ngữ trình duyệt
    }

    // `navigator.language` dạng 'en-US' / 'vi-VN' nên chỉ lấy phần trước dấu '-'.
    const browserLang = navigator.language?.split('-')[0];
    return isLanguage(browserLang) ? browserLang : DEFAULT_LANGUAGE;
  }
}
