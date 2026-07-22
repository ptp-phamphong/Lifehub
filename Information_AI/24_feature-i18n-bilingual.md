# Feature: Đa ngôn ngữ Việt/Anh (i18n song ngữ) — Angular web

> **Đang chuyển dở.** Các feature chưa chuyển vẫn hardcode tiếng Việt, và toàn bộ app Expo mobile cũng
> vậy. **Danh sách chính xác feature nào đã xong nằm ở bảng §6 của
> `document/plans/i18n-bilingual-migration.md`** — chỗ duy nhất được coi là đúng; đừng liệt kê lại tên
> feature ở đây vì sẽ lệch ngay sau vài lần chuyển tiếp theo.
>
> Tài liệu này mô tả **hạ tầng** i18n đã dựng xong (dùng lại được ngay cho mọi trang khác) và **quy ước**
> phải theo khi dịch thêm trang.

Chuyển ngôn ngữ hiển thị của Angular web (`Front_End_Raspberry`) giữa Tiếng Việt và English tại runtime,
không cần build lại, không cần điều hướng theo domain/locale. Lựa chọn ngôn ngữ lưu ở `localStorage`,
không đồng bộ giữa các thiết bị (xem phần "Việc còn thiếu").

---

## Vì sao chọn `@ngx-translate/core` thay vì `@angular/localize`

`@angular/localize` là giải pháp **compile-time**: mỗi locale cần **một thư mục output build riêng**
cộng với routing theo locale ở phía server. Repo này serve `/app/*` bằng Caddy `handle_path` trỏ thẳng
vào một thư mục static (`/var/www/app`) — thêm locale kiểu đó buộc phải viết lại cả
`Deploy-Frontend` trong `deploy.ps1` (khoảng dòng 137-155) lẫn quy tắc `handle_path /app/*` trong
Caddyfile.

`ngx-translate` đổi ngôn ngữ **tại runtime** với **một bản build duy nhất** → `deploy.ps1` và Caddy
không phải đụng tới. Đánh đổi: không có tree-shaking theo ngôn ngữ như `@angular/localize`, nhưng với
quy mô chuỗi dịch của app này (vài chục KB) thì không đáng kể.

Thư viện: `@ngx-translate/core` v18.0.0 (`Front_End_Raspberry/package.json:25`).

---

## Kiến trúc

### File mới

| File | Vai trò |
|---|---|
| `src/app/i18n/types.ts` | `type Dictionary` (**`type`, không phải `interface`** — xem lý do bên dưới), `LANGUAGES = ['vi', 'en']`, `type Language`, `DEFAULT_LANGUAGE = 'vi'`, `LOCALE_BY_LANGUAGE` (`{vi: 'vi-VN', en: 'en-US'}`), `isLanguage()` type guard |
| `src/app/i18n/dictionaries/vi.ts` | Bản dịch tiếng Việt, thoả `Dictionary` |
| `src/app/i18n/dictionaries/en.ts` | Bản dịch tiếng Anh, thoả `Dictionary` |
| `src/app/i18n/typed-dict.loader.ts` | `TypedDictLoader implements TranslateLoader` — trả về dictionary từ bộ nhớ thay vì fetch JSON qua HTTP |
| `src/app/services/language.service.ts` | `LanguageService` — nguồn sự thật cho ngôn ngữ hiện tại (signal-based), tương đương `ThemeService` nhưng cho ngôn ngữ |

### File sửa

| File | Thay đổi |
|---|---|
| `src/app/app.module.ts` | `provideTranslateService({ loader: provideTranslateLoader(TypedDictLoader), fallbackLang: DEFAULT_LANGUAGE })`; `registerLocaleData(localeVi)` + `registerLocaleData(localeEn)`; thêm `TranslatePipe`, `TranslateDirective` vào `imports` (chúng là standalone, xem phần API v18 bên dưới) |
| `src/app/app.component.ts` | Constructor gọi `languageService.init()` — **không phải `ngOnInit`** |
| `src/app/all-app-component/login/login.component.{ts,html,scss}` | Triển khai tham chiếu: bộ chọn VI/EN + toàn bộ chuỗi hiển thị đổi sang key dịch |

### Tại sao `Dictionary` là `type` chứ không phải `interface`

`interface` trong TypeScript không tự sinh index signature, nên một object thoả `interface` không gán
được cho `TranslationObject` của ngx-translate (kiểu index signature). `type` alias thì gán được. Ghi rõ
trong `src/app/i18n/types.ts:7-9`.

### Vì sao hai dictionary bắt buộc đồng bộ key — đã kiểm chứng

