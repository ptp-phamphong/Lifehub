# Feature: Phân tích chi tiêu (Expense Analytics) — Angular web

**Route:** `/expense-analytics` · **Tab:** `📈 Phân tích` (giữa "Chi tiêu" và "Thời khóa biểu")

## 1. Mục đích

Nhìn **chi tiêu qua từng thời gian** bằng biểu đồ trực quan: xu hướng, cơ cấu theo loại, và thói quen chi.

Hiện tại app chỉ có bảng danh sách + vài con số tổng (tháng / tuần / toàn bộ) ở `/expense-record-list`. Không có cách nào thấy được xu hướng hay cơ cấu.

**Phạm vi:** chỉ **Angular web**. Không làm mobile. Không sửa backend.

## 2. Hai điều kiện quyết định toàn bộ thiết kế

### 2.1 Không cần sửa backend — nhưng không phải vì backend đã sẵn sàng

`POST /GetAllExpenseNote` với `ParamFilter` **rỗng** `{}` (month/year null) trả về **toàn bộ** lịch sử, và `ExpenseService.GetAllExpenses` tự hydrate nav property `reasonType` (nên có sẵn tên loại). `/GetAllIncomeNote` tương tự.

Backend **không có một `GroupBy` nào** — mọi phép tổng đều là scalar `query.Sum(e => e.Amount)`. Và **không lọc theo khoảng ngày**: chỉ so khớp `Month`/`Year` **rời rạc**:

```csharp
query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Month == paramFilter.Month.Value);
```

`SumByWeek(paramFilter, startOfWeek, endOfWeek)` là truy vấn khoảng duy nhất — và **không được expose**; service tự tính tuần từ `DateTime.Today` nên caller không thể yêu cầu khoảng tùy ý.

→ Muốn breakdown theo loại hay theo ngày, chỉ có 2 đường: gọi `GetAllExpenseNote` rồi **gộp ở client**, hoặc gọi `SumAllWithFilter` **N lần** (mỗi loại một request). Đường thứ nhất đúng hơn hẳn, và cũng chính là cách tính năng "gom theo ngày" hiện có đang làm.

**Kết luận:** nạp raw một lần → gộp phía client. Với quy mô một sổ chi tiêu cá nhân thì hoàn toàn ổn. Nếu sau này dữ liệu lên hàng trăm nghìn dòng thì mới cần đẩy phép gộp xuống SQL bằng endpoint mới.

### 2.2 Không dùng thư viện biểu đồ — đây là quyết định đã có sẵn trong repo

`all-app-component/visitor-log/visit-trend-chart/visit-trend-chart.component.ts` đã ghi rõ:

> Cố tình KHÔNG dùng thư viện chart: chart.js vẽ lên `<canvas>` nên không đọc được biến CSS (`var(--color-*)`), sẽ thành một mảng trắng chói giữa nền tối. SVG thì dùng thẳng `var(--...)` trong fill/stroke nên tự đổi màu theo dark mode.

Dark mode là **bắt buộc** theo `CLAUDE.md`. Ta noi theo tiền lệ: **SVG viết tay, 0 dependency mới**.

### Đã cân nhắc lại chuyện dùng thư viện (7/2026) — vẫn giữ SVG viết tay

Quyết định này được xem xét lại khi phạm vi đã mở "không giới hạn thư viện". Kết luận không đổi, vì với **trang này** thư viện tốn thêm chứ không đỡ:

- **chart.js / ng2-charts vẽ trên `<canvas>`** → không đọc được `var(--color-*)`. Dark mode ở đây bật bằng cách thêm class `dark-theme` vào `<body>` (`ThemeService.applyWebDarkMode`) và **không phát ra event nào**, nên muốn canvas đổi màu phải đọc token bằng JS *cộng* gắn `MutationObserver` để vẽ lại. Hiện tại dark mode chạy miễn phí, 0 dòng code.
- **`ngx-charts` là SVG** nên tương thích hơn, nhưng nhận màu qua **mảng JS** (`[scheme]`) chứ không qua CSS → vẫn dính đúng vấn đề trên.
- Giá trị thật của trang nằm ở những thứ **thư viện không có sẵn**: ô "chưa tới" khác ô "không chi", thang kẹp p95, slot màu ổn định qua các tháng, dò trùng nhãn nhóm gộp, công bố khoản thiếu ngày. Dùng thư viện thì vẫn phải tự viết, lại còn phải chống lại API của nó.

**Khi nào nên đổi ý:** nếu cần zoom/pan, animation chuyển cảnh, brush chọn khoảng, hoặc canvas hóa vì số điểm lên hàng chục nghìn. Lúc đó chọn `ngx-charts` (SVG) và chấp nhận viết một lớp cầu token→scheme + `MutationObserver` cho dark mode. **Đừng** dùng chart.js.

## 3. Bảng màu — đã validate bằng script, không ước lượng bằng mắt

Repo **chưa có bảng màu phân loại**: token hiện tại chỉ đơn sắc (`--color-primary` / `--color-danger` / `--color-success`). Biểu đồ cột chồng theo loại cần nhiều màu phân biệt được, kể cả với người mù màu.

Đã chạy validator trên **đúng surface của repo** (`#ffffff` sáng / `#1e293b` tối — không phải surface mặc định của công cụ):

| Chế độ | Bảng màu | Kết quả |
|---|---|---|
| Sáng | `#2a78d6,#008300,#e87ba4,#eda100,#1baf7a,#eb6834,#4a3aa7,#e34948` | PASS — CVD ΔE 9.1; normal-vision ΔE 19.6 |
| Tối | `#3987e5,#008300,#d55181,#c98500,#199e70,#d95926,#9085e9,#e66767` | PASS — CVD ΔE 8.4; normal-vision ΔE 19.3 |

