import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  PagedResult,
  VisitEvent,
  VisitorDailyPoint,
  VisitorKnownIp,
  VisitorLogFilter,
  VisitorLogSettings,
  VisitorProfile,
  VisitorSummary
} from '../model/visitor-log.model';

@Injectable({ providedIn: 'root' })
export class VisitorLogService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPaged(filter: VisitorLogFilter): Observable<PagedResult<VisitEvent>> {
    return this.http.post<PagedResult<VisitEvent>>(`${this.baseUrl}/VisitorLog/GetAll`, filter);
  }

  getSummary(filter: VisitorLogFilter): Observable<VisitorSummary> {
    return this.http.post<VisitorSummary>(`${this.baseUrl}/VisitorLog/Summary`, filter);
  }

  getVisitors(filter: VisitorLogFilter): Observable<VisitorProfile[]> {
    return this.http.post<VisitorProfile[]>(`${this.baseUrl}/VisitorLog/Visitors`, filter);
  }

  /** Lịch sử dài hạn từ bảng tổng hợp - vẫn còn sau khi dữ liệu thô bị xóa theo hạn lưu trữ. */
  getHistory(): Observable<VisitorDailyPoint[]> {
    return this.http.get<VisitorDailyPoint[]>(`${this.baseUrl}/VisitorLog/History`);
  }

  /** Cấu hình mặc định lưu trong bảng systemConfiguration (key VisitorLog.*). */
  getSettings(): Observable<VisitorLogSettings> {
    return this.http.get<VisitorLogSettings>(`${this.baseUrl}/VisitorLog/Settings`);
  }

  getKnownIps(): Observable<VisitorKnownIp[]> {
    return this.http.get<VisitorKnownIp[]>(`${this.baseUrl}/VisitorLog/KnownIp/GetAll`);
  }

  /** Đánh dấu một IP (hoặc một trình duyệt) là của mình -> ẩn khỏi thống kê. */
  markAsMine(ipAddress?: string, visitorId?: string, label?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/VisitorLog/KnownIp`, {
      ipAddress,
      visitorId,
      label,
      isSelf: true
    });
  }

  updateKnownIp(id: number, label: string, isSelf: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/VisitorLog/KnownIp/${id}`, { label, isSelf });
  }

  deleteKnownIp(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/VisitorLog/KnownIp/${id}`);
  }
}
