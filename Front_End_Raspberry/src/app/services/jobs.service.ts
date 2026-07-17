import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { JobRun } from '../model/job.model';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /** Lịch sử chạy đọc thẳng từ Hangfire, không có bảng riêng trong app. */
  getHistory(take = 50): Observable<JobRun[]> {
    return this.http.get<JobRun[]>(`${this.baseUrl}/Jobs/History?take=${take}`);
  }

  /** Chạy ngay một tác vụ. jobKey lấy từ hằng số trong job.model.ts. */
  trigger(jobKey: string): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(`${this.baseUrl}/Jobs/Trigger/${jobKey}`, {});
  }
}
