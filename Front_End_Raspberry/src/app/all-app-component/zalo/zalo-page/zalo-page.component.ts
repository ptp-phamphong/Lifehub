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
  /**
   * Thông báo tách làm hai nguồn: KHOÁ i18n do client sinh, và chuỗi backend
   * trả nguyên văn (§4.1 + §4.3). Feature này gần như chỗ nào cũng có dạng
   * `r.message || 'dự phòng'` nên cặp này xuất hiện hai lần.
   */
  loginMessageKey: string | null = null;
  loginMessageRaw: string | null = null;

  // Gửi tin
  sending = false;
  sendMessageKey: string | null = null;
  sendMessageRaw: string | null = null;
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
    this.setLoginMessage('zalo.opening');
    this.qrImage = null;
    this.zalo.startLogin().subscribe({
      next: r => this.applyLoginResult(r),
      error: () => { this.setLoginMessage('zalo.openFailed'); }
    });
  }

  private applyLoginResult(r: ZaloLoginResult): void {
    switch (r.status) {
      case 'awaiting_qr':
        this.qrImage = r.qrImageBase64 || null;
        this.setLoginMessage('zalo.scanQr', r.message);
        this.scheduleLoginPoll();
        break;
      case 'logged_in':
      case 'already_logged_in':
        this.qrImage = null;
        this.loggedIn = true;
        this.setLoginMessage('zalo.loggedIn');
        this.clearLoginTimer();
        break;
      case 'expired':
        this.qrImage = null;
        this.setLoginMessage('zalo.qrExpired');
        this.clearLoginTimer();
        break;
      case 'disabled':
        this.enabled = false;
        this.setLoginMessage('zalo.piOnly', r.message);
        this.clearLoginTimer();
        break;
      default:
        this.setLoginMessage('zalo.genericError', r.message);
        this.clearLoginTimer();
    }
  }

  /**
   * Backend gửi gì thì hiện nguyên văn; không có thì mới dùng khoá của client.
   * Luôn xoá nguồn còn lại để hai chuỗi không bao giờ cùng tồn tại.
   */
  private setLoginMessage(key: string, raw?: string | null): void {
    if (raw) {
      this.loginMessageRaw = raw;
      this.loginMessageKey = null;
    } else {
      this.loginMessageKey = key;
      this.loginMessageRaw = null;
    }
  }

  private setSendMessage(key: string, raw?: string | null): void {
    if (raw) {
      this.sendMessageRaw = raw;
      this.sendMessageKey = null;
    } else {
      this.sendMessageKey = key;
      this.sendMessageRaw = null;
    }
  }

  private scheduleLoginPoll(): void {
    this.clearLoginTimer();
    this.loginPolling = true;
    this.loginTimer = setTimeout(() => {
      this.zalo.loginStatus().subscribe({
        next: r => this.applyLoginResult(r),
        error: () => {
          this.setLoginMessage('zalo.lostConnection');
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
      this.setSendMessage('zalo.missingFields');
      return;
    }
    this.sending = true;
    this.sendMessageKey = null;
    this.sendMessageRaw = null;
    this.sendScreenshot = null;
    this.zalo.send(this.selectedContactId, this.message.trim()).subscribe({
      next: r => {
        this.sending = false;
        this.sendOk = r.status === 'sent';
        this.applySendResult(r);
        this.sendScreenshot = r.screenshotBase64 || null;
        if (r.status === 'sent') this.message = '';
        if (r.status === 'need_login') this.loggedIn = false;
      },
      error: () => {
        this.sending = false;
        this.sendOk = false;
        this.setSendMessage('zalo.sendFailed');
      }
    });
  }

  private applySendResult(r: ZaloSendResult): void {
    switch (r.status) {
      case 'sent': this.setSendMessage('zalo.sent'); break;
      case 'need_login': this.setSendMessage('zalo.needLogin'); break;
      case 'rate_limited': this.setSendMessage('zalo.rateLimited'); break;
      case 'contact_not_found': this.setSendMessage('zalo.contactNotFound'); break;
      case 'disabled': this.setSendMessage('zalo.piOnly', r.message); break;
      default: this.setSendMessage('zalo.sendError', r.message);
    }
  }
}