`vi.ts` và `en.ts` đều khai kiểu `Dictionary`, nên **TypeScript tự báo lỗi** nếu một ngôn ngữ thiếu key
mà ngôn ngữ kia có. Đã thử: xoá key `save` khỏi một file ra đúng lỗi

```
error TS2741: Property 'save' is missing in type '...' but required in type 'Dictionary'.
```

Không cần thêm lint rule hay script kiểm tra riêng — compiler làm việc đó.

### Đánh đổi của `TypedDictLoader` (thay vì `TranslateHttpLoader` tải JSON)

Ghi trong `typed-dict.loader.ts:13-20`:

- **Được**: TypeScript bắt lỗi lệch key ngay lúc biên dịch (xem trên); không có HTTP round-trip nên
  không nháy key thô ra màn hình lúc khởi động, và không phải lo `/app/` base-href khi trỏ đường dẫn
  file dịch.
- **Mất**: toàn bộ bản dịch nằm trong bundle chính thay vì tải rời theo ngôn ngữ. Ở quy mô hiện tại
  (vài chục KB text) không đáng kể; nếu bundle phình lên thì đổi sang HTTP loader mà không cần sửa chỗ
  nào khác (chỉ thay `loader` trong `provideTranslateService`).

---

## API `ngx-translate` v18 — khác các bản v14–v16 mà hầu hết bài viết trên mạng mô tả

Xác nhận trực tiếp từ type definition của package đã cài, không phải từ blog:

- **Không còn `TranslateModule`.** Cấu hình chỉ qua provider function: `provideTranslateService`,
  `provideTranslateLoader`.
- `TranslatePipe` và `TranslateDirective` là **standalone** → app dùng `NgModule` (repo này không dùng
  standalone component) phải khai báo chúng trong `imports` của `@NgModule`, không phải `declarations`.
- Tên option là **`fallbackLang`**, không phải `defaultLanguage`.
- `TranslateService.currentLang` là một **`Signal`**; `instant()` và `get()` vẫn còn.

---

## `LanguageService` (`src/app/services/language.service.ts`)

Signal-based, cùng vai trò với `ThemeService` (dark mode) nhưng cho ngôn ngữ — và cũng lưu ở
`localStorage`, không gọi API.

| Thành viên | Ý nghĩa |
|---|---|
| `language` | `Signal<Language>` chỉ đọc — ngôn ngữ đang hiển thị |
| `locale` | `computed()` từ `LOCALE_BY_LANGUAGE[language()]` — dùng làm tham số locale cho pipe |
| `available` | `LANGUAGES` — danh sách ngôn ngữ hỗ trợ, dùng để render bộ chọn |
| `init()` | Gọi **một lần** lúc app khởi động (trong constructor của `AppComponent`), set fallback + áp ngôn ngữ ban đầu |
| `setLanguage(lang)` | Đổi ngôn ngữ, ghi `localStorage['web-language']`, cập nhật `document.documentElement.lang` |

**Thứ tự ưu tiên khi khởi động** (`resolveInitialLanguage()`): lựa chọn đã lưu trong `localStorage` →
ngôn ngữ trình duyệt (`navigator.language`, cắt phần trước dấu `-`) → tiếng Việt (`DEFAULT_LANGUAGE`).

**Vì sao `init()` gọi trong constructor của `AppComponent`, không phải `ngOnInit`**
(`app.component.ts:19-21`): bản dịch phải sẵn sàng **trước lần render đầu tiên**, nếu không màn hình sẽ
nháy ra key thô (`login.title` thay vì "Đăng nhập") trước khi kịp dịch.

---

## Ba quy ước bắt buộc khi thêm chuỗi dịch mới

### 1. Thông báo phát sinh ở client phải lưu dưới dạng KEY, không lưu chuỗi đã dịch

Nếu một component lưu một chuỗi **đã dịch sẵn** vào field rồi hiển thị thẳng, đổi ngôn ngữ trong lúc
chuỗi đó đang hiện trên màn hình sẽ để nó **kẹt lại ở ngôn ngữ cũ** — vì component không tự dịch lại,
chỉ template mới dịch qua `| translate`.

Cách làm đúng, theo mẫu `login.component.ts:20-28`: tách hai loại field.

- `errorKey` / `forgotErrorKey` — **key** dictionary cho lỗi phát sinh ở client (thiếu username/mật
  khẩu, HTTP 401, v.v.), template dịch qua `{{ errorKey | translate }}`.
- `errorRaw` / `forgotErrorRaw` / `forgotInfoRaw` — chuỗi **nguyên văn** lấy thẳng từ response backend
  (backend hiện chỉ trả tiếng Việt — xem phần "Việc còn thiếu"), hiển thị y nguyên vì nó không phải key.

