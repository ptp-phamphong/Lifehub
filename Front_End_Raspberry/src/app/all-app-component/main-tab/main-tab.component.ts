import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';
import { Language } from '../../i18n/types';

@Component({
  selector: 'app-main-tab',
  templateUrl: './main-tab.component.html',
  styleUrls: ['./main-tab.component.scss']
})
export class MainTabComponent {
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  // Đọc thẳng signal của service, không giữ bản sao trong component: trang Cài
  // đặt giao diện cũng đổi được hai giá trị này, có bản sao là sẽ lệch nhau.
  readonly isDarkMode = this.themeService.webDarkMode;
  readonly currentLanguage = this.languageService.language;
  readonly languages = this.languageService.available;

  constructor(private authService: AuthService, private router: Router) {}

  toggleDarkMode(): void {
    this.themeService.setWebDarkMode(!this.isDarkMode());
  }

  setLanguage(lang: Language): void {
    this.languageService.setLanguage(lang);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
