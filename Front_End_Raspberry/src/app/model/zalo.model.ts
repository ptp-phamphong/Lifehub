/** Khớp với API_Raspberry/Dto/Zalo/ZaloDtos.cs */

export interface ZaloContact {
  id: string;
  label: string;
}

export interface ZaloStatus {
  enabled: boolean;
  /** "Lần biết gần nhất" — kiểm tra thật diễn ra lúc gửi/đăng nhập. */
  loggedIn: boolean;
  browserOpen: boolean;
}

export type ZaloLoginStatus =
  | 'awaiting_qr'
  | 'logged_in'
  | 'already_logged_in'
  | 'logged_out'
  | 'expired'
  | 'disabled'
  | 'error';

export interface ZaloLoginResult {
  status: ZaloLoginStatus;
  /** Ảnh QR dạng data URI (data:image/png;base64,...). Chỉ có khi status = awaiting_qr. */
  qrImageBase64?: string | null;
  message?: string | null;
}

export type ZaloSendStatus =
  | 'sent'
  | 'need_login'
  | 'rate_limited'
  | 'contact_not_found'
  | 'disabled'
  | 'error';

export interface ZaloSendResult {
  status: ZaloSendStatus;
  message?: string | null;
  /** Ảnh chụp khung hội thoại sau khi gửi (data URI) để xác nhận đúng người. */
  screenshotBase64?: string | null;
}
