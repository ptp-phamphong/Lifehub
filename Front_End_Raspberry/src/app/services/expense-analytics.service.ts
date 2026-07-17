import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ExpenseRecord } from '../model/expense.model';
import { ReasonType } from '../model/reason-type.model';
import { ParamFilter } from '../model/paramFilter.model';
import { AnalyticsRawData } from '../model/expense-analytics.model';
import { normalizeRaw } from '../all-app-component/expense-analytics/expense-analytics.transform';

/**
 * Nạp dữ liệu cho trang Phân tích chi tiêu.
 *
 * Backend không có endpoint gộp nào (mọi Sum đều là scalar, không có GroupBy) và
 * không lọc theo khoảng ngày - chỉ so khớp tháng/năm rời rạc. Nên cách đúng là
 * nạp toàn bộ lịch sử một lần rồi gộp ở client, giống hệt cách tính năng "gom
 * theo ngày" của trang Chi tiêu đang làm.
 *
 * KHÔNG dùng các endpoint Sum*: chúng tính cả bản ghi không có ngày, trong khi
 * tổng theo tháng thì không -> hai con số sẽ không bao giờ khớp. Tính mọi thứ từ
 * raw records để trang tự nhất quán.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseAnalyticsService {
  private readonly baseUrl = environment.apiBaseUrl;
  private cache$?: Observable<AnalyticsRawData>;

  constructor(private http: HttpClient) {}

  /**
   * ParamFilter rỗng = lấy toàn bộ lịch sử (month/year null -> repository bỏ qua
   * mệnh đề lọc). Service phía backend tự gắn sẵn reasonType vào từng khoản chi.
   */
  loadAll(forceReload = false): Observable<AnalyticsRawData> {
    if (forceReload || !this.cache$) {
      const layTatCa: ParamFilter = {};

      this.cache$ = forkJoin({
        expenses: this.http.post<ExpenseRecord[]>(`${this.baseUrl}/GetAllExpenseNote`, layTatCa),
        incomes: this.http.post<ExpenseRecord[]>(`${this.baseUrl}/GetAllIncomeNote`, layTatCa),
        reasonTypes: this.http.get<ReasonType[]>(`${this.baseUrl}/GetAllReasonType`)
      }).pipe(
        map(r => normalizeRaw(r.expenses, r.incomes, r.reasonTypes)),

        // PHẢI đứng TRƯỚC shareReplay. shareReplay phát lại cả lỗi terminal cho
        // mọi subscriber về sau, vĩnh viễn - thiếu dòng này thì một request hỏng
        // (rất dễ gặp: cert dev tự ký) sẽ làm chết trang cho tới khi F5.
        catchError(err => {
          this.cache$ = undefined;
          return throwError(() => err);
        }),

        // refCount: false là cố ý. Với refCount: true, rời trang là subscriber
        // cuối unsubscribe -> quay lại phải gọi lại cả 3 request. Cái giá là dữ
        // liệu cũ đi sau khi thêm khoản chi ở tab khác -> bù bằng nút "Tải lại"
        // và nhãn thời điểm nạp, để cái cũ NHÌN THẤY ĐƯỢC thay vì âm thầm.
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.cache$;
  }

  /** Bỏ cache để lần loadAll() sau gọi lại API. */
  invalidate(): void {
    this.cache$ = undefined;
  }
}
