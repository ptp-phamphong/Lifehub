import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { delay, distinctUntilChanged } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * `delay(0)` là bắt buộc, không phải trang trí.
   *
   * LoadingInterceptor gọi show() đồng bộ ngay lúc subscribe. Khi một component gọi HTTP trong
   * ngOnInit, việc đó rơi vào GIỮA chu kỳ change detection mà AppComponent vừa đánh giá
   * `loading$ | async` là false. Subject lật sang true ngay trong chu kỳ đó → pass kiểm tra lại
   * của dev mode thấy false→true → NG0100 ExpressionChangedAfterItHasBeenCheckedError.
   *
   * delay(0) đẩy phát xạ sang macrotask kế tiếp, tức một chu kỳ change detection mới, nên
   * AppComponent nhận giá trị mới một cách hợp lệ. Spinner vẫn hiện: show/hide chỉ dịch một tick.
   */
  loading$ = this.loadingSubject.asObservable().pipe(
    distinctUntilChanged(),
    delay(0),
  );

  show() {
    this.activeRequests++;
    this.loadingSubject.next(true);
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.loadingSubject.next(false);
    }
  }
}