Cả hai đều WARN *"contrast < 3:1"* ở vài slot → **bắt buộc có relief**: mỗi biểu đồ phải có **table view** (đằng nào cũng cần cho accessibility) + nhãn trực tiếp. WARN này **không được bỏ qua**.

**Thứ tự slot là cơ chế an toàn mù màu, không phải thẩm mỹ.** Đừng đảo thứ tự cho "đẹp" — phải chạy lại validator.

### Ghi chú quan trọng về ramp heatmap

Heatmap dùng ramp **sequential 1 sắc**. **Đừng** đem validator `--ordinal` ra "sửa" ramp này: nó **FAIL by design** vì sequential *cho phép* giá trị gần 0 nhạt lẫn vào nền (đó chính là ý nghĩa "gần như không có"). Thứ cần giữ là **monotone + single-hue**, và cả hai đều PASS.

## 4. Cấu trúc file dự kiến

```
Front_End_Raspberry/src/app/
  model/expense-analytics.model.ts
  services/expense-analytics.service.ts
  all-app-component/expense-analytics/
    expense-analytics.transform.ts        # hàm thuần, không DI
    _chart-shared.scss                    # partial SCSS dùng chung (xem dưới)
    expense-analytics-page/               # smart: component DUY NHẤT inject service
    chart-panel/                          # khung thẻ + toggle Biểu đồ/Bảng + empty state
    analytics-kpi-row/                    # #1
    income-expense-chart/                 # #2 cột nhóm
    category-rank-chart/                  # #3 thanh ngang (HTML, không SVG)
    category-stack-chart/                 # #4 cột chồng
    weekday-chart/                        # #5
    day-heatmap-chart/                    # #6
    cumulative-month-chart/               # #7 đường
```

`_chart-shared.scss` là **partial SCSS** (`@import '../chart-shared';` trong từng
biểu đồ), không phải class toàn cục: nội dung chiếu qua `<ng-content>` thuộc phạm
vi style của component khai báo nó, nên bảng số nằm trong từng biểu đồ. Partial
giữ được encapsulation mà không phải chép lại kiểu 7 lần.

### Vì sao mỗi biểu đồ một component, chỉ chia sẻ khung thẻ

**Lý do cứng — không thể tách một `<svg>` qua nhiều component Angular.** Angular render `<app-foo>` ở **HTML namespace**; đặt selector bên trong `<svg>` thì trình duyệt tạo một unknown HTML element trong cây SVG và **không vẽ gì cả, console vẫn sạch**. Một component biểu đồ dùng chung chỉ tồn tại được nếu nó *sở hữu trọn thẻ `<svg>` gốc* và nhận config từ ngoài. Với 5 hình học thật sự khác nhau (cột nhóm / cột chồng / cột đơn / lưới lịch / polyline), object config đó sẽ **to và khó đọc hơn** ~90 dòng `build()` viết tay — `visit-trend-chart.component.ts` chỉ 98 dòng tổng cộng, đó là giá thật của một biểu đồ ở đây.