**Đã kiểm chứng trong trình duyệt thật**: một lỗi validation tiếng Anh (`errorKey`) đổi ngay sang tiếng
Việt khi bấm nút chuyển ngôn ngữ, trong khi thông báo hiển thị vẫn đang trên màn hình.

### 2. Ngày/giờ/tiền tệ phải truyền `locale` tường minh cho pipe

`LOCALE_ID` của Angular bị **cố định lúc bootstrap** — đổi ngôn ngữ tại runtime **không** làm `DatePipe`
/ `CurrencyPipe` tự đổi theo. Phải truyền tham số locale tường minh, lấy từ `LanguageService.locale()`:

```html
{{ amount | currency:'VND':'symbol':'1.0-0':locale() }}
{{ someDate | date:'short':undefined:locale() }}
```

Lưu ý VND dùng **0 chữ số thập phân** (`'1.0-0'`), khác USD (2 chữ số). `app.module.ts` đăng ký sẵn cả
hai locale data (`registerLocaleData(localeVi)` + `registerLocaleData(localeEn)`) ngay từ đầu — vì
không biết trước lúc build sẽ cần locale nào.

### 3. CHỈ dịch label — dữ liệu trong DB hiển thị nguyên văn

**Phạm vi do chủ repo chốt, không phải hạn chế kỹ thuật và không phải việc còn nợ.**

Ranh giới: chuỗi **lập trình viên gõ trong code** thì dịch; chuỗi **đi từ DB ra** thì hiển thị nguyên
văn. Trong template: `{{ 'expense.category' | translate }}` → dịch; `{{ row.reasonName }}` → để yên.

Áp dụng cho `ReasonType.ReasonName` (loại chi tên `Vũng Tàu` vẫn là `Vũng Tàu` ở chế độ English), ghi
chú thu/chi, tên môn + `Room` + `Lecturer` + `learningMode` từ portal UEH, tên học kỳ, tên/username
người dùng, key và value trong `SystemConfiguration`, nội dung thông báo điện thoại, và
city/country/browser/OS của khách truy cập (nguồn DB-IP + user-agent).

**Không thêm bảng translation hay cột `…En` cho dữ liệu người dùng** — đề xuất như vậy là đi ngược yêu
cầu, không phải cải tiến.

Hai hệ quả **bình thường**, đừng "sửa":

- Màn hình English **trộn hai ngôn ngữ**. Biểu đồ theo danh mục hiện `Vũng Tàu`, `Ăn uống` cạnh nhãn
  tổng hợp `Other` — vì `Other`/`Uncategorized` là nhãn code sinh ra nên có dịch, còn tên danh mục là
  dữ liệu nên không.
- `src/app/utils/learning-mode.ts` **không cần đụng tới**: `learningModeLabel()` trả thẳng giá trị DB
  (`ONLINE`, `LMS`, `NGHỈ`). Thêm nữa, `NGHỈ` được so sánh làm sentinel trong `isCancelledSession()` —
  dịch nó sẽ làm hỏng việc nhận diện buổi nghỉ.

Bảng đầy đủ từng trường: §4.3 của `document/plans/i18n-bilingual-migration.md`.

---

## Angular Web Frontend — triển khai tham chiếu (`login`)

`login` là bản mẫu **đầu tiên**, dựng hạ tầng. Các feature dịch sau này gặp thêm vài pattern mà `login`
không có — không lặp lại chi tiết ở đây, chỉ trỏ tới nơi đã ghi:
`document/plans/i18n-bilingual-migration.md` có mục riêng cho từng ca, ví dụ chuỗi nằm **trong SVG**
(không có pipe nào chạy lại, phải tự dựng lại view-model khi đổi ngôn ngữ — xem `expense-analytics`),
sentinel so sánh bị lẫn với nhãn hiển thị (`KHONG_PHAN_LOAI`/`NGHỈ`), số nhiều tiếng Anh không có luật
trong ngx-translate, và `toFixed()` nào phải giữ nguyên vì là toạ độ SVG chứ không phải chữ hiển thị.

- Component: `src/app/all-app-component/login/login.component.ts`
- Template: `src/app/all-app-component/login/login.component.html`
- Style: `src/app/all-app-component/login/login.component.scss`

Bộ chọn ngôn ngữ (`.language-switcher` / `.lang-button`, `login.component.html:4-15`) hiện hai nút
`VI` / `EN` (viết hoa qua pipe `| uppercase`, không phải hai key dịch riêng), nút đang active có class
`.active`. Style hoàn toàn qua token `var(--color-*)` (`var(--color-border)`, `var(--color-text-muted)`,
`var(--font-ui)`...) nên hoạt động đúng ở cả light/dark mode mà không cần khối CSS riêng cho dark theme.

