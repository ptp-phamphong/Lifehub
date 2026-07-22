# Kế hoạch: chuyển app sang song ngữ (Việt / Anh)

**Trạng thái:** Angular web coi như xong — **13/13 đơn vị đã dịch**, trong đó **12/13 đã verify bằng trình duyệt thật**; chỉ còn `zalo` code xong + build sạch nhưng **chưa verify**. Mobile (Expo) **cố ý tạm dừng theo yêu cầu của chủ repo** (2026-07-22) — chưa dựng hạ tầng, quay lại sau, không phải việc bị bỏ sót.
**Ngày lập:** 2026-07-20
**Cập nhật gần nhất:** 2026-07-22
**Phạm vi đã chốt:** Angular web + Expo mobile. Backend **ngoài phạm vi** đợt này.

---

## 1. Quyết định nền tảng và lý do

### Chọn `@ngx-translate/core` v18, loại `@angular/localize`

Lý do quyết định **không** nằm ở tính năng thư viện mà ở hạ tầng deploy của repo này.

`@angular/localize` là cơ chế compile-time: mỗi ngôn ngữ sinh ra **một thư mục build riêng**, và việc định tuyến giữa các ngôn ngữ do *server* làm, không phải app. Angular đã đóng issue xin runtime switching ([#38953](https://github.com/angular/angular/issues/38953), closed as not planned; [#56318](https://github.com/angular/angular/issues/56318) vẫn treo), nên mô hình nhiều-build vẫn là hiện trạng.

Áp vào repo này thì đó là chi phí thật:

- `deploy.ps1` (`Deploy-Frontend`, ~dòng 137-155) hiện build **một** thư mục `dist/front-end-raspberry` rồi `scp` nguyên khối sang `/var/www/app`.
- `--base-href=/app/` chỉ được truyền từ `deploy.ps1`, **không** nằm trong `angular.json`.
- Caddy dùng `handle_path /app/*` để strip prefix.

Đi theo `@angular/localize` = N build với N base-href khác nhau, sửa `Deploy-Frontend`, thêm N rule Caddy — lặp lại mỗi lần thêm ngôn ngữ, cho một app một người maintain.

Runtime library thì: **một build, một rule Caddy, không đổi `deploy.ps1`**, bất kể sau này thêm bao nhiêu ngôn ngữ.

### Vì sao không phải Transloco

Điểm mạnh nhất của Transloco là **lazy-load bản dịch theo feature**. App này **không lazy-load route nào** (`app-routing.module.ts:21-62` import eager toàn bộ), nên lợi thế đó vô dụng ở đây. Tooling dò key thiếu của Transloco (Keys Manager) thì hữu ích thật, nhưng đã được thay bằng cơ chế typed dictionary rẻ hơn (mục 2).

**Điều gì sẽ đảo ngược quyết định này:** nếu app chuyển sang lazy-load route, hoặc cần SEO/pre-render theo ngôn ngữ, hoặc chạy đa domain (`vi.…`/`en.…`). Lúc đó `@angular/localize` mới là lựa chọn đúng.

### Vì sao dùng typed dictionary thay vì JSON

`ngx-translate` mặc định fetch JSON qua HTTP. JSON trần **không có kiểm tra kiểu**, nên thiếu key ở một ngôn ngữ thì tới lúc chạy mới lộ. Ta thay bằng `TypedDictLoader` trả về object đã được TypeScript kiểm tra.

**Đã kiểm chứng, không phải phỏng đoán:** xoá thử một key trong `en.ts` → `error TS2741: Property 'save' is missing in type ... but required in type ...`. File đã khôi phục nguyên vẹn sau khi thử.

Cần nói rõ giới hạn để không kỳ vọng sai:

| Trường hợp | Có bắt được? |
|---|---|
| `en.ts` thiếu key mà `vi.ts` có | ✅ Lỗi compile |
| `en.ts` thừa key lạ | ✅ Lỗi compile |
| Gõ sai key trong template (`'login.titel'`) | ❌ Chỉ hiện chuỗi thô lúc chạy |

Muốn chặn cả trường hợp thứ 3 phải sinh hằng số key — chưa làm, cân nhắc sau nếu gõ sai key trở thành vấn đề thật.

**Đánh đổi của typed dict:** file dịch nằm trong bundle chính thay vì tải riêng. Với cỡ app này (vài chục KB text) không đáng kể. Nếu bundle phình lên, đổi sang HTTP loader chỉ cần sửa `typed-dict.loader.ts`, không đụng component nào.

---

## 2. Sự thật về API của ngx-translate v18

Kiểm chứng trực tiếp từ file type definition của package đã cài (`node_modules/@ngx-translate/core/types/`), **không** lấy từ blog. Hầu hết tutorial ngoài mạng mô tả v14-v16 và **sai** với v18:

- **Không còn `TranslateModule`.** Setup chỉ qua provider function: `provideTranslateService`, `provideTranslateLoader`. Tutorial nào dùng `TranslateModule.forRoot()` là của bản cũ.
- `TranslatePipe` và `TranslateDirective` là **standalone** → app dùng NgModule phải thêm vào `imports`.
- Option tên là **`fallbackLang`**, không phải `defaultLanguage`.
- `TranslateService.currentLang` là **Signal**; `instant()` và `get()` vẫn còn.
- Truyền loader dạng bare class sẽ ra cảnh báo console → phải bọc: `loader: provideTranslateLoader(TypedDictLoader)`.

---

## 3. Hạ tầng đã dựng (ĐÃ XONG)

```
Front_End_Raspberry/src/app/
├── i18n/
│   ├── types.ts                  # Dictionary, Language, LOCALE_BY_LANGUAGE, isLanguage
│   ├── typed-dict.loader.ts      # TranslateLoader trả dict từ bộ nhớ
│   └── dictionaries/
│       ├── vi.ts                 # ngôn ngữ gốc
│       └── en.ts
└── services/
    └── language.service.ts       # signal + localStorage
```

`Dictionary` cố ý khai báo bằng `type` chứ **không** phải `interface`: interface trong TypeScript không tự sinh index signature nên không gán được vào `TranslationObject` của ngx-translate.

Đã sửa:
- `app.module.ts` — `provideTranslateService` + `registerLocaleData(localeVi/localeEn)` + `TranslatePipe`/`TranslateDirective` vào `imports`.
- `app.component.ts` — gọi `languageService.init()` trong **constructor**, không phải `ngOnInit`: bản dịch phải sẵn sàng trước lần render đầu, nếu không sẽ nháy key thô ra màn hình.

Thứ tự ưu tiên khi xác định ngôn ngữ: **lựa chọn đã lưu → ngôn ngữ trình duyệt → tiếng Việt**.

---

## 4. Hai pattern bắt buộc (rút ra từ bản mẫu `login`)

### 4.1. Message của client lưu dạng KEY, không lưu chuỗi đã dịch

Đây là pattern quan trọng nhất của cả kế hoạch. Làm sai sẽ nhân ra bug ở toàn bộ ~140 file.

```ts
// ĐÚNG — đổi ngôn ngữ thì message đổi theo
errorKey = 'login.invalidCredentials';   // key, template dịch
errorRaw = '';                            // nguyên văn từ backend

// SAI — message kẹt ở ngôn ngữ lúc nó được tạo ra
errorMessage = this.translate.instant('login.invalidCredentials');
```

```html
<div *ngIf="errorKey || errorRaw" class="error-message">
  {{ errorKey ? (errorKey | translate) : errorRaw }}
</div>
```

Quy tắc: **lỗi sinh ở client → lưu key. Message do backend trả về → lưu nguyên văn** (nó là câu chữ sẵn, không phải key).

**Getter thì an toàn, field thì không.** `user-form.component.ts` có `get dialogTitleKey()` chọn tiêu đề theo chế độ dialog. Getter được tính lại mỗi chu kỳ change detection nên *về mặt kỹ thuật* trả thẳng `instant()` cũng chạy đúng — nhưng vẫn trả **key** cho nhất quán, và để không ai copy nhầm sang một `field` (chỗ đó thì hỏng thật).

**`window.confirm` / `alert` là ngoại lệ được phép dùng `instant()`** — chúng cần chuỗi ngay tại chỗ gọi, không có template để chạy pipe. Bắt buộc: dùng xong bỏ, **không gán vào field**. Xem `semester-metadata-list`, `system-configuration-list`, `user-list`.

Đã verify trên trình duyệt: lỗi đang hiện bằng tiếng Anh, bấm sang VI thì đổi sang tiếng Việt ngay lập tức.

### 4.2. Ngày / số / tiền phải truyền locale tường minh

`LOCALE_ID` **cố định lúc bootstrap**, không phản ứng với việc đổi ngôn ngữ lúc chạy. Nên không được dựa vào nó:

```html
<!-- SAI: luôn dùng locale lúc bootstrap -->
{{ amount | currency:'VND' }}

<!-- ĐÚNG: truyền locale từ LanguageService -->
{{ amount | currency:'VND':'symbol':'1.0-0':locale() }}
{{ date | date:'short':undefined:locale() }}
```

VND dùng **0 chữ số thập phân** (`'1.0-0'`), khác USD.

**Không phải chỗ nào cũng dùng được pipe.** `expense-record-list` định dạng tiền bằng `toLocaleString()` trong hàm `formatCurrency()` chứ không qua `CurrencyPipe`. Cách chữa giống hệt: lấy `locale()` từ `LanguageService` thay cho `'vi-VN'` viết cứng. Hàm được gọi từ template nên chạy lại mỗi chu kỳ change detection → đổi ngôn ngữ là số tự định dạng lại.

Khác biệt thật, không phải chi tiết vụn: `1.000.000` (vi) và `1,000,000` (en) đảo vai trò dấu chấm và dấu phẩy. Bỏ sót thì người dùng English đọc `1.000.000` thành "một phẩy không".

**Bẫy đã dính thật khi refactor `ThemeService`:** `classList.toggle(name, force)` coi `force === undefined` là "không truyền tham số" rồi **lật** trạng thái, thay vì tắt. Kiểu TypeScript khai là `boolean` nhưng JSON lúc chạy không đảm bảo — server trả payload thiếu `webDarkMode` là dark mode tự bật/tắt mỗi lần tải trang. Luôn ép `!!value` trước khi truyền vào `toggle()`. Code cũ dùng `if/else` nên vô tình miễn nhiễm; bản refactor "gọn hơn" thì không.

**Ngày thì cố ý giữ `dd/MM/yyyy` ở cả hai ngôn ngữ.** Không đổi sang `MM/dd/yyyy` cho English: `dd/MM` là chuẩn của hầu hết nước nói tiếng Anh ngoài Mỹ, và đổi định dạng ngày theo ngôn ngữ dễ gây đọc nhầm hơn là giúp ích.

**Số nhiều trong tiếng Anh cần key riêng.** ngx-translate không có ICU plural sẵn. Chuỗi có đếm phải tách hai key (`itemCount` / `itemCountOne`) và chọn ở template, nếu không sẽ ra `1 entries`. Tiếng Việt không chia số nhiều nên hai bản trùng nhau — cố ý, không phải sao chép thừa.

Component cần format thì expose:
```ts
readonly locale = inject(LanguageService).locale;
```

### 4.3. CHỈ dịch label — dữ liệu trong DB để nguyên

**Đây là ranh giới phạm vi, do chủ repo chốt. Không phải hạn chế kỹ thuật, không phải việc còn nợ.**

Ranh giới: **chuỗi do lập trình viên viết ra trong code thì dịch; chuỗi do người dùng/hệ thống ngoài nhập vào và nằm trong DB thì hiển thị nguyên văn.**

Người dùng nhập `Vũng Tàu` làm tên loại chi tiêu thì ở chế độ English nó **vẫn là `Vũng Tàu`**. Đúng như mong muốn — không dịch, không transliterate, không thêm bảng translation cho dữ liệu.

| Nguồn | Ví dụ | Xử lý |
|---|---|---|
| Label viết trong `.html` / `.ts` | `Lưu`, `Tổng chi`, `Chưa phân loại` | ✅ Dịch |
| Header bảng, placeholder, tooltip, nút | `Thiết bị`, `Tìm kiếm…` | ✅ Dịch |
| Message lỗi sinh ở client | `Vui lòng nhập mật khẩu` | ✅ Dịch (dạng key) |
| `ReasonType.ReasonName` | `Vũng Tàu`, `Ăn uống` | ❌ Nguyên văn |
| `ExpenseRecord.Reason`, `IncomeRecord.Reason` | ghi chú tự do | ❌ Nguyên văn |
| `CourseSchedule.*` (`CourseName`, `Room`, `Lecturer`, `LearningMode`) | từ portal UEH | ❌ Nguyên văn |
| `SemesterMetadata.SemesterName` | `Học kỳ cuối 2025` | ❌ Nguyên văn |
| `User.Name`, `User.Username`, `User.Email` | | ❌ Nguyên văn |
| `SystemConfiguration.KeyConfig` / `ValueConfig` | `THEME_WEB_DARK` | ❌ Nguyên văn |
| `VisitEvent.*` (`City`, `CountryName`, `Browser`, `Os`, `DeviceType`, `PageTitle`) | từ DB-IP / user-agent | ❌ Nguyên văn |
| `PhoneNotification.*` (`AppName`, `Title`, `Text`) | nội dung thông báo điện thoại | ❌ Nguyên văn |
| `VisitorKnownIp.Label` | nhãn người dùng tự đặt | ❌ Nguyên văn |
| Message backend trả về | | ❌ Nguyên văn (`xxxRaw`, mục 4.1) |

Hệ quả **bình thường, không phải bug**:

- Màn hình English sẽ **trộn hai ngôn ngữ**. Biểu đồ theo danh mục hiện `Vũng Tàu`, `Ăn uống` cạnh nhãn tổng hợp `Other` — vì `Other`/`Uncategorized` là nhãn code sinh ra (`expense-analytics.transform.ts:35,395`, `model/expense-analytics.model.ts:7,108`), còn tên danh mục là dữ liệu. Đúng thiết kế.
- `learningModeLabel()` trong `utils/learning-mode.ts:29-32` trả thẳng giá trị DB (`ONLINE`, `LMS`, `NGHỈ`). File này **không cần đụng tới**. Đừng biến nó thành hàm dịch — `NGHỈ` còn được so sánh làm sentinel ở `isCancelledSession()`, dịch nó sẽ làm hỏng logic phát hiện buổi nghỉ.

Kiểm tra nhanh khi review: chuỗi này có nằm trong file `.cs`/`.html`/`.ts` mà lập trình viên gõ ra không? Có → dịch. Nó đi từ HTTP response vào → để yên.

---

## 5. Quy trình chuyển một feature

Lặp lại cho từng feature. Mỗi feature là một đơn vị công việc độc lập, làm xong verify xong mới sang cái tiếp.

1. **Đọc** `.html` và `.ts` của feature, liệt kê mọi chuỗi **viết cứng trong code**. Bỏ qua mọi thứ là interpolation dữ liệu (`{{ row.reasonName }}`, `{{ v.city }}`) — đó là dữ liệu DB, giữ nguyên (mục 4.3).
2. **Thêm nhánh vào `Dictionary`** trong `i18n/types.ts`, đặt tên theo feature (`expenseList: { … }`).
3. **Viết `vi.ts`** — bê nguyên chuỗi tiếng Việt đang có, không sửa câu chữ (giữ nguyên để dễ đối chiếu).
4. **Viết `en.ts`** — TypeScript sẽ báo ngay nếu thiếu key nào.
5. **Sửa template**: `{{ 'key' | translate }}`; với thuộc tính thì bind: `[placeholder]="'key' | translate"`, `[title]="'key' | translate"`.
6. **Sửa `.ts`**: đổi field message sang cặp `xxxKey` / `xxxRaw` (mục 4.1). Với `window.confirm`/`alert` thì phải dịch ngay tại chỗ gọi → dùng `translate.instant('key')`.
7. **Sửa pipe format** sang dạng truyền locale (mục 4.2).
8. **Verify**: `npx ng build` + mở trình duyệt, đổi VI↔EN, kiểm tra **cả light lẫn dark**.

### Những chỗ grep theo thư mục feature sẽ bỏ sót

Đã dính thật, không phải cảnh báo lý thuyết:

- **File vỏ ứng dụng** không nằm trong thư mục feature nào — `app.component.html` giữ overlay loading toàn cục, hiện đè lên mọi trang. Quét theo từng thư mục feature sẽ không bao giờ thấy nó.
- **Chuỗi chỉ hiện trong một trạng thái thoáng qua** (overlay lúc đang tải, chỉ báo "Đang lưu…", thông báo lỗi validation). Mở trang xem bình thường sẽ không thấy — phải chủ động tạo ra trạng thái đó mới lộ.
- **Thuộc tính, không phải nội dung thẻ**: `placeholder`, `title`, `aria-label`. Nhìn bằng mắt trên trang dễ bỏ qua vì chúng không phải text hiển thị thường trực.

### Lưu ý cho file không phải component

`expense-analytics.transform.ts` (~88 dòng chuỗi) và `model/expense-analytics.model.ts` (~33 dòng) là file util/model thuần, **không dùng được pipe `| translate`**. Hai lựa chọn:

- **Ưu tiên:** trả về *key* thay vì chuỗi, để component/template dịch. Giữ được hàm thuần, dễ test.
- Chỉ khi bất khả kháng: truyền `TranslateService` vào hàm và gọi `instant()`.

Không refactor những file này thành service chỉ để inject `TranslateService` — trả key ra ngoài rẻ hơn nhiều.

---

## 6. Thứ tự thực hiện

Ước lượng "dòng" = số dòng có chứa dấu tiếng Việt (đếm bằng grep), là bậc độ lớn chứ không phải số chuỗi chính xác.

**Cảnh báo về con số này:** grep đếm cả **comment** và `console.error` — hai thứ *không* phải chuỗi hiển thị và *không* dịch. `month-pagination` ước lượng ~10 dòng nhưng thực tế **bằng 0**. Kiểm tra thật trước khi tin ước lượng, nhất là với các feature nhỏ.

### Angular web

| # | Feature | ~Dòng | Ghi chú |
|---|---|---|---|
| ✅ | `login` | 48 | **Xong** — bản mẫu tham chiếu |
| ✅ | `main-tab`, `settings-tab` | ~30 | **Xong** — nhánh `nav.*` và `settings.*` |
| ✅ | `theme-settings` | ~20 | **Xong** — nhánh `theme.*`, đã gắn bộ chọn ngôn ngữ |
| ✅ | `month-pagination` | 0 | **Không có gì để dịch** — template chỉ có số (`{{ m.month }}/{{ m.year }}`) và hai nút `<` `>`; 2 dòng tiếng Việt trong `.ts` là comment. Ước lượng ~10 dòng ban đầu đếm nhầm comment thành chuỗi |
| ✅ | `reason-type` | ~25 | **Xong** — nhánh `reasonType.*`. Ca đầu tiên gặp lỗi §4.1 thật: `message` giữ chuỗi đã dịch → đổi thành `messageKey` |
| ✅ | `semester-metadata` | ~25 | **Xong** — nhánh `semester.*`; sửa luôn `window.confirm` viết không dấu |
| ✅ | `system-configuration` | ~25 | **Xong** — nhánh `systemConfig.*`; cùng bug `window.confirm` không dấu |
| ✅ | `user-management` | ~30 | **Xong** — nhánh `user.*`; dialog 3 chế độ, tiêu đề là getter trả key |
| ✅ | `system-info-tab` | ~20 | **Xong** — nhánh `systemInfo.*`. Đơn vị (`GiB`, `GB`, `°C`) và message lỗi HttpClient giữ nguyên văn |
| ✅ | `expense-record` + `expense-record-list` | ~60 | **Xong** — nhánh `expense.*`. Ca §4.2 đầu tiên: `formatCurrency` từng cứng `'vi-VN'` |
| ✅ | `course-schedule` (**5** component) | ~70 | **Xong** — nhánh `course.*`. Thực tế là 5 component chứ không phải 4 (`course-calendar` là vỏ chứa hai toggle, dễ bị bỏ sót). Ca đầu tiên phải dịch tên thứ/tháng — xem mục riêng bên dưới |
| ✅ | `jobs` | ~30 | **Xong** — nhánh `jobs.*`. Lộ ra bug `toFixed` có sẵn từ trước, xem mục riêng bên dưới |
| 🔄 | `zalo` | ~40 | **Code xong, build sạch, CHƯA verify bằng trình duyệt** — nhánh `zalo.*`. Quét lại file: không còn chuỗi cứng nào ngoài comment. Ghi chú "nhiều `window.confirm`" trong bản kế hoạch cũ là **sai**: không có `confirm` nào. Cái thật sự khó là mẫu `r.message \|\| 'dự phòng'` lặp ở 6 chỗ — xem mục riêng bên dưới |
| ✅ | `visitor-log` (**6** component) | ~148 | **Xong** — nhánh `visitor.*` (~110 khoá). Đã verify trên trình duyệt thật: 4 tab × VI/EN × light/dark, 3 hộp thoại, tooltip SVG (xem mục "Kết quả verify" bên dưới). Là **6** component chứ không phải 5: `visitor-log-page`, `visitor-log-list`, `visitor-overview`, `visitor-profile-list`, `visit-trend-chart`, `known-ip-list`. Attribution DB-IP tách đôi, `known-ip-list.message` là ca §4.1 nữa, và lại thêm ba hộp thoại viết không dấu — xem mục riêng bên dưới |
| ✅ | `expense-analytics` (9 component + 1 file transform) | ~228 | **Xong** — nhánh `analytics.*` (~90 khoá) + `AnalyticsFormatService` mới. Đã verify: 4 tổ hợp ngôn ngữ × theme, cả chế độ Biểu đồ lẫn Bảng. Là feature đầu tiên phải **dựng lại view-model khi đổi ngôn ngữ** — xem mục riêng bên dưới |

Ngoài bảng trên, `app.component.html` (vỏ ứng dụng) cũng đã chuyển: overlay loading toàn cục dùng `common.loading`. Nó không nằm trong feature folder nào nên suýt bị bỏ sót — chỉ lộ ra khi verify bằng trình duyệt thật, vì overlay chỉ hiện lúc có request đang chạy.

**Đã quét toàn bộ `src/` ngoài `all-app-component/`** (services, interceptors, model, utils, `index.html`): chỉ còn **đúng một** chuỗi hiển thị chưa dịch là `KHONG_PHAN_LOAI` trong `model/expense-analytics.model.ts` — thuộc phần việc `expense-analytics`, xem mục riêng bên dưới. Mọi dòng tiếng Việt còn lại ở các file đó đều là **comment**, không phải chuỗi hiển thị.

#### Còn đúng những việc này

1. **`zalo`** — code xong, chỉ còn verify bằng trình duyệt thật. Kịch bản cần chạy: mọi trạng thái `ZaloLoginResult` và `ZaloSendResult`, **mỗi trạng thái chạy hai lần — một lần backend có `message`, một lần không** (đó chính là thứ cặp `…Key`/`…Raw` sinh ra để xử lý; không thử cả hai thì coi như chưa kiểm tra gì). Feature chỉ chạy trên Pi nên phải stub `enabled: true`, nếu không trang chỉ hiện thông báo tắt.
2. **Mobile** — cả 8 screen, chưa dựng hạ tầng.

**Web coi như xong**: mọi feature trong bảng trên đã tick, chỉ còn `zalo` chờ verify. Việc kèm theo ở mục 9 cũng đã làm xong hai phần đầu (`Information_AI/24`, sửa `CLAUDE.md` + skill `add-feature`).

### `expense-analytics`: chữ nằm trong SVG thì pipe không cứu được

Đây là feature đầu tiên phá vỡ giả định ngầm của cả kế hoạch — rằng **dịch = thay chuỗi cứng bằng `| translate`**. Ở trang này phần lớn chữ (nhãn trục, `<title>` tooltip, chú giải) được **dựng bằng tay trong `build()`** của từng biểu đồ rồi nhét vào SVG, nơi không có pipe nào chạy.

Ba cách xử lý được cân nhắc:

1. Cho mỗi biểu đồ tự inject `TranslateService` và tự đăng ký `onLangChange` — 5 chỗ lặp cùng một đoạn, và biến component "dumb" thành component biết ngôn ngữ.
2. Đổi mọi nhãn thành khoá rồi dịch trong template — không làm được, chuỗi nằm trong thuộc tính `title` và text SVG do code sinh.
3. **Đã chọn:** trang cha có một `effect()` đọc `LanguageService.language()` rồi gọi `rebuild()`. `@Input` nhận mảng mới → `ngOnChanges` → chuỗi sinh lại. Một chỗ duy nhất, các biểu đồ không đổi vai trò.

Chi phí của (3) đúng bằng chi phí đổi bộ lọc — tính lại từ raw đã cache, **không có request nào** (trang này vốn không refetch khi đổi lọc). Đã đo lại: đổi ngôn ngữ không sinh request.

**Hệ quả cần nhớ:** ở trang này, chuỗi đã dịch nằm trong field **không** vi phạm §4.1 — vì có `effect` bảo đảm nó được sinh lại. §4.1 vẫn nguyên giá trị ở mọi chỗ khác, nơi không có gì dựng lại giúp.

Ranh giới đã áp: **render thẳng ra DOM thì dùng khoá + pipe** (KPI, tiêu đề panel, đầu bảng, trạng thái rỗng), **nằm trong SVG thì dựng bằng `AnalyticsFormatService`**. Chọn khoá cho `chart-panel.emptyTextKey` chính vì lý do đó — nó render ra DOM.

### `AnalyticsFormatService`: hàm thuần không dịch được, nên tách service

`expense-analytics.transform.ts` cố ý là hàm thuần, không DI (để test không cần TestBed). Nhưng nó đang giữ `formatCurrencyFull/Compact` (cứng `'vi-VN'` + `' VNĐ'`) và `monthLabel/monthLabelDai` — đều cần locale lẫn từ điển.

Đã tách làm hai:

- **Định dạng** (tiền, tháng, phần trăm, giờ) → `AnalyticsFormatService`. Năm component biểu đồ inject nó.
- **Nhãn mà transform bắt buộc phải biết** (nhóm "chưa phân loại", nhãn nhóm gộp) → **truyền vào** qua tham số `TransformLabels`, mặc định tiếng Việt. Đúng tiền lệ đã áp cho `formatLunarDateVN`.

`monthLabelDai` cũ trả `Tháng 7/2026`; nay dùng `Intl` cho ra `Tháng 7 năm 2026` / `July 2026` — thống nhất với `course-schedule`.

### Ba bẫy mới, cả ba đều chỉ lộ ra ở bản tiếng Anh

**1. `KHONG_PHAN_LOAI` — đã xử lý đúng như dự đoán.** Đổi thành `UNCATEGORIZED = '__uncategorized__'`, giữ làm khoá gom nhóm; nhãn hiển thị truyền vào lúc dựng. Điểm phải cẩn thận: **tính `isMuted` so với sentinel TRƯỚC, đổi sang nhãn hiển thị SAU**. Làm ngược thì phép so sánh trượt trong im lặng.

**2. `toLowerCase()` để có dạng viết giữa câu là bug tiếng Anh.** Bản cũ viết `anchorLabel.toLowerCase()` cho ra `so với tháng 6/2026` — hợp lý trong tiếng Việt. Sang tiếng Anh nó thành `july 2026`, sai chính tả. Nay tách hẳn hai hàm: `monthInline()` (dạng `Intl` gốc, vi vốn đã viết thường) và `monthTitle()` (hoa chữ đầu). **Không tự đổi hoa/thường của chuỗi do `Intl` sinh ra** — mỗi ngôn ngữ có luật riêng.

**3. ngx-translate không có luật số nhiều → `{{count}} categories` ra `1 categories`.** Gặp thật lúc verify (lọc đúng 1 loại) và ở tooltip heatmap, nơi **một ngày chỉ có một khoản là chuyện thường ngày**. Không thêm compiler ICU chỉ vì mấy dòng chữ; thay vào đó **viết tiếng Anh sao cho đúng với mọi số đếm**:

| Trước | Sau |
|---|---|
| `{{count}} categories` | `including {{count}}` |
| `{{count}} entries have no date…` | `Entries with no date ({{count}}) are…` |
| `· {{count}} entries` | `· entries: {{count}}` |

Tiếng Việt không có vấn đề này nên giữ nguyên. **Đây là thứ cần kiểm khi dịch bất kỳ khoá nào có `{{count}}`** — nhánh `visitor.*` cũng có vài chỗ cùng dạng, chưa sửa vì con số ở đó hiếm khi bằng 1.

### Một cái đúng sẵn: `toFixed()` trong path SVG

Như đã ghi ở mục trên, `cumulative-month-chart` dùng `toFixed(2)` cho toạ độ `d`. **Đã kiểm và giữ nguyên** — đúng như dự đoán ban đầu. Đường lũy kế vẫn vẽ bình thường ở bản tiếng Việt sau khi đổi (`vi-VN` dùng dấu phẩy thập phân, nếu "sửa" chỗ này thì path vỡ).

### Kết quả verify `expense-analytics` (2026-07-22)

`npx ng build` PASS. Lái Chrome thật (profile `raspberry-pi-local`), **4 tổ hợp** {vi, en} × {light, dark}, mỗi tổ hợp xem cả chế độ **Biểu đồ** lẫn **Bảng**, quét toàn bộ `innerText` + `<title>` trong SVG + thuộc tính `title` + `aria-label` + nhãn trục:

- Không khoá thô, console sạch (0 lỗi).
- Nhãn trục `T8/25` → `Aug 25`; tiền `246.830.000 VNĐ` → `246,830,000 VND`; rút gọn `24,9 tr` → `24.9M`; phần trăm `74,5%` → `74.5%`.
- Tooltip SVG: `T8/25 · Chi: 0 VNĐ` → `Aug 25 · Spent: 0 VND`.
- KPI: `so với tháng 6 năm 2026` → `vs. June 2026` (hoa đúng, không phải `june`).
- Thứ trong tuần lấy từ `course.dowShort.*`: `T2…CN` → `Mon…Sun`.
- **Trạng thái rỗng đổi ngôn ngữ tại chỗ**: ép rỗng bằng cách lọc-vào và loại-trừ cùng một loại, `Chưa có dữ liệu trong khoảng thời gian này` → `No data in this date range yet` mà không đụng bộ lọc.
- **Dữ liệu DB nguyên văn ở bản EN** đúng §4.3: `Mẹ mượn`, `Học Phí`, `Đà Lạt`, `Khác`, `For Love` giữ nguyên; chỉ `Chưa phân loại` → `Uncategorised` vì đó là nhãn do code sinh.
- **Dò trùng nhãn nhóm gộp vẫn chạy đúng ở cả hai ngôn ngữ** — và cho kết quả *khác nhau*, đúng như thiết kế: DB có một loại tên thật là `Khác`, nên bản tiếng Việt phải lùi sang `Các loại còn lại`, còn bản tiếng Anh dùng được `Other` vì không đụng ai. Nhìn thoáng qua dễ tưởng là lỗi.

### Kết quả verify `visitor-log` (2026-07-22)

Chạy trên máy dev (`ng serve` + backend `--urls https://localhost:44391` trỏ MySQL local), lái bằng skill `chrome-playwright` với profile `raspberry-pi-local`. **8 tổ hợp**: 4 tab × {vi, en} × {light, dark}. Đạt hết:

- Không có khoá i18n nào hiện thô, không có chữ tiếng Việt nào lọt sang bản EN (kiểm bằng regex trên `innerText`, không phải nhìn bằng mắt).
- **Đổi ngôn ngữ tại chỗ đúng ở cả 4 tab** — kể cả `message` đang hiện: bấm "Thêm IP" với ô IP rỗng ra `Nhập địa chỉ IP trước đã.`, đổi sang EN thì **cùng dòng đó** thành `Enter an IP address first.` Đây là bằng chứng chạy thật cho §4.1 (`known-ip-list` lưu `messageKey`, không lưu chuỗi đã dịch).
- **Ba hộp thoại** đổi ngôn ngữ đúng, kể cả giá trị mớm sẵn: `Đặt tên cho IP 45.66.77.88 (ví dụ: Nhà, Điện thoại 4G):` / `Name this IP 45.66.77.88 (e.g. Home, 4G phone):`, mặc định `Của tôi` / `Mine` — đúng lập luận "dịch lúc ghi vào, nguyên văn lúc đọc ra".
- **Tooltip `<title>` của cột SVG**: `14/7: 2 lượt xem / 2 khách` → `14/7: 2 views / 2 visitors`.
- **Dữ liệu DB hiện nguyên văn ở bản EN** như §4.3 yêu cầu: nhãn `auto: login phong 2026-07-16`, `May dev`, `(direct)`, `www.google.com`, `Chrome 120` giữ nguyên.
- Attribution tách đôi đúng: `Dữ liệu vị trí:` / `Location data:` đổi theo ngôn ngữ, `IP Geolocation by DB-IP` giữ nguyên cả hai bản.

Hai chỗ **cố ý không dịch**, đã xác nhận là đúng chứ không phải sót:
- Badge `bot` viết cứng trong template — thuộc nhóm định danh kỹ thuật được miễn (`CLAUDE.md`).
- `eventLoginFail` có khoá trong cả `vi.ts` lẫn `en.ts` nhưng **cùng giá trị `'Login FAIL'`** — vẫn đi qua tầng dịch, chỉ là bản dịch trùng nhau. Đừng "sửa" thành tiếng Việt.

Một quan sát, **không phải lỗi**: `visit-trend-chart.formatDate()` tự ghép `${d.getDate()}/${d.getMonth()+1}` nên nhãn trục X luôn là ngày-trước-tháng (`14/7`) ở cả hai ngôn ngữ. Nhất quán với toàn bộ phần còn lại của app (mọi `date` pipe đều truyền mẫu tường minh `dd/MM/yyyy`), nên sửa riêng mỗi cái chart mới là làm lệch. Ghi lại để lần sau không tưởng là bỏ sót §4.2.

### `zalo`: mẫu `r.message || 'dự phòng'` cần một helper, không phải copy-paste

Mọi thông báo của `zalo-page` đều có dạng:

```ts
this.loginMessage = r.message || 'Quét mã QR bằng ứng dụng Zalo trên điện thoại.';
```

Tức là **cùng một biến giữ hai loại chuỗi khác hẳn nhau về bản chất**: `r.message` là dữ liệu backend (giữ nguyên văn, §4.3), chuỗi còn lại là nhãn client (phải dịch, §4.1). Mẫu này lặp 6 lần.

Chép tay cặp `…Key` / `…Raw` sáu lần thì sớm muộn cũng có chỗ quên xoá nguồn kia, và **hai chuỗi cùng tồn tại** → template hiện nhầm cái cũ. Nên gom vào một helper cho mỗi luồng:

```ts
private setLoginMessage(key: string, raw?: string | null): void {
  if (raw) { this.loginMessageRaw = raw; this.loginMessageKey = null; }
  else     { this.loginMessageKey = key; this.loginMessageRaw = null; }
}
```

Bất biến cần giữ: **không bao giờ để cả hai cùng khác null**. Helper đảm bảo điều đó ở một chỗ duy nhất.

Cũng nhân dịp này: `sendResultText()` trả chuỗi nay đổi thành `applySendResult()` **gán** thẳng — vì kết quả không còn là một chuỗi mà là một cặp (key hoặc raw), không trả về bằng một giá trị được nữa.

**`ZaloContact.label` giữ nguyên văn**: đó là cấu hình phía server, không phải nhãn viết trong code.

### `visitor-log`: bốn tình huống mới

**1. Chuỗi có `<strong>` bọc con số thì ĐỪNG gộp vào một khoá có tham số.**
Bản gốc là `<strong>{{ result.totalCount }}</strong> lượt truy cập`. Gộp thành `'{{count}} lượt truy cập'` thì dịch đúng nhưng **mất luôn thẻ `<strong>`** — con số hết đậm, và đó là một thay đổi giao diện âm thầm chứ không phải i18n. Nên khoá chỉ giữ **danh từ** (`visitCountLabel: 'lượt truy cập'`), con số nằm ngoài:

```html
<strong>{{ result.totalCount }}</strong> {{ 'visitor.visitCountLabel' | translate }}
```

Cách này dựa trên việc **cả vi lẫn en đều đặt số trước danh từ**. Với ngôn ngữ đảo trật tự thì phải quay lại khoá có tham số và chấp nhận dùng `innerHTML`. Ghi lại để lần sau không tưởng là làm ẩu.

**2. Dịch giá trị mặc định sẽ được LƯU vào DB — vẫn đúng, không phạm §4.3.**
`window.prompt(..., 'Cua toi')` và `markAsMine(ip, undefined, 'Cua toi')` mớm sẵn một cái tên rồi **ghi xuống DB**. Thoạt nhìn giống chỗ cấm dịch, nhưng khác hẳn:

> Dịch ở đây chỉ đổi **thứ được đề xuất**. Sau khi lưu, nó là dữ liệu người dùng và luôn hiển thị **nguyên văn**.

Không dịch mới là sai — người dùng giao diện tiếng Anh bị mớm một cái tên tiếng Việt. Ranh giới của §4.3 là *lúc đọc ra*, không phải *lúc ghi vào*.

**3. Tiêu đề truyền qua `@Input` phải dịch ở chỗ gọi.**
`visit-trend-chart` nhận `@Input() title: string`. Hai lựa chọn: truyền khoá xuống rồi để con tự dịch, hoặc dịch ngay tại chỗ gọi. Chọn cái sau — `[title]="'visitor.chartViewsByDay' | translate"` — vì pipe vẫn tự chạy lại khi đổi ngôn ngữ, mà component con **không phải biết `TranslateService` là gì** chỉ vì một dòng tiêu đề. Component vẽ chart giữ được tính thuần, giống cách đã làm với `lunar-calendar.ts`.

**4. Attribution DB-IP tách làm hai phần.**
`Dữ liệu vị trí: IP Geolocation by DB-IP` — vế trái là nhãn (dịch), vế phải là **tên bắt buộc theo giấy phép CC-BY** (giữ nguyên văn ở cả hai ngôn ngữ). Đã ghi chú thẳng trong template để không ai "dịch nốt cho đều".

**Lỗi cũ gặp lại lần thứ ba:** ba hộp thoại `window.prompt` / `window.confirm` ở đây đều viết tiếng Việt **không dấu** (`Dat ten cho IP`, `Xoa danh dau cho`, `Cua toi`) — y hệt `semester-metadata` và `system-configuration`. Chuyển sang khoá i18n là tiện thể sửa luôn. Xem ra chỗ nào lập trình viên gõ vội trong hàm JS thuần thì chỗ đó mất dấu; template thì không bị.

### Bẫy khi verify: profile Chrome nhớ ngôn ngữ của lần chạy trước

`LanguageService` lưu lựa chọn vào `localStorage['web-language']`, mà skill `chrome-playwright` dùng **profile bền** — nên phiên verify sau mở ra đã ở ngôn ngữ của phiên trước, không phải mặc định.

Hậu quả rất dễ mắc: tưởng đang xem bản tiếng Việt trong khi thực tế là tiếng Anh, rồi kết luận nhầm. Đã xảy ra một lần thật khi verify `system-info-tab`.

**Cách tránh:** đặt thẳng `localStorage['web-language']` trước khi load trang, đừng dựa vào trạng thái mặc định của profile. Đây cũng là lý do nên luôn yêu cầu agent verify **trích nguyên văn chuỗi đọc được** thay vì báo "đã dịch đúng" — chuỗi nguyên văn thì lộ ngay nhầm lẫn kiểu này, còn kết luận thì không.

### `toFixed()` là một biến thể khác của bug hardcode locale

Trong `jobs-page.formatDuration()`:

```ts
if (seconds < 60) return `${seconds.toFixed(1)} giây`;   // → "1.5 giây"
```

`toFixed()` **luôn** dùng dấu chấm thập phân, bất kể locale. Nên bản tiếng Việt trước khi chuyển đã sai sẵn: đúng phải là `1,5 giây`. Sửa bằng `toLocaleString(this.locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })`.

**Đây là loại bug §4.2 mà grep tìm `'vi-VN'` KHÔNG bắt được** — không có chuỗi locale nào để tìm, chỉ có một hàm âm thầm giả định locale Mỹ. Khi rà một feature, tìm cả `toFixed(`, `toPrecision(`, và phép nối chuỗi với số, chứ không chỉ tìm `'vi-VN'`.

Cùng ý đó: đơn vị `ms` không có key. Ký hiệu quốc tế thì để nguyên, giống `GiB` / `GB` / `°C` bên `system-info-tab`.

**Trạng thái lạ thì trả về nguyên văn.** `statusLabel()` dịch 5 trạng thái Hangfire đã biết, `default` trả chính chuỗi backend gửi. Đó là dữ liệu ngoài tầm kiểm soát của client — bịa nhãn cho nó là sai (§4.3).

### Ngược lại: `toFixed()` trong path SVG là ĐÚNG, đừng "sửa"

Mục trên nói `toFixed()` là bug. Có đúng một chỗ nó **bắt buộc phải giữ** — `cumulative-month-chart.component.ts`:

```ts
return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
```

Đây không phải chuỗi cho người đọc mà là **toạ độ trong thuộc tính `d` của `<path>`**. Cú pháp SVG quy định dấu thập phân là **dấu chấm**, và dấu phẩy là ký tự **ngăn cách toạ độ**. Đổi sang `toLocaleString(locale())` thì bản tiếng Việt sinh ra `M12,50,34,20` — trình duyệt đọc thành bốn số thay vì hai, biểu đồ vỡ hoặc biến mất.

**Quy tắc phân biệt:** hỏi *chuỗi này ai đọc?* Người đọc → theo locale. Máy đọc (SVG path, `d`, `transform`, `viewBox`, URL, JSON, khoá so sánh) → luôn dấu chấm, `toFixed` là đúng. Khi làm `expense-analytics` sẽ gặp nhiều `toFixed` trong code vẽ chart — **mặc định là giữ nguyên**, chỉ đổi những cái chảy ra text hiển thị.

### `KHONG_PHAN_LOAI`: vừa là nhãn phải dịch, vừa là sentinel so sánh

`model/expense-analytics.model.ts` có:

```ts
export const KHONG_PHAN_LOAI = 'Chưa phân loại';
```

Khác `NGHỈ` ở chỗ đây **là chuỗi lập trình viên tự viết**, không đến từ DB — nên theo §4.3 nó **phải được dịch**. Nhưng `expense-analytics.transform.ts` dùng nó theo hai vai cùng lúc:

```ts
reasonName: r.reasonType?.reasonName || KHONG_PHAN_LOAI     // dòng 134 — làm KHOÁ gom nhóm
...
isMuted: label === KHONG_PHAN_LOAI                           // dòng 307 — làm SENTINEL so sánh
```

Cách sửa ngây thơ — thay hằng bằng `translate.instant('...')` — hỏng theo hai đường: nhãn đông cứng ở ngôn ngữ lúc transform chạy (§4.1), **và** khi đổi ngôn ngữ giữa chừng thì nhóm đã gom bằng chuỗi tiếng Việt còn phép so sánh ở dòng 307 lại dùng chuỗi tiếng Anh → `isMuted` im lặng thành `false`, nhóm "chưa phân loại" mất kiểu hiển thị mờ.

**Hướng đi:** giữ hằng làm khoá nội bộ (không hiển thị, tốt nhất đổi thành một sentinel trung tính kiểu `'__uncategorized__'`), rồi **dịch ở chỗ render** bằng cách kiểm tra khoá đó. Nghĩa là `transform.ts` không cần biết `TranslateService` là gì — cùng nguyên tắc đã áp cho `lunar-calendar.ts`.

### `course-schedule`: khi nào dùng `Intl`, khi nào dùng từ điển

Đây là feature đầu tiên phải dịch **tên thứ và tên tháng**, tức là thứ mà trình duyệt đã biết sẵn qua `Intl`. Không có một câu trả lời đúng cho cả hai, và lý do phân đôi là **không gian hiển thị**:

| Chỗ | Cách làm | Vì sao |
|---|---|---|
| Tiêu đề tháng (`monthYearLabel`) | `toLocaleDateString(locale(), { month: 'long', year: 'numeric' })` | Chỗ này rộng. Chép 12 tên tháng × 2 ngôn ngữ vào từ điển chỉ để dịch lại thứ `Intl` đã có là thừa |
| Tiêu đề **cột** lịch (7 thứ) | Từ điển, `course.dowShort.*` | Cột lịch rất hẹp. `Intl` cho ra `"Th 2"` — dài hơn `"T2"` hiện tại và sẽ xuống dòng. Từ điển cho quyền kiểm soát chính xác |
| Tên thứ đầy đủ (bảng, dropdown) | Từ điển, `course.dowLong.*` | Cùng lý do nhất quán với trên; và dropdown cần khớp giá trị `dayOfWeek` của backend |

`vi-VN` trả tên tháng viết **thường** (`tháng 7 năm 2026`) nên phải viết hoa chữ đầu để hợp vai trò tiêu đề; tiếng Anh vốn đã hoa sẵn.

**Quy ước thứ của app khác `Date.getDay()`**: 2 = Thứ 2 … 8 = Chủ nhật, theo portal UEH và backend lưu y như vậy. Ba component cùng cần đổi số này ra nhãn nên gom vào `utils/day-of-week.ts` (`dowKey`, `dowTranslationKey`, `WEEK_DOW_KEYS`) — để tên khoá không lệch giữa chúng.

**Hàm util thuần không được gọi `TranslateService`.** `formatLunarDateVN` / `formatLunarDateShort` chỉ có đúng một chữ cần dịch là tiền tố tháng nhuận (`Nhuận` / `N`), nên nhãn đó được **truyền vào** dưới dạng tham số có giá trị mặc định tiếng Việt. Util giữ nguyên tính thuần, chỗ gọi cũ không đổi hành vi. Ngày/tháng âm là số nên không đụng tới.

**`common.currencyShort`** (`đ` / `₫`) tách riêng khỏi `common.currencySuffix` (`VNĐ` / `VND`): ô lịch tháng quá hẹp cho `VNĐ`. Bản tiếng Anh dùng ký hiệu tiền tệ `₫` chứ không phải chữ cái `đ` — cùng độ hẹp, đúng chuẩn quốc tế.

**Một sửa tiện thể:** `dayOfWeekLabel` cũ trong `course-schedule-list` trả `'Thứ 2'`…`'Thứ 7'` nhưng lại rút gọn Chủ nhật thành `'CN'` — lệch ngay trong cùng một cột. Nay thống nhất dùng `dowLong` cho cả bảy.

**Cạm bẫy đã tránh:** `learningMode` (`ONLINE`, `LMS`, `NGHỈ`, `TẬP TRUNG`) đến từ portal UEH nên **không dịch** (§4.3), và riêng `NGHỈ` còn là sentinel so sánh trong `utils/learning-mode.ts` — dịch nó sẽ làm hỏng việc nhận diện buổi nghỉ. File đó không cần đụng tới chút nào. Verify bằng trình duyệt thật đã xác nhận: ở chế độ English, buổi `NGHỈ` vẫn hiển thị đúng kiểu gạch ngang/mờ, tức sentinel còn nguyên.

Lo ngại tràn dòng của tiêu đề cột tiếng Anh **đã kiểm tra và không xảy ra**: `MON…SUN` và `+4 more` vừa khít lưới lịch tháng. Tiêu đề tháng cho ra `Tháng 7 năm 2026` / `July 2026`, và ô ngày dạng `EEEE` cho `Thứ Tư, 22/07/2026` / `Wednesday, 22/07/2026`.

**Modal chặn việc đổi ngôn ngữ giữa chừng** — không phải lỗi, nhưng cần biết khi verify: backdrop của `MatDialog` chặn click lên thanh tiêu đề, nên không thể bấm nút đổi ngôn ngữ khi dialog đang mở (click ra ngoài là đóng dialog — hành vi chuẩn của Angular Material). Muốn kiểm tra thông báo trong dialog có dịch lại hay không thì phải: đóng dialog → đổi ngôn ngữ → mở lại → kích hoạt lại thông báo.

### Nút đổi ngôn ngữ và theme nằm trên thanh tiêu đề

Theo yêu cầu UX của chủ repo: cả hai nút đặt ở **góc phải trên** (`main-tab`), cạnh nút Đăng xuất — thay vì phải vào Cài đặt → Giao diện mới đổi được.

Kéo theo một thay đổi kiến trúc bắt buộc: `ThemeService` trước đây **không giữ state** (chỉ gắn class lên `body`), còn `theme-settings` tự giữ bản sao riêng. Có hai nơi cùng bật/tắt thì mô hình đó lệch ngay. Nay:

- `ThemeService` sở hữu `webDarkMode` + `mobileDarkMode` dạng **signal**; `main-tab` và `theme-settings` đều chỉ *đọc*, không giữ bản sao.
- Đổi theme **áp giao diện trước, gọi API sau** — người dùng thấy phản hồi tức thì. Vì vậy đã bỏ chỉ báo "Đang lưu…" (và key `theme.saving`): chính cái toggle là phản hồi rồi.
- `UpdateThemeSetting` nhận cả hai cờ, nên `saveField()` chỉ ghi đè đúng cờ đang đổi. Nếu chưa từng đọc được setting đầy đủ, nó **đọc lại trước khi ghi** thay vì đoán — nếu không, bật dark mode cho web sẽ vô tình tắt dark mode của mobile.

**Bộ chọn ngôn ngữ nằm ở HAI chỗ, có chủ đích.** Kế hoạch ban đầu ghi là "chuyển" từ thẻ đăng nhập sang `theme-settings`; thực tế giữ cả hai:

- `theme-settings` là **nhà chính thức** — chỗ người dùng tìm đến khi muốn đổi.
- Thẻ đăng nhập **vẫn giữ** bộ chọn, vì `theme-settings` nằm sau đăng nhập. Bỏ đi thì người dùng có trình duyệt tiếng Việt muốn dùng English sẽ kẹt ở màn hình đăng nhập tiếng Việt, không có lối đổi.

Hệ quả: hình dáng nút (`.language-switcher`, `.lang-button`) chuyển từ `login.component.scss` ra **global `styles.scss`** — style scoped của component không chia sẻ được sang nhau. `login.component.scss` chỉ còn phần canh vị trí riêng của nó.

### Mobile (Expo)

**Trạng thái: cố ý tạm dừng (2026-07-23), theo yêu cầu của chủ repo — không phải việc bị bỏ sót.** Web đã đủ ổn định (`Dictionary` không còn đổi cấu trúc kể từ `expense-analytics`) nên có thể bắt đầu mobile bất cứ lúc nào được yêu cầu; mục dưới đây giữ nguyên làm kế hoạch sẵn, chưa có gì thực thi. Đã kiểm tra `Mobile_Raspberry/src/` — chưa có `LanguageContext.tsx`, chưa có thư mục `i18n/`. Toàn bộ 8 screen dưới đây còn nguyên tiếng Việt cứng.

`ngx-translate` là thư viện Angular, **không dùng được cho React Native**. Mobile dùng cơ chế riêng nhưng **cùng ý tưởng và cùng cấu trúc key**:

- Tạo `Mobile_Raspberry/src/LanguageContext.tsx` — mirror đúng `ThemeContext.tsx`: Provider + `useLanguage()` trả `{ lang, dict, setLang }`, với `dict` là object đã typed.
- Lưu preference bằng `AsyncStorage` (bản web dùng `localStorage`).
- Bản dịch để trong `Mobile_Raspberry/src/i18n/` với **cùng cấu trúc key** như web, để đối chiếu được bằng mắt.

| # | Screen | ~Dòng |
|---|---|---|
| 1 | `LoginScreen` | 33 |
| 2 | `SettingsScreen` | ~20 |
| 3 | `ExpenseListScreen` + `ExpenseFormModal` | 67 |
| 4 | `ReasonTypeScreen` + `FilterReasonType` | ~25 |
| 5 | `CourseScheduleScreen` + `CourseWeek/MonthCalendar` | 57 |
| 6 | `NotificationMonitorScreen` + `NotificationFilterScreen` | 56 |
| 7 | `SpeechToTextScreen` | 22 |
| 8 | `SystemInfoScreen` | ~15 |

Mobile dùng `Alert.alert(...)` khá nhiều — đây là chỗ tương đương `window.confirm` bên web, phải dịch tại chỗ gọi.

---

## 7. Gap đã biết — có chủ đích, không phải sót

Ghi lại để không ai tưởng là bug:

### 7.1. Backend vẫn trả tiếng Việt
`API_Raspberry/API_Raspberry/Service/PasswordResetService.cs` (~dòng 90-174) trả message tiếng Việt sẵn; dòng 116 và 200-209 là subject + body HTML của email OTP. Nên **luồng quên mật khẩu vẫn hiện tiếng Việt kể cả khi UI đang để English**.

Hướng xử lý khi làm tới (ngoài phạm vi đợt này): cho API trả **mã lỗi ổn định** để frontend dịch, thay vì dựng `IStringLocalizer`/resx ở backend — không đáng cho một API một người dùng, không có consumer bên thứ ba.

Riêng **email** thì bắt buộc backend phải biết ngôn ngữ (email không đi qua frontend). Rẻ nhất: đọc key `LANG_WEB` từ bảng `SystemConfiguration` (mục 7.2).

### 7.2. Preference không đồng bộ giữa thiết bị
Hiện chỉ nằm ở `localStorage['web-language']`. Muốn đồng bộ: thêm key `LANG_WEB` / `LANG_MOBILE` vào bảng key-value `SystemConfiguration` sẵn có — **không cần migration mới**, đúng cách `THEME_WEB_DARK` đang làm. Toàn bộ chỗ đọc/ghi nằm gọn trong `LanguageService`, nên đổi sau không phải sửa component nào.

### 7.3. Dữ liệu DB không dịch — đã chuyển thành quy tắc, xem mục 4.3
Trước đây ghi ở đây như một hạn chế. **Không phải hạn chế — là phạm vi do chủ repo chốt.** Đã nâng lên mục 4.3 thành pattern bắt buộc, kèm bảng đầy đủ các trường.

Nói lại cho rõ vì dễ bị "sửa" nhầm: **không thêm bảng translation cho dữ liệu người dùng.** Nếu một session sau đề xuất `ReasonTypeTranslation` hay cột `ReasonNameEn` — đó là đi ngược yêu cầu, không phải cải tiến.

### 7.4. Portfolio đã song ngữ sẵn, cơ chế khác
`Portfolio/` (Next.js) đã có hệ i18n tự viết từ trước: `data/types.ts` (interface `Dictionary`), `data/dictionaries/{en,vi}.ts`, `components/i18n-provider.tsx`, locale nằm trong URL (`/en/`, `/vi/`), static export ra 2 thư mục. **Không gộp chung với Angular** — khác framework, không share code được. Ý tưởng typed dictionary của Angular chính là mượn từ đây.

---

## 8. Định nghĩa "xong" cho mỗi feature

- [ ] Không còn chuỗi tiếng Việt hardcode trong `.html` và `.ts` của feature
- [ ] **Dữ liệu DB vẫn hiển thị nguyên văn** — không đụng vào interpolation dữ liệu, không thêm map dịch cho giá trị của người dùng (mục 4.3)
- [ ] `vi.ts` và `en.ts` đều đủ key (TypeScript pass là bằng chứng)
- [ ] Message client lưu dạng key, không lưu chuỗi đã dịch
- [ ] Pipe ngày/tiền truyền `locale()` tường minh
- [ ] `npx ng build` pass
- [ ] Mở trình duyệt, đổi VI↔EN, kiểm tra **light và dark**

---

## 9. Việc kèm theo khi hoàn tất

1. ✅ `Information_AI/24_feature-i18n-bilingual.md` + đăng ký vào skill `feature-map`.
2. ✅ Sửa `CLAUDE.md` và `.claude/skills/add-feature/SKILL.md` — luật cũ "toàn bộ text là tiếng Việt, không được có tiếng Anh" **mâu thuẫn trực tiếp** với `en.ts`. Không sửa thì session sau sẽ dịch ngược `en.ts` về tiếng Việt vì tưởng là lỗi.
3. ✅ (2026-07-23) Bổ sung `Information_AI/16_feature-theme-settings.md` — mục "Language is a parallel preference, not part of this feature": so sánh nơi lưu (theme qua API+DB, ngôn ngữ chỉ `localStorage`), service tương ứng, và vì sao chưa cần `LANG_WEB` trong `SystemConfiguration`.
