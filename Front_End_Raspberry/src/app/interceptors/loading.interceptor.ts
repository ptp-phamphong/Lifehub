import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/**
 * Các URL không bật spinner toàn màn hình.
 *
 * Bảng nhật ký truy cập phân trang/sắp xếp/lọc ở server nên mỗi lần bấm là một request.
 * Nếu để spinner phủ mờ cả trang thì thao tác duyệt dữ liệu sẽ nhấp nháy liên tục.
 * Các endpoint Visit/* là beacon nền, lại càng không được hiện gì.
 */
const SILENT_URLS = ['/VisitorLog/', '/Visit/'];

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (SILENT_URLS.some(url => req.url.includes(url))) {
      return next.handle(req);
    }

    this.loadingService.show();

    return next.handle(req).pipe(
      finalize(() => this.loadingService.hide())
    );
  }
}
