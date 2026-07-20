import { Component, OnDestroy, OnInit } from '@angular/core';
import { ZaloService } from 'src/app/services/zalo.service';
import { ZaloContact, ZaloLoginResult, ZaloSendResult } from 'src/app/model/zalo.model';

@Component({
  selector: 'app-zalo-page',
  templateUrl: './zalo-page.component.html',
  styleUrls: ['./zalo-page.component.scss']
})
export class ZaloPageComponent implements OnInit, OnDestroy {
  contacts: ZaloContact[] = [];
  selectedContactId: string | null = null;
  message = '';

  enabled = true;
  loggedIn = false;
  statusChecked = false;

  // Đăng nhập QR
  qrImage: string | null = null;
  loginPolling = false;
  loginMessage: string | null = null;

  // Gửi tin
  sending = false;
  sendMessage: string | null = null;
  sendOk = false;
  /** Ảnh chụp hội thoại sau khi gửi để xác nhận đúng người. */
  sendScreenshot: string | null = null;

  private loginTimer: any = null;

  constructor(private zalo: ZaloService) {}

  ngOnInit(): void {
    this.refreshStatus();
    this.loadContacts();
  }

  ngOnDestroy(): void {
    this.clearLoginTimer();
  }

  loadContacts(): void {
    this.zalo.getContacts().subscribe({
      next: data => {
        this.contacts = data;
        if (data.length && !this.selectedContactId) {
          this.selectedContactId = data[0].id;
        }
      },
      error: () => { this.contacts = []; }
    });
  }

  refreshStatus(): void {
    this.zalo.getStatus().subscribe({
      next: s => {
        this.enabled = s.enabled;
        this.loggedIn = s.loggedIn;
        this.statusChecked = true;
      },
      error: () => { this.statusChecked = true; }
    });
  }

  startLogin(): void {
    this.loginMessage = 'Đang mở Zalo, vui lòng đợi...';
    this.qrImage = null;
    this.zalo.startLogin().subscribe({
      next: r => this.applyLoginResult(r),
      error: () => { this.loginMessage = 'Không mở được Zalo. Thử lại sau.'; }
    });
  }

  private applyLoginResult(r: ZaloLoginResult): void {
    switch (r.status) {
      case 'awaiting_qr':
        this.qrImage = r.qrImageBase64 || null;
        this.loginMessage = r.message || 'Quét mã QR bằng ứng dụng Zalo trên điện thoại.';
        this.scheduleLoginPoll();
        break;
      case 'logged_in':
      case 'already_logged_in':
        this.qrImage = null;
        this.loggedIn = true;
        this.loginMessage = 'Đã đăng nhập Zalo.';
        this.clearLoginTimer();
        break;
      case 'expired':
        this.qrImage = null;
        this.loginMessage = 'Mã QR đã hết hạn. Bấm đăng nhập lại.';
        this.clearLoginTimer();
        break;
      case 'disabled':
        this.enabled = false;
        this.loginMessage = r.message || 'Tính năng chỉ chạy trên Pi.';
        this.clearLoginTimer();
        break;
      default:
        this.loginMessage = r.message || 'Có lỗi xảy ra.';
        this.clearLoginTimer();
    }
  }

  private scheduleLoginPoll(): void {
    this.clearLoginTimer();
    this.loginPolling = true;
    this.loginTimer = setTimeout(() => {
      this.zalo.loginStatus().subscribe({
        next: r => this.applyLoginResult(r),
        error: () => {
          this.loginMessage = 'Mất kết nối khi chờ đăng nhập.';
          this.clearLoginTimer();
        }
      });
    }, 2500);
  }

  private clearLoginTimer(): void {
    if (this.loginTimer) {
      clearTimeout(this.loginTimer);
      this.loginTimer = null;
    }
    this.loginPolling = false;
  }

  send(): void {
    if (!this.selectedContactId || !this.message.trim()) {
      this.sendOk = false;
      this.sendMessage = 'Chọn người nhận và nhập nội dung.';
      return;
    }
    this.sending = true;
    this.sendMessage = null;
    this.sendScreenshot = null;
    this.zalo.send(this.selectedContactId, this.message.trim()).subscribe({
      next: r => {
        this.sending = false;
        this.sendOk = r.status === 'sent';
        this.sendMessage = this.sendResultText(r);
        this.sendScreenshot = r.screenshotBase64 || null;
        if (r.status === 'sent') this.message = '';
        if (r.status === 'need_login') this.loggedIn = false;
      },
      error: () => {
        this.sending = false;
        this.sendOk = false;
        this.sendMessage = 'Không gửi được. Thử lại sau.';
      }
    });
  }

  private sendResultText(r: ZaloSendResult): string {
    switch (r.status) {
      case 'sent': return 'Đã gửi tin nhắn.';
      case 'need_login': return 'Chưa đăng nhập Zalo. Hãy đăng nhập trước.';
      case 'rate_limited': return 'Gửi quá nhanh, thử lại sau vài giây.';
      case 'contact_not_found': return 'Không tìm thấy người nhận.';
      case 'disabled': return r.message || 'Tính năng chỉ chạy trên Pi.';
      default: return r.message || 'Có lỗi xảy ra khi gửi.';
    }
  }
}
