import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

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
    this.trackVisit();
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

  login(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Vui lòng nhập username và password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Username hoặc password không đúng';
        } else {
          this.errorMessage = 'Lỗi kết nối server';
        }
      }
    });
  }
}
