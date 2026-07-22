import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ThemeSetting {
  webDarkMode: boolean;
  mobileDarkMode: boolean;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'web-dark-mode';

  /**
   * Trạng thái dark mode của web, dạng signal để nhiều chỗ cùng đọc.
   * Cần thiết vì giờ có HAI nơi bật/tắt: nút trên thanh tiêu đề và thẻ trong
   * trang Cài đặt giao diện — không có state chung thì hai nơi sẽ lệch nhau.
   */
  private readonly _webDarkMode = signal(false);
  readonly webDarkMode = this._webDarkMode.asReadonly();

  /** Dark mode của app di động — chỉ lưu/hiển thị ở đây, web không dùng tới. */
  private readonly _mobileDarkMode = signal(false);
  readonly mobileDarkMode = this._mobileDarkMode.asReadonly();

  /**
   * Bản `ThemeSetting` đầy đủ lấy được lần gần nhất.
   * Giữ lại vì API `UpdateThemeSetting` nhận CẢ HAI cờ: bật dark mode cho web
   * mà gửi kèm `mobileDarkMode` đoán bừa thì sẽ ghi đè mất cài đặt của mobile.
   */
  private lastKnownSetting: ThemeSetting | null = null;

  constructor(private http: HttpClient) {}

  /** Load theme from API and apply to body */
  loadAndApplyTheme(): void {
    this.http.get<ThemeSetting>(`${environment.apiBaseUrl}/GetThemeSetting`).subscribe({
      next: (setting) => {
        this.rememberSetting(setting);
        this.applyWebDarkMode(setting.webDarkMode);
      },
      error: () => {
        // Fallback to localStorage cache
        this.applyWebDarkMode(localStorage.getItem(this.STORAGE_KEY) === 'true');
      }
    });
  }

  /**
   * Gắn/gỡ class trên body và đồng bộ signal + localStorage.
   * Chỉ đổi giao diện, KHÔNG gọi API — dùng khi đang áp lại trạng thái đã biết.
   */
  applyWebDarkMode(dark: boolean): void {
    // Ép về boolean là BẮT BUỘC, không phải cho gọn. `classList.toggle(name, force)`
    // coi `force === undefined` là "không truyền tham số" rồi LẬT trạng thái —
    // nên nếu server trả payload thiếu `webDarkMode`, dark mode sẽ tự bật/tắt
    // mỗi lần tải trang. Kiểu TypeScript ở đây là `boolean` nhưng JSON lúc chạy
    // thì không đảm bảo gì.
    const isDark = !!dark;

    this._webDarkMode.set(isDark);
    document.body.classList.toggle('dark-theme', isDark);
    try {
      localStorage.setItem(this.STORAGE_KEY, String(isDark));
    } catch {
      // Chế độ riêng tư/hết dung lượng: mất cache là chấp nhận được, không chặn UI.
    }
  }

  /**
   * Đổi dark mode cho web rồi lưu lên server.
   * Đổi giao diện trước, gọi API sau — người dùng thấy phản hồi ngay kể cả khi
   * mạng chậm, và nếu server lỗi thì lựa chọn vẫn còn trong localStorage.
   */
  setWebDarkMode(dark: boolean): void {
    this.applyWebDarkMode(dark);

    this.saveField('webDarkMode', dark);
  }

  /** Đổi dark mode cho app di động. Web không đổi giao diện theo cờ này. */
  setMobileDarkMode(dark: boolean): void {
    this._mobileDarkMode.set(dark);
    this.saveField('mobileDarkMode', dark);
  }

  /**
   * Ghi MỘT cờ lên server mà không đụng cờ còn lại.
   * `UpdateThemeSetting` nhận cả object nên phải biết giá trị hiện tại của cờ
   * kia; nếu chưa từng load được thì đọc lại trước khi ghi, thay vì đoán và
   * ghi đè mất cài đặt của bên kia.
   */
  private saveField<K extends keyof ThemeSetting>(field: K, value: boolean): void {
    if (this.lastKnownSetting) {
      this.persist({ ...this.lastKnownSetting, [field]: value });
      return;
    }

    this.getThemeSetting().subscribe({
      next: (setting) => {
        this.rememberSetting(setting);
        this.persist({ ...setting, [field]: value });
      },
      error: () => {
        // Vẫn không đọc được: giữ ở localStorage thôi, KHÔNG ghi lên server —
        // ghi bừa sẽ xoá mất cài đặt của bên kia.
        console.error('Không đọc được cài đặt giao diện nên chưa lưu lên server.');
      }
    });
  }

  /** Nạp sẵn setting đầy đủ khi nơi khác vừa đọc được từ server. */
  primeSetting(setting: ThemeSetting): void {
    this.rememberSetting(setting);
  }

  private rememberSetting(setting: ThemeSetting): void {
    this.lastKnownSetting = setting;
    this._mobileDarkMode.set(setting.mobileDarkMode);
  }

  private persist(setting: ThemeSetting): void {
    this.rememberSetting(setting);
    this.updateThemeSetting(setting).subscribe({
      error: (err) => console.error('Lỗi khi lưu cài đặt giao diện:', err)
    });
  }

  getThemeSetting() {
    return this.http.get<ThemeSetting>(`${environment.apiBaseUrl}/GetThemeSetting`);
  }

  updateThemeSetting(setting: ThemeSetting) {
    return this.http.put<boolean>(`${environment.apiBaseUrl}/UpdateThemeSetting`, setting);
  }
}
