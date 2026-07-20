import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ZaloContact, ZaloStatus, ZaloLoginResult, ZaloSendResult } from '../model/zalo.model';

@Injectable({ providedIn: 'root' })
export class ZaloService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<ZaloStatus> {
    return this.http.get<ZaloStatus>(`${this.baseUrl}/Zalo/Status`);
  }

  getContacts(): Observable<ZaloContact[]> {
    return this.http.get<ZaloContact[]>(`${this.baseUrl}/Zalo/Contacts`);
  }

  /** Mở Zalo Web: trả ảnh QR nếu chưa đăng nhập, hoặc already_logged_in nếu phiên còn hiệu lực. */
  startLogin(): Observable<ZaloLoginResult> {
    return this.http.post<ZaloLoginResult>(`${this.baseUrl}/Zalo/Login/Start`, {});
  }

  /** Gọi định kỳ khi đang chờ quét QR. */
  loginStatus(): Observable<ZaloLoginResult> {
    return this.http.get<ZaloLoginResult>(`${this.baseUrl}/Zalo/Login/Status`);
  }

  send(contactId: string, message: string): Observable<ZaloSendResult> {
    return this.http.post<ZaloSendResult>(`${this.baseUrl}/Zalo/Send`, { contactId, message });
  }
}