**Lý do mềm:** mỗi biểu đồ có luật dataviz riêng (#3 một sắc, #4 gán slot ổn định, #7 emphasis). Nhồi hết vào flag là cách "component tái dùng" chết yểu.

**Cái được chia sẻ:** `chart-panel` — khung thẻ + tiêu đề + toggle Biểu đồ/Bảng + empty state, vì markup đó giống hệt nhau 7 lần. Dùng content projection (`<ng-content select="[chart]">` / `[table]`) và `[hidden]` thay vì `*ngIf` để nội dung chỉ khởi tạo một lần.

**#3 dùng HTML `.rank-bar`** (mẫu `visitor-overview.component.scss`), không SVG: tên loại tiếng Việt dài và biến thiên; cắt chữ / ellipsis / nhãn ở đầu thanh là miễn phí trong flex nhưng rất lằng nhằng trong SVG.

**Biểu đồ là dumb component:** nhận **dataset đã tính sẵn**, không bao giờ nhận raw record. Rebuild trong `ngOnChanges`, đúng mẫu `visit-trend-chart`.

Mọi `*ngFor` trên bar/cell thêm `trackBy` — mẫu cũ không có, mà heatmap tạo lại ~370 ô mỗi lần đổi bộ lọc.

## 5. Service

Theo mẫu `services/visitor-log.service.ts` (feature mới nhất dùng service; các component cũ inject `HttpClient` thẳng — nhưng ở đây nhiều biểu đồ con dùng chung một dataset nên service là đúng).

```ts
@Injectable({ providedIn: 'root' })
export class ExpenseAnalyticsService {
  private cache$?: Observable<AnalyticsRawData>;

  loadAll(forceReload = false): Observable<AnalyticsRawData> {
    if (forceReload || !this.cache$) {
      const all: ParamFilter = {};
      this.cache$ = forkJoin({
        expenses:    this.http.post<ExpenseRecord[]>(`${this.baseUrl}/GetAllExpenseNote`, all),
        incomes:     this.http.post<ExpenseRecord[]>(`${this.baseUrl}/GetAllIncomeNote`, all),
        reasonTypes: this.http.get<ReasonType[]>(`${this.baseUrl}/GetAllReasonType`)
      }).pipe(
        map(r => normalizeRaw(r.expenses, r.incomes, r.reasonTypes)),
        catchError(err => { this.cache$ = undefined; return throwError(() => err); }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.cache$;
  }
}
```

JWT tự gắn bởi `auth.interceptor`; spinner toàn cục tự chạy qua `loading.interceptor` (**không** thêm vào `SILENT_URLS`).

Ba quyết định và lý do:

- **`refCount: false` là cố ý.** Với `refCount: true`, rời trang là subscriber cuối unsubscribe → quay lại gọi lại cả 3 request. Ta muốn cache sống qua điều hướng. Cái giá: dữ liệu cũ đi sau khi thêm khoản chi ở tab khác → bù bằng nút **"Tải lại"** (`loadAll(true)`) + nhãn `Cập nhật lúc HH:mm` để cái cũ **nhìn thấy được** thay vì âm thầm.
- **`catchError` phải đặt TRƯỚC `shareReplay`.** `shareReplay` replay cả **lỗi terminal** cho mọi subscriber về sau, **vĩnh viễn**. Thiếu dòng này thì một request hỏng (rất dễ xảy ra ngay lần chạy đầu: cert dev tự ký) sẽ **làm chết trang cho tới khi F5**. Xóa `cache$` trong `catchError` để lần `loadAll()` sau dựng lại.
- **Thu tái dùng type `ExpenseRecord`**, không tạo type mới: `expense-record-list.component.ts` đã type response thu là `ExpenseRecord[]`, và shape thu đúng là tập con thật sự (`reasonTypeId`/`reasonType` chỉ trả về null). Thêm type song song = hai nguồn sự thật, không được gì.

**Đổi bộ lọc = tính lại trên cache, KHÔNG gọi API.** Nhờ vậy yêu cầu "refetch giữ khung, không nhấp nháy" thỏa mãn hiển nhiên — vì không có refetch. Quy mô cá nhân (vài nghìn dòng) → tính lại cả 7 dataset dưới 1ms → **không memoize**, đó là phức tạp không có phần thưởng.

```ts
interface AnalyticsFilter {
  monthsBack: number;           // 6 | 12 | 24 | 0 (0 = tất cả)
  reasonTypeIds: number[];      // lọc THEO loại. Rỗng = tất cả. CHỈ áp cho chi.
  reasonTypeIdsOut: number[];   // lọc theo KHÔNG PHẢI loại. Bắt buộc phải có - xem §11.A.
  anchorMonth: string;          // 'YYYY-MM' — tháng neo cho KPI, heatmap và biểu đồ lũy kế
}
```

## 6. Tầng biến đổi — hàm thuần

```ts
normalizeRaw(e, i, rt): AnalyticsRawData   // loại bản ghi không ngày MỘT LẦN, có đếm
monthKey(d): string    // '2026-07' — getFullYear/getMonth, KHÔNG toISOString
dayKey(d): string
enumerateMonths(fromKey, toKey): string[]  // trục DÀY, liên tục
buildKpis / buildIncomeExpense / buildCategoryRank / buildCategoryStack
buildWeekday / buildHeatmap / buildCumulative
```

Để ở file riêng, không `@Injectable` → test được không cần DI, service chỉ lo I/O, page chỉ lo điều phối.

```ts
interface DatedRecord {
  id: number; reason: string; amount: number;
  date: Date; monthKey: string; dayKey: string;
  reasonTypeId: number | null; reasonName: string;   // 'Chưa phân loại' khi null
}
interface AnalyticsRawData {
  expenses: DatedRecord[];        // CHỈ bản ghi có ngày hợp lệ
  incomes: DatedRecord[];
  reasonTypes: ReasonType[];
  skippedExpenseCount: number;    // bản ghi không có ngày
  skippedIncomeCount: number;
  loadedAt: Date;
}
```

### 6.1 Tám cái bẫy cấu trúc — đây là phần quan trọng nhất tài liệu này

Tất cả đều bắt nguồn từ **schema** hoặc từ bản chất "tháng đang diễn ra", không phải từ bộ dữ liệu cụ thể nào. Cả tám đều đã được kiểm bằng dữ liệu dựng riêng để ép đúng ca biên (§13).

1. **`toISOString()` là cách bucket ngày SAI.** Ở UTC+7:
   ```
   new Date(2026, 6, 17, 0, 30).toISOString()  →  '2026-07-16T17:30:00Z'  →  bucket '2026-07-16'
   ```
   Mọi khoản chi rạng sáng lệch về **hôm trước**, và khoản chi ngày cuối tháng lệch sang **tháng trước**.
   → Khóa ngày/tháng **phải** dùng `getFullYear()` / `getMonth()` / `getDate()`.

   Dùng chung **`src/app/utils/date-key.ts`** (`toDayKey` / `toMonthKey`) — lý do đầy đủ nằm trong file đó.

   **Repo từng mắc đúng lỗi này** ở `visitor-log-page.component.ts` (`fromDate()`), kèm comment *"tránh lệch múi giờ"* trong khi nó gây ra đúng điều đó. **Đã sửa 17/07/2026** cùng lúc với việc tách `date-key.ts`. Đo lại thấy logic cũ sai **7/24 khung giờ** — đúng 00:00–06:59, tức bằng độ lệch UTC+7 — nên bộ lọc "N ngày" âm thầm rộng thêm một ngày mỗi khi mở trang trước 7h sáng, rồi lại đúng suốt phần còn lại của ngày. Đây là lý do lỗi kiểu này sống rất lâu mà không ai thấy.

2. **Tháng trống phải điền 0.**
   `group by` các tháng có sẵn sẽ âm thầm **bỏ hẳn** tháng không có bản ghi → trục thời gian bị nén lại → **một khoảng ngưng chi trông y như chi liên tục**. `enumerateMonths` sinh trục **dày, liên tục** rồi zero-fill. Dùng thủ thuật `new Date(y, m + i, 1)` mà `month-pagination.component.ts:33` đã dùng (JS tự xử lý tràn tháng).

3. **`createdDate` là nullable** (schema cho phép). Bản ghi không ngày phải bị loại khỏi mọi biểu đồ thời gian — **một lần, trong `normalizeRaw`** — và **phải hiện số lượng bị loại** (`3 khoản chưa có ngày, không tính vào biểu đồ`).
   Đây là thứ trung thực quan trọng nhất trang này: **tiền không được biến mất trong im lặng**.

4. **`reasonTypeId` là nullable** → nhóm `Chưa phân loại`. Nó và nhóm gộp `Khác` đều mang `--color-series-muted`, **không bao giờ chiếm một slot phân loại**: chúng là *sự vắng mặt* / *phần dư*, không phải một loại ngang hàng với các loại thật.

5. **Nhãn nhóm gộp có thể đụng tên loại có thật.** Người dùng tự đặt tên loại nên có thể trùng bất kỳ chữ nào ta chọn (kể cả "Khác"). Kiểm trùng **lúc chạy**, trùng thì đổi nhãn — nếu không, hai thứ khác hẳn nhau bị trộn vào một cột mà không ai biết.

6. **Delta chia cho 0.** KPI "so với tháng trước" khi tháng trước = 0 phải hiện `—`, **không** `+∞%` / `+100%` / `NaN`. Bảng thu nhập cũng có thể **rỗng hoàn toàn** → biểu đồ #2 cần empty state tử tế.

7. **Mọi phép chia thang phải `Math.max(max, 1)`** (mẫu cũ làm đúng ở dòng 55). Lọc ra 0 dòng mà không guard thì `NaN` được ghi vào **mọi** thuộc tính tọa độ → biểu đồ **vô hình mà console sạch bong**.

8. **Ngày CHƯA TỚI không phải ngày "không chi"** *(phát hiện khi kiểm chứng, không có trong kế hoạch ban đầu)*. Ở tháng đang diễn ra, các ngày sau hôm nay lúc đầu được tô y hệt ngày không chi — tức là nói rằng hôm đó không tiêu gì, trong khi sự thật là hôm đó **chưa xảy ra**. Đây đúng là lỗi cùng họ với "đường lũy kế kéo phẳng tới cuối tháng" đã bị cấm ở §7. `HeatCell.isFuture` tách hai trạng thái: ngày chưa tới để **trong suốt, viền đứt**, tooltip ghi `chưa tới`.
   (Nét đứt ở đây hợp lệ: luật cấm nét đứt là dành cho **lưới và trục** — nơi nó gây nhiễu và bị đọc nhầm thành "dự phóng"; còn ở đây "dự phóng / chưa tới" đúng là ý nghĩa cần truyền.)

### 6.2 Không đụng các endpoint `Sum*`

`SumAll()` tính **cả** bản ghi không có ngày, còn mọi tổng theo tháng thì không → hai con số **sẽ không bao giờ khớp**. (Thêm nữa `SumAllWithFilter` **bỏ qua** month/year trong khi `SumAllIncomeWithFilter` thì không — một bất đối xứng có sẵn ở backend.)

→ Tính **mọi thứ** từ raw records. Tự nhất quán, và đó chính là điều kiểm chứng ở §11.5 khai thác.

## 7. Bảy biểu đồ

**Một hàng lọc DUY NHẤT** trên đầu, scope toàn trang (theo khung `visitor-log-page`: `.page-head` → `.filter-bar` → panels):

`[Khoảng thời gian 6/12/24/tất cả]` `[Lọc loại — chỉ áp cho chi]` `[Tháng phân tích]` `[Tải lại]`

Dùng `<ng-select>` cho lọc loại (đã có sẵn trong `AppModule.imports`) để giống hệt trang Chi tiêu.

| # | Biểu đồ | Dạng | Màu |
|---|---|---|---|
| 1 | KPI: chi tháng này (+delta), thu, số dư, TB/ngày | stat tile | delta = hướng × tốt/xấu |
| 2 | Thu vs Chi theo tháng | cột nhóm, **một trục Y** | slot 1 (Chi) + slot 2 (Thu), có legend |
| 3 | Chi theo loại | thanh ngang xếp hạng | **mọi thanh cùng slot 1** |
| 4 | Cơ cấu loại qua các tháng | cột chồng | top 6 + `Khác` (muted) |
| 5 | Chi theo thứ trong tuần | cột, 1 series | slot 1, không legend |
| 6 | Nhiệt chi theo ngày | heatmap | ramp 1 sắc + scale legend |
| 7 | Chi lũy kế trong tháng | đường, **emphasis** | tháng này slot 1, tháng trước muted |

Những lựa chọn dễ bị làm sai:

- **#3 mọi thanh một màu.** Loại chi là **danh định** (đổi thứ tự không đổi nghĩa). Tô đậm-dần-theo-giá-trị là anti-pattern: nó tiêu kênh màu để **mã hóa lại đúng cái mà độ dài thanh đã nói**.
- **#4 gán slot tính MỘT LẦN trên cả cửa sổ**, không phải từng cột: xếp hạng theo tổng toàn khoảng, lấy top 6. Gán theo từng cột thì một loại **đổi màu giữa các tháng** → không đọc nổi.
- **#7 cắt tháng hiện tại ở hôm nay.** Vẽ đường phẳng từ hôm nay tới ngày 31 là **nói dối** — nó đọc thành "đã ngừng chi". Tháng trước vẽ trọn.
- **#6 thang kẹp ở p95**, phần vượt gán bậc đậm nhất, legend ghi `≥ X`. Linear 0→max thì **một khoản Tết làm cả năm bẹp về bậc 1**. Ngày **không chi** dùng `--color-ramp-empty`, không phải bậc 1 — "không chi" không được trông như "chi ít".
- **#2 tuyệt đối một trục Y.** Thu/Chi cùng đơn vị VNĐ → không có cớ gì dùng 2 thang. (Dual-axis là lỗi biểu đồ phổ biến nhất: căn hai thang là tùy tiện nên nó **bịa ra** một tương quan không có trong dữ liệu.)
- **#5 thứ tự T2→CN.** `getDay()` của JS trả `0 = Chủ nhật` → phải xoay cho đúng thói quen Việt Nam.

**Quy cách mark:** cột **≤24px**, `rx="4"`; đường 2px **kèm `vector-effect="non-scaling-stroke"`** (mẫu cũ toàn `<rect>` nên chưa gặp; polyline trong `viewBox` co giãn sẽ **không** ra 2px thật nếu thiếu), thêm `stroke-linecap/linejoin="round" fill="none"`; lưới **hairline liền nét** (không nét đứt); khe **2px màu nền** giữa các đoạn cột chồng; nhãn **chọn lọc** (không ghi số lên mọi điểm); **chữ không bao giờ mang màu series**.

## 8. Token thêm vào `src/styles.scss`

Đặt ở cuối khối `:root` và cuối khối `body.dark-theme`.

**Luật:** mọi **màu biểu đồ** (series, ramp, lưới, trục) chỉ được tham chiếu qua `var(...)` trong SCSS của component — không hex. Đây là thứ giữ cho dark mode không vỡ.
*Ngoại lệ duy nhất đang có:* `color: #fff` cho chữ trên nút `.range-btn.active` (nền `--color-primary` là xanh đậm ở cả hai theme). Đây là pattern có sẵn của repo — `visitor-log-page.component.scss:91` làm y hệt cho đúng class đó.

```scss
/* :root — sáng */
--color-series-1: #2a78d6;  --color-series-5: #1baf7a;
--color-series-2: #008300;  --color-series-6: #eb6834;
--color-series-3: #e87ba4;  --color-series-7: #4a3aa7;
--color-series-4: #eda100;  --color-series-8: #e34948;
--color-series-muted: #94a3b8;           /* Khác + Chưa phân loại + đường nền emphasis */
--color-chart-gap: var(--color-surface); /* khe 2px -> tự đúng màu thẻ ở cả 2 theme */
--chart-grid: #e2e8f0;  --chart-axis: #cbd5e1;
/* ramp sequential: nhạt = chi ít */
--color-ramp-1: #cde2fb; --color-ramp-2: #9ec5f4; --color-ramp-3: #6da7ec;
--color-ramp-4: #3987e5; --color-ramp-5: #256abf; --color-ramp-6: #184f95;
--color-ramp-empty: #f1f5f9;

/* body.dark-theme — tối */
--color-series-1: #3987e5;  --color-series-5: #199e70;
--color-series-2: #008300;  --color-series-6: #d95926;
--color-series-3: #d55181;  --color-series-7: #9085e9;
--color-series-4: #c98500;  --color-series-8: #e66767;
--color-series-muted: #64748b;
--chart-grid: #334155;  --chart-axis: #475569;
/* ramp ĐẢO CHIỀU: luật là "chi ít CHÌM VÀO NỀN", không phải "chi ít = màu nhạt".
   Trên nền #1e293b, bậc nhạt lại là bậc NỔI nhất -> không đảo thì ngày chi nhiều
   chìm, còn ngày chi ít lại chói. */
--color-ramp-1: #184f95; --color-ramp-2: #256abf; --color-ramp-3: #3987e5;
--color-ramp-4: #6da7ec; --color-ramp-5: #9ec5f4; --color-ramp-6: #cde2fb;
--color-ramp-empty: #334155;   /* + viền 1px --color-border: #184f95 nằm sát nền tối */
```

`--color-chart-gap` trỏ `var(--color-surface)` nên khe cột chồng **tự đúng màu** ở cả hai theme mà không cần khai lại ở khối dark.

Chạy lại validator sau khi chốt để chắc ramp còn monotone.

## 9. Định dạng số

Từ đợt song ngữ (2026-07-22), định dạng số **không còn nằm trong `expense-analytics.transform.ts`** mà ở `AnalyticsFormatService` (`all-app-component/expense-analytics/analytics-format.service.ts`) — chuỗi tiền phụ thuộc cả locale lẫn từ điển, mà tầng transform thì cố ý là hàm thuần không biết `TranslateService`:

- `full()` — tooltip + bảng: `1.250.000 VNĐ` / `1,250,000 VND` (khớp `formatCurrency()` của trang Chi tiêu)
- `compact()` — nhãn trục: `12,5 tr` / `12.5M` (mẫu nằm trong từ điển vì tiếng Anh **không có dấu cách** trước đơn vị)
- `monthShort()` / `monthInline()` / `monthTitle()` — nhãn tháng, xem mục 11
- `percent()`, `time()`

Số lớn đứng một mình (KPI) dùng **chữ số tỷ lệ**; `font-variant-numeric: tabular-nums` **chỉ** cho cột số trong bảng và nhãn trục — `tabular-nums` làm số lớn trông rời rạc.

## 10. Song ngữ: vì sao trang này phải dựng lại view-model

Khác mọi feature khác, phần lớn chữ ở đây nằm **bên trong SVG** (nhãn trục, `<title>` tooltip, chú giải) và được dựng trong `build()` của từng biểu đồ, nên **không có pipe `translate` nào chạy lại** khi đổi ngôn ngữ.

Cách xử lý: `expense-analytics-page.component.ts` có một `effect()` đọc `LanguageService.language()` rồi gọi `rebuild()`. `@Input` của các biểu đồ nhận mảng mới → `ngOnChanges` → chuỗi sinh lại theo ngôn ngữ mới. **Không phát sinh request nào** — vẫn tính từ raw đã cache, đúng như khi đổi bộ lọc.

Phân công rạch ròi:

| Loại chữ | Cách làm |
|---|---|
| Render thẳng ra DOM (KPI, tiêu đề panel, đầu bảng) | Khoá i18n + pipe → tự đổi, không cần dựng lại |
| Nằm trong SVG | Dựng bằng `AnalyticsFormatService` lúc `build()` → cần `effect` ở trên |
| Nhãn tầng transform cần (`Chưa phân loại`, nhóm gộp) | Truyền vào qua `TransformLabels`, mặc định tiếng Việt |
| Tên loại chi (`ReasonType.reasonName`) | **Nguyên văn**, không dịch |

`KHONG_PHAN_LOAI = 'Chưa phân loại'` cũ đã đổi thành `UNCATEGORIZED = '__uncategorized__'`: hằng đó vừa là khoá gom nhóm vừa là sentinel so sánh `isMuted`, dịch thẳng nó sẽ làm phép so sánh trượt trong im lặng khi đổi ngôn ngữ.

## 11. Nhãn tháng

Ba dạng, tách ra vì lý do khác nhau chứ không phải cho vui:

| Hàm | Ra chuỗi | Dùng ở |
|---|---|---|
| `monthShort()` | `T7/26` / `Jul 26` | nhãn trục X (hẹp) — mẫu trong từ điển, không dùng `Intl` vì `vi-VN` cho `thg 7`, dài hơn và tràn nhãn |
| `monthInline()` | `tháng 7 năm 2026` / `July 2026` | giữa câu |
| `monthTitle()` | `Tháng 7 năm 2026` / `July 2026` | tiêu đề panel, chú giải |

Hai dạng cuối tách ra vì bản cũ viết `anchorLabel.toLowerCase()` để có dạng giữa câu — sang tiếng Anh sẽ ra `july 2026`, sai chính tả.

## 12. Đấu nối

1. `app.module.ts` — import + 9 component vào `declarations` (sau dòng 78 / 108). App là **NgModule, không standalone**, không lazy load.
2. `app-routing.module.ts` — `{ path: 'expense-analytics', component: ExpenseAnalyticsPageComponent }` ngay sau dòng 27 (`expense-record-list`), là child của shell `path: ''` → **`AuthGuard` tự kế thừa**.
3. `main-tab.component.html` — thêm `<li class="nav-item">` `📈 Phân tích` giữa dòng 22 và 23 (giữa "📊 Chi tiêu" và "🗓️ Thời khóa biểu").
4. `styles.scss` — 2 khối token ở §8.
5. **Không cần thêm module**: `FormsModule` + `NgSelectModule` đã có trong `AppModule.imports`.
6. **Không cần sửa `angular.json`**: không có budget nào được cấu hình → 9 component eager không thể làm vỡ build vì size.

## 13. Ba điểm sẽ làm trang "trông như hỏng" ngay ngày đầu

### A. Trang Chi tiêu âm thầm áp bộ lọc loại mặc định — rủi ro cao nhất

`expense-record-list.component.ts:270-287` (`applyDefaultFilters`) đọc `defaultFilterType` rồi **tự điền** `reasonTypeIdsFilterIn` (`=== 2`) / `reasonTypeIdsFilterOut` (`=== 3`) lúc load. Nghĩa là **"Tổng chi tháng" người dùng thấy ở tab Chi tiêu ĐÃ bị lọc sẵn**.

Nếu Phân tích hiện tổng **chưa lọc**, hai tab đá nhau và trang mới trông như hỏng ngay hôm đầu.

→ Vẫn fetch không lọc (để bật/tắt được), nhưng **preselect bộ lọc đúng theo mặc định đó** và ghi rõ trạng thái.

**Phải có CẢ HAI chiều lọc.** `defaultFilterType` có hai giá trị active: `2` = lọc *theo* (IN) và `3` = lọc *không phải* (OUT); repository áp cả hai (`FilterIn` **AND NOT** `FilterOut`). Bản đầu chỉ làm IN — và như vậy bẫy A **vẫn chưa được xử lý**: hễ tồn tại một loại `defaultFilterType = 3` thì tab Chi tiêu loại nó ra còn Phân tích thì không, tổng lại lệch. Làm một nửa còn tệ hơn không làm, vì nó tạo cảm giác đã đối chiếu xong. Trang có đúng hai ô `ng-select` gương lại trang Chi tiêu.

### B. Lọc loại không được áp cho thu

Thu **không có** loại (`IncomeRecord` chỉ có `Id, Reason, Amount, CreatedDate`). Nếu áp `reasonTypeIds` vào thu thì series Thu ở #2 **tụt về 0 ngay khi ai đó lọc** → trông y hệt lỗi dữ liệu.

→ Lọc **chỉ chi**; nhãn ghi rõ `Lọc loại (chỉ áp dụng cho chi)`; khi lọc đang bật thì chú thích ở #2 rằng Thu-vs-Chi không còn là so sánh cùng cơ sở.

### C. Vài cái bẫy nhỏ hơn nhưng tốn giờ

- **`**` wildcard redirect về `''`** → gõ sai path **không ra 404** mà im lặng nhảy về system-info. Lỗi routing biểu hiện thành "bấm tab không thấy gì".
- **`tsconfig` có `strict: true` nhưng `strictNullChecks: false`** → compiler **không** đỡ giúp chuyện null; toàn bộ guard ở §6.1 là do mình. `strictTemplates` thì **bật** nên binding trong template có kiểm kiểu.
- **Đừng inline object literal vào `@Input()` của biểu đồ** trong template → `ngOnChanges` bắn mỗi chu kỳ change detection với reference mới → **vòng lặp dựng lại**. Gán vào field trong `rebuild()`. (`visitor-log-page.component.ts:15` đã có comment về đúng chuyện này.)
- **Không thể tách `<svg>` qua component** — xem §4. Mất cả giờ để đoán nếu gặp mà không biết trước.

## 14. Ngôn ngữ & dark mode

**Đã song ngữ từ 22/07/2026** — nhánh `analytics.*` trong `src/app/i18n/`, cơ chế ở §10 và §11. Câu "toàn bộ chữ hiển thị là tiếng Việt" trong bản tài liệu cũ nay chỉ còn đúng với **tiếng Việt là ngôn ngữ gốc**: viết `vi.ts` trước, có dấu, `Xóa` không phải `Xoá`. Tên loại chi lấy từ DB thì giữ nguyên văn ở cả hai ngôn ngữ.

Dark mode **không phải tùy chọn**: mọi màu qua `var(--color-*)`, kiểm **cả hai** chế độ trước khi coi là xong.

## 15. Kiểm chứng

**Điều kiện tiên quyết dễ gây "âm tính giả":** backend phải chạy ở `https://localhost:44391` và trình duyệt phải **đã chấp nhận cert tự ký** (vào thẳng URL đó, bấm qua một lần). Nếu không, cả 3 POST fail → mọi panel hiện "Chưa có dữ liệu" → trông như lỗi tính toán chứ không phải lỗi mạng. Phải **đăng nhập trước** vì có `AuthGuard`.

**Bẫy cổng — và cách né sạch:** `environment.ts` trỏ `https://localhost:44391` (cổng **IIS Express**), còn `dotnet run --launch-profile https` mở **`https://localhost:7181`**. Đừng sửa `environment.ts` rồi commit nhầm — chỉ cần ép cổng lúc chạy:

```bash
cd API_Raspberry/API_Raspberry
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "https://localhost:44391"
```

Như vậy khớp thẳng `environment.ts`, không đụng file nào.

1. `cd Front_End_Raspberry && npx ng build` — cổng kiểm bắt buộc của repo.
2. `npx ng serve` → `localhost:4200`, đăng nhập, mở `📈 Phân tích`. Kiểm tab đúng chỗ, active đúng, và **không im lặng nhảy về system-info** (bẫy `**`).
3. **Chứng minh cache:** DevTools Network — đúng **3** request lần đầu; sang Chi tiêu rồi quay lại → **0** request; bấm "Tải lại" → 3 request. Đó là hợp đồng `refCount: false`.
4. **Đối chiếu với tab hàng xóm (phép thử thật sự):** cùng tháng, cùng bộ lọc → KPI *tổng chi tháng này* phải khớp **đến từng đồng** với "Tổng chi tháng" của tab Chi tiêu. Lệch thì gần như chắc chắn là **bẫy A** (lọc mặc định) hoặc do loại bản ghi không ngày — và dòng công bố số bản ghi bị loại (§6.1.3) cho biết là cái nào.
5. **Tự nhất quán nội bộ.** Chú ý **phạm vi khác nhau**, đừng so nhầm:
   - *Theo tháng neo:* `KPI tổng chi == cột Chi của tháng đó ở #2 == điểm cuối đường lũy kế #7 == Σ ô heatmap #6`.
   - *Theo cả khoảng đang xem:* `Σ thanh #3 == Σ chú giải #4 == Σ cột #5`.

   Biểu đồ #3 và #5 gộp **cả khoảng** (12/24 tháng…), không phải riêng tháng neo — tiêu đề phụ đã ghi rõ. Đem tổng của #3 so với KPI sẽ lệch, và đó là **đúng**, không phải lỗi. (Bản kế hoạch đầu viết bất biến này quá mạnh, gộp chung hai phạm vi.)

   Đây là phần thưởng của việc tính mọi thứ từ raw thay vì trộn `SumAll` (§6.2).
6. **Múi giờ (bẫy §6.1.1):** thêm khoản chi lúc ~00:30 và một khoản ~23:30 ngày cuối tháng → phải rơi **đúng** ô ngày ở heatmap và **đúng** cột tháng. Đây là lỗi dễ ship mà không ai thấy nhất.
7. **Dark mode:** bật/tắt ở Cài đặt → Theme, phải đổi ngay **không cần reload**; rồi `grep -n "#"` trong SCSS component mới → phải **0 kết quả**.
8. **Trạng thái rỗng/suy biến:** lọc về một loại không có bản ghi → mọi panel hiện empty text, **không `NaN` trong DOM** (soi thuộc tính `y` của một `<rect>`), trục không vỡ. Thử lọc còn đúng 1 tháng, và còn đúng 1 bản ghi.
9. **Table twin:** bật "Bảng" ở cả 7 panel, số phải khớp biểu đồ. Đây **cũng là relief bắt buộc** cho WARN contrast ở §3 nên **không phải tùy chọn**.
10. **Responsive + console:** 320px và zoom 200% — viewBox co giãn đúng, nhãn X thưa còn ~8, nav 5 tab không vỡ shell; console không có `NG0100 ExpressionChangedAfterItHasBeenChecked` (sẽ xuất hiện nếu biểu đồ tính hình học trong getter của template thay vì `ngOnChanges`).

## 16. Kết quả kiểm chứng (17/07/2026)

`npx ng build` PASS (chỉ còn cảnh báo `lunisolar` vốn có sẵn). Lái Chrome thật qua skill `chrome-playwright`, dữ liệu local dựng riêng để ép ca biên:

| Kiểm | Kết quả |
|---|---|
| Render: 4 KPI, 6 panel, đủ mark ở cả 7 biểu đồ | ✅ |
| **Bẫy 7** — quét toàn bộ `x/y/width/height/d/cx/cy` trong DOM tìm `NaN`/`Infinity` | ✅ không có |
| **Bẫy 3** — công bố khoản thiếu ngày | ✅ *"2 khoản chưa có ngày…"* |
| **Bẫy 2** — tháng trống (T4, T5/2026) | ✅ hiện ra là khoảng trống thật, không bị nén |
| **Bẫy 5** — trùng nhãn nhóm gộp (DB **có** loại tên thật là "Khác") | ✅ nhóm gộp tự đổi thành *"Các loại còn lại"*, chú giải hiện cả hai riêng biệt |
| **Bẫy 1** — múi giờ: khoản **00:30** ngày 17/7 | ✅ ở lại ngày 17 (`Ngày 17: 135.002 VNĐ · 3 khoản`) |
| **Bẫy 1** — khoản **23:30** ngày 30/6 | ✅ ở lại tháng 6 (`Ngày 30: 88.000 VNĐ · 1 khoản`) |
| **Bẫy 8** — ngày chưa tới vs không chi | ✅ 14 ô *"chưa tới"* (viền đứt) tách khỏi 1 ô *"không chi"* |
| Bảng số bật được ở cả 6 panel, 0 hàng `<tr>` rỗng | ✅ |
| Dark mode: đổi tức thì, không mảng trắng, ramp đảo chiều đúng | ✅ ngày chi nhiều **sáng** lên, ngày chi ít chìm về nền |
| Console (bỏ 401 của `ThemeService` lúc chưa đăng nhập) | ✅ sạch, không `NG0100` |
| **Hợp đồng cache** (đếm request thật) | ✅ 3 lần đầu → **0** khi rời trang rồi quay lại → 3 khi bấm "Tải lại" → **0** khi đổi bộ lọc |
| **Responsive** 320px và ~zoom 200% (700px) | ✅ 0px tràn ngang, 0 nhãn loại bị cắt chữ |

Nếu dùng `toISOString()` như `visitor-log-page.component.ts:125` thì **cả hai phép kiểm múi giờ đều trượt**.

### Cách đếm request cho đúng

Đo hợp đồng cache thì **đừng đi qua tab "Chi tiêu"**: trang đó *tự nó* gọi `GetAllExpenseNote` + `GetAllReasonType`, nên phép đo sẽ ra "2 request" và trông như cache hỏng. Đi qua **"Thông tin hệ thống"** (không đụng các endpoint này) mới đếm đúng phần của trang Phân tích.

### Ba lỗi responsive đã sửa (đều chỉ lộ ra khi đo thật)

1. **`grid-template-columns: repeat(7, 1fr)` ở heatmap làm tràn trang.** `1fr` ngầm là `minmax(**auto**, 1fr)`, và phần `auto` không cho track co nhỏ hơn nội dung — `aspect-ratio` + `min-height` ép ô rộng tối thiểu 30px rồi đẩy cả trang tràn ngang. Phải là **`minmax(0, 1fr)`**. Cùng lỗi này với `minmax(340px, 1fr)` ở `.panel-grid` và `minmax(190px, 1fr)` ở `.kpi-row` → dùng `minmax(min(340px, 100%), 1fr)`.
2. **`.chart-head` bóp tiêu đề còn mỗi dòng một chữ** ở khung hẹp, vì nút "Biểu đồ/Bảng" giành chỗ. Cần `flex-wrap: wrap` + `min-width: 0` trên `.chart-heading`.
3. **Nhãn loại ở #3 bị cắt còn `H...`, `F...`** ở 320px — số tiền đầy đủ chiếm hết chỗ, làm **mất luôn danh tính**, chỉ còn con số không biết của ai. Dưới 560px cho `.rank-row` xuống dòng: tên loại một dòng, số liệu dòng dưới. (Hết tràn ngang **không** đồng nghĩa với đọc được — phải nhìn ảnh, không chỉ đo số.)

## 17. Việc còn lại

Đã xong: đăng ký vào skill `feature-map` (`SKILL.md` + `references/features.md`), kiểm responsive, kiểm hợp đồng cache.

Chưa làm / cân nhắc sau:

- **Không có unit test.** `expense-analytics.transform.ts` là hàm thuần, không DI — cố tình để test được bằng `ng test` mà không cần TestBed. Đáng viết cho `enumerateMonths` (tràn năm), `monthKey`/`dayKey` (múi giờ), `nhanGopKhongTrung` (trùng nhãn), và `deltaPercent` (chia 0). Hiện mới kiểm bằng cách lái trình duyệt thật.
- **Dữ liệu lệch mạnh** (một loại chiếm ~75%) làm phần đuôi của #3 và #4 gần như vô hình. Thang tuyến tính là **trung thực**, và bảng số bù lại được — **đừng "sửa" bằng thang log**, nó sẽ nói dối về tỷ lệ.
- **Tooltip đang dùng `<title>` của SVG/HTML** (giống tiền lệ `visit-trend-chart`): không style được và hiện chậm theo trình duyệt. Đủ dùng vì mọi giá trị đều đã đọc được qua nhãn trực tiếp hoặc bảng số — tooltip chỉ là bổ trợ, không phải cửa duy nhất để lấy số.
- **Dữ liệu local hiện có là dữ liệu test do tôi seed** (thu nhập, khoản thiếu ngày, khoản 00:30 / 23:30, tháng 6–7/2026) để ép các ca biên ở §13. Không phải dữ liệu thật.
