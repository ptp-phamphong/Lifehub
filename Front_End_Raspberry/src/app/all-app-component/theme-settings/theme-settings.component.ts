import { Component, OnInit } from '@angular/core';
import { ThemeService, ThemeSetting } from 'src/app/services/theme.service';

@Component({
  selector: 'app-theme-settings',
  templateUrl: './theme-settings.component.html',
  styleUrls: ['./theme-settings.component.scss']
})
export class ThemeSettingsComponent implements OnInit {
  setting: ThemeSetting = { webDarkMode: false, mobileDarkMode: false };
  loading = false;
  saving = false;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.loading = true;
    this.themeService.getThemeSetting().subscribe({
      next: (data) => {
        this.setting = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Loi khi tai theme setting:', err);
        this.loading = false;
      }
    });
  }

  onToggleWebDark(): void {
    this.setting.webDarkMode = !this.setting.webDarkMode;
    this.save();
    this.themeService.applyWebDarkMode(this.setting.webDarkMode);
  }

  onToggleMobileDark(): void {
    this.setting.mobileDarkMode = !this.setting.mobileDarkMode;
    this.save();
  }

  private save(): void {
    this.saving = true;
    this.themeService.updateThemeSetting(this.setting).subscribe({
      next: () => {
        this.saving = false;
      },
      error: (err) => {
        console.error('Loi khi luu theme setting:', err);
        this.saving = false;
      }
    });
  }
}
