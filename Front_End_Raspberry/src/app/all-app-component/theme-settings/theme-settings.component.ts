import { Component, OnInit, inject } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';
import { LanguageService } from 'src/app/services/language.service';
import { Language } from 'src/app/i18n/types';

@Component({
  selector: 'app-theme-settings',
  templateUrl: './theme-settings.component.html',
  styleUrls: ['./theme-settings.component.scss']
})
export class ThemeSettingsComponent implements OnInit {
  loading = false;

  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  // Trang này chỉ là một khung nhìn của state trong service — không giữ bản sao.
  // Nút đổi theme/ngôn ngữ trên thanh tiêu đề đọc cùng signal, nên hai nơi luôn
  // khớp nhau mà không cần đồng bộ thủ công.
  readonly webDarkMode = this.themeService.webDarkMode;
  readonly mobileDarkMode = this.themeService.mobileDarkMode;
  readonly currentLanguage = this.languageService.language;
  readonly languages = this.languageService.available;

  ngOnInit(): void {
    // Đọc lại từ server để lấy `mobileDarkMode` mới nhất. Dark mode của web đã
    // được áp từ lúc khởi động app nên không nháy giao diện ở đây.
    this.loading = true;
    this.themeService.getThemeSetting().subscribe({
      next: (setting) => {
        this.themeService.applyWebDarkMode(setting.webDarkMode);
        this.themeService.primeSetting(setting);
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải cài đặt giao diện:', err);
        this.loading = false;
      }
    });
  }

  onToggleWebDark(): void {
    this.themeService.setWebDarkMode(!this.webDarkMode());
  }

  onToggleMobileDark(): void {
    this.themeService.setMobileDarkMode(!this.mobileDarkMode());
  }

  setLanguage(lang: Language): void {
    this.languageService.setLanguage(lang);
  }
}
