import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
  expiration: string;
}

export interface ForgotPasswordResponse {
  message: string;
  maskedEmail: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly EXPIRATION_KEY = 'auth_expiration';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/Auth/Login`, {
      username,
      password
    }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.EXPIRATION_KEY, response.expiration);
      })
    );
  }

  /** Bước 1 quên mật khẩu: gửi OTP về email của user, trả về email đã che bớt. */
  requestPasswordReset(username: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(
      `${environment.apiBaseUrl}/Auth/ForgotPassword`,
      { username }
    );
  }

  /** Bước 2 quên mật khẩu: xác thực OTP + đặt mật khẩu mới. */
  resetPassword(username: string, otp: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiBaseUrl}/Auth/ResetPassword`,
      { username, otp, newPassword }
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRATION_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const expiration = localStorage.getItem(this.EXPIRATION_KEY);
    if (!expiration) return false;

    return new Date(expiration) > new Date();
  }
}
