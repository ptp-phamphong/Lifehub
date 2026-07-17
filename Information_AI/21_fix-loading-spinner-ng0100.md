# Fix: Global Loading Spinner — NG0100 ExpressionChangedAfterItHasBeenChecked

Sửa ngày 17/07/2026. Lỗi này tồn tại từ trước, không liên quan feature TKB theo tuần.

## Triệu chứng

Console dev bắn lỗi mỗi khi vào một trang có gọi HTTP:

```
ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError:
Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.
Expression location: AppComponent component.
```

Chỉ xuất hiện ở dev mode (production Angular không chạy pass kiểm tra lại), nên không gây lỗi cho
người dùng — nhưng nó làm nhiễu console và che mất các lỗi thật.

## Nguyên nhân

Ba mảnh ghép lại:

1. `app.component.html` — `<div class="loading-overlay" *ngIf="loadingService.loading$ | async">`
2. `interceptors/loading.interceptor.ts` — gọi `this.loadingService.show()` **đồng bộ** trong `intercept()`
3. `services/loading.service.ts` — `show()` gọi thẳng `loadingSubject.next(true)`

Khi một component gọi HTTP trong `ngOnInit`:

```
Angular bắt đầu chu kỳ change detection
  → AppComponent đánh giá `loading$ | async` = false, render, đánh dấu đã kiểm tra
  → component con chạy ngOnInit → gọi HTTP
      → interceptor gọi show() ĐỒNG BỘ → subject next(true)
  → dev mode chạy pass kiểm tra lại: giá trị giờ là true, khác false đã kiểm
  → NG0100
```

Mấu chốt: giá trị đổi **trong cùng một chu kỳ** change detection đã kiểm tra nó.

## Cách sửa

`services/loading.service.ts`:

```ts
loading$ = this.loadingSubject.asObservable().pipe(
  distinctUntilChanged(),
  delay(0),
);
```

`delay(0)` dùng `asyncScheduler` → `setTimeout` → **macrotask kế tiếp**, tức một chu kỳ change detection
mới. AppComponent nhận giá trị mới một cách hợp lệ, không còn đổi giữa chừng.

Sửa ở `LoadingService` chứ không ở `AppComponent` vì đây là nơi phát giá trị — mọi consumer của
`loading$` đều hưởng, và không phải nhét `ChangeDetectorRef` vào component.

`distinctUntilChanged()` là phần thêm: nhiều request song song gọi `show()` liên tiếp sẽ phát `true`
nhiều lần vô ích.

**Đừng đổi `delay(0)` sang `asapScheduler`** — asap là microtask, drain trước khi chu kỳ change
detection kết thúc, nên không chắc thoát được NG0100. Cần macrotask.

## Kiểm chứng

Chạy backend + `ng serve` thật, đo bằng Playwright:

| Kịch bản | NG0100 trước | sau |
|---|---|---|
| Load `/system-info` | 0 | 0 |
| Vào "Chi tiêu" (`expense-record-list`) | **1** | **0** |
| Vào lịch (tháng) | ≥1 | 0 |
| Chuyển sang lịch tuần | ≥1 | 0 |
| Chuyển tuần (gọi HTTP) | ≥1 | 0 |

**Rủi ro của `delay(0)` là spinner không hiện nữa** — đã test riêng, không phải suy đoán: chặn response
API chậm 1.8s bằng `page.route`, xác nhận `.loading-overlay` **hiện trong lúc chờ** và **biến mất khi xong**.

## Files

- `Front_End_Raspberry/src/app/services/loading.service.ts` — nơi sửa
- `Front_End_Raspberry/src/app/interceptors/loading.interceptor.ts` — nơi gọi show/hide (không đổi)
- `Front_End_Raspberry/src/app/app.component.html` — nơi lỗi bắn ra (không đổi)

## Keywords

NG0100, ExpressionChangedAfterItHasBeenCheckedError, loading, spinner, overlay, interceptor,
change detection, delay, AppComponent