`Dictionary.login` (`src/app/i18n/types.ts:34-78`) chia ba nhóm khớp ba `mode` của component
(`login` | `forgot-request` | `forgot-reset`): `login.*` cho form đăng nhập, `login.forgot.*` cho bước
nhập username xin OTP, `login.reset.*` cho bước nhập OTP + mật khẩu mới. `login.reset.subtitle` có tham
số `{{email}}`, truyền qua cú pháp `| translate:{ email: ... }`.

`common.*` (`save`, `cancel`, `delete`, `edit`, `add`, `close`, `confirm`, `loading`, `search`,
`actions`, `yes`, `no`, `connectionError`) là các chuỗi dùng chung, chuẩn bị sẵn cho khi các trang khác
được dịch — trang `login` hiện chỉ dùng `common.connectionError`.

---

## Ghi chú vận hành / việc còn thiếu

- **Angular web coi như xong** — xem dòng trạng thái đầu `document/plans/i18n-bilingual-migration.md`
  và bảng §6 ở đó để biết chính xác đơn vị nào đã dịch/đã verify (chỗ duy nhất được coi là đúng, không
  liệt kê lại ở đây để khỏi lệch). Còn Expo mobile: **cố ý tạm dừng theo yêu cầu của chủ repo**
  (2026-07-23), chưa dựng hạ tầng (`LanguageContext.tsx`, thư mục `i18n/`) — không phải việc bị bỏ sót.
  Dịch thêm trang/màn hình nào thì thêm key vào `Dictionary` (đồng thời cả `vi.ts` và `en.ts` — thiếu bên
  nào TypeScript báo ngay) và đổi chuỗi tĩnh trong template sang `| translate`.
- **Lựa chọn ngôn ngữ chỉ sống trong `localStorage`**, không theo người dùng qua thiết bị khác. Cách sửa
  không cần migration: thêm key `LANG_WEB` vào bảng `SystemConfiguration` sẵn có (đúng cách
  `THEME_WEB_DARK` đang làm cho dark mode — xem `Information_AI/16_feature-theme-settings.md`); toàn bộ
  chỗ đọc/ghi ngôn ngữ đã gói gọn trong `LanguageService`, không phải sửa component nào khác.
- **Backend vẫn trả tiếng Việt cho luồng quên mật khẩu.** `API_Raspberry/API_Raspberry/Service/PasswordResetService.cs`
  trả message tiếng Việt viết cứng cho mọi trường hợp (khoảng dòng 90-175, ví dụ `"Tên đăng nhập hoặc mật
  khẩu không đúng"`, `"Mã OTP đã hết hạn..."`), và email OTP (chủ đề dòng 116, HTML body
  `BuildOtpEmail` dòng 196-211) cũng chỉ có bản tiếng Việt. Kết quả: đổi UI sang English, luồng quên mật
  khẩu vẫn hiện tiếng Việt — vì các field `*Raw` trong `login.component.ts` hiển thị nguyên văn response
  backend (đúng theo quy ước §1 ở trên, không phải bug). Hướng sửa đúng: backend trả **mã lỗi ổn định**
  (error code) thay vì câu chữ, để frontend tự dịch qua `Dictionary` — không phải đứng `IStringLocalizer`
  /`.resx` trên backend.
- **Dữ liệu DB không dịch — đó là quy ước bắt buộc số 3 ở trên, không phải việc còn thiếu.** Ghi ở đây
  chỉ để ai đọc lướt mục này không hiểu nhầm là còn nợ.

---

## Kiểm chứng

- `cd Front_End_Raspberry && npx ng build` — cổng kiểm bắt buộc của repo.
- Xoá thử một key khỏi `en.ts` hoặc `vi.ts` → build phải fail với `TS2741` (xác nhận đồng bộ key vẫn
  hoạt động sau khi sửa dictionary).
- Mở `/app/login`, bấm nút EN/VI: tiêu đề, nhãn, placeholder, nút phải đổi ngay không cần reload; nếu
  đang hiện lỗi validation client-side (chưa nhập username/mật khẩu, hoặc 401) thì lỗi đó cũng phải đổi
  ngôn ngữ theo, không kẹt ở ngôn ngữ cũ.
- Dark mode: bật/tắt ở Cài đặt → Theme trong khi đang ở `/app/login`, bộ chọn ngôn ngữ vẫn phải đọc được
  rõ ở cả hai theme (không có hex cứng trong `.language-switcher`/`.lang-button`).

## Keywords

i18n, đa ngôn ngữ, ngôn ngữ, song ngữ, bilingual, language, translate, dịch, tiếng Anh, English, locale,
ngx-translate, i18next, TranslatePipe, TranslateDirective, LanguageService, Dictionary
