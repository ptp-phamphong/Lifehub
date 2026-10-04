import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { Language } from '../../i18n/types';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  readonly isDemoMode = environment.demoMode;
  username = '';
  password = '';
  isLoading = false;
  showPassword = false;

  // ── Thông báo ──
  // Lỗi phát sinh ở client lưu dưới dạng KEY rồi để template dịch, nhờ vậy đổi
  // ngôn ngữ khi đang hiện lỗi thì lỗi cũng đổi theo. Message do backend trả về
  // thì lưu nguyên văn vì nó là câu chữ sẵn, không phải key.
  errorKey = '';
  errorRaw = '';
  forgotErrorKey = '';
  forgotErrorRaw = '';
  forgotInfoRaw = '';

  // ── Luồng quên mật khẩu ──
  // 'login' = form đăng nhập; 'forgot-request' = nhập username để lấy OTP;
  // 'forgot-reset' = nhập OTP + mật khẩu mới.
  mode: 'login' | 'forgot-request' | 'forgot-reset' = 'login';
  forgotUsername = '';
  otp = '';
  newPassword = '';
  showNewPassword = false;
  maskedEmail = '';

  private readonly languageService = inject(LanguageService);
  readonly currentLanguage = this.languageService.language;
  readonly languages = this.languageService.available;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    // Demo không ghi visitor log (backend cũng chặn Visit/* trên demo).
    if (!this.isDemoMode) {
      this.trackVisit();
    }
  }

  setLanguage(lang: Language): void {
    this.languageService.setLanguage(lang);
  }

  /**
   * Ghi nhận có người mở trang login (kể cả khi họ không đăng nhập được).
   * Đây là cách duy nhất để biết ai đang dò ra trang admin.
   * Bản thân việc login thành công/thất bại được backend ghi riêng trong AuthController.
   *
   * Fire-and-forget: hỏng cũng không được ảnh hưởng tới việc đăng nhập.
   */
  private trackVisit(): void {
    try {
      // Cùng origin với portfolio nên dùng chung visitorId trong localStorage.
      const visitorId = localStorage.getItem('pf_visitor_id');
      const sessionId = sessionStorage.getItem('pf_session_id');

      this.http
        .post(`${environment.apiBaseUrl}/Visit/Record`, {
          path: '/app/login',
          title: document.title,
          referrer: document.referrer || null,
          visitorId,
          sessionId,
          language: navigator.language,
          screenWidth: window.screen?.width,
          screenHeight: window.screen?.height,
          area: 'AppLogin'
        })
        .subscribe({
          next: () => {},
          error: () => {}
        });
    } catch {
      // im lặng
    }
  }

  private clearMessages(): void {
    this.errorKey = '';
    this.errorRaw = '';
    this.forgotErrorKey = '';
    this.forgotErrorRaw = '';
    this.forgotInfoRaw = '';
  }

  login(): void {
    if (!this.username || !this.password) {
      this.clearMessages();
      this.errorKey = 'login.missingCredentials';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorKey =
          err.status === 401 ? 'login.invalidCredentials' : 'common.connectionError';
      }
    });
  }

  // ── Quên mật khẩu ──

  openForgot(): void {
    this.mode = 'forgot-request';
    this.forgotUsername = this.username; // điền sẵn username đang gõ cho tiện
    this.otp = '';
    this.newPassword = '';
    this.showNewPassword = false;
    this.maskedEmail = '';
    this.clearMessages();
  }

  backToLogin(): void {
    this.mode = 'login';
    this.clearMessages();
  }

  requestOtp(): void {
    if (!this.forgotUsername) {
      this.clearMessages();
      this.forgotErrorKey = 'login.forgot.missingUsername';
      return;
    }
    this.isLoading = true;
    this.clearMessages();

    this.authService.requestPasswordReset(this.forgotUsername).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.maskedEmail = res.maskedEmail || '';
        // Backend trả câu tiếng Việt sẵn; chỉ dùng key làm phương án dự phòng.
        this.forgotInfoRaw = res.message || '';
        this.mode = 'forgot-reset';
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.error?.message) {
          this.forgotErrorRaw = err.error.message;
        } else {
          this.forgotErrorKey = 'login.forgot.sendOtpFailed';
        }
      }
    });
  }

  resetPassword(): void {
    if (!this.otp || !this.newPassword) {
      this.clearMessages();
      this.forgotErrorKey = 'login.reset.missingFields';
      return;
    }
    this.isLoading = true;
    this.clearMessages();

    this.authService.resetPassword(this.forgotUsername, this.otp, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.mode = 'login';
        this.username = this.forgotUsername;
        this.password = '';
        this.errorRaw = res?.message || '';
        // Phần nhắc đăng nhập lại thì dịch được, nên để template ghép vào sau.
        this.errorKey = 'login.reset.loginWithNewPassword';
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.error?.message) {
          this.forgotErrorRaw = err.error.message;
        } else {
          this.forgotErrorKey = 'login.reset.failed';
        }
      }
    });
  }
}
