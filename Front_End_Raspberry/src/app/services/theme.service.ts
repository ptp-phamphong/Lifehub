import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ThemeSetting {
  webDarkMode: boolean;
  mobileDarkMode: boolean;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'web-dark-mode';

  constructor(private http: HttpClient) {}

  /** Load theme from API and apply to body */
  loadAndApplyTheme(): void {
    this.http.get<ThemeSetting>(`${environment.apiBaseUrl}/GetThemeSetting`).subscribe({
      next: (setting) => {
        this.applyWebDarkMode(setting.webDarkMode);
        localStorage.setItem(this.STORAGE_KEY, String(setting.webDarkMode));
      },
      error: () => {
        // Fallback to localStorage cache
        const cached = localStorage.getItem(this.STORAGE_KEY);
        if (cached === 'true') {
          this.applyWebDarkMode(true);
        }
      }
    });
  }

  /** Apply or remove dark-theme class on body */
  applyWebDarkMode(dark: boolean): void {
    if (dark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  getThemeSetting() {
    return this.http.get<ThemeSetting>(`${environment.apiBaseUrl}/GetThemeSetting`);
  }

  updateThemeSetting(setting: ThemeSetting) {
    return this.http.put<boolean>(`${environment.apiBaseUrl}/UpdateThemeSetting`, setting);
  }
}
