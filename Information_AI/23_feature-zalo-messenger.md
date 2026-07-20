# Feature: Gửi tin nhắn Zalo qua Playwright

> **Trạng thái: code đã viết xong, build sạch — CHƯA test với tài khoản Zalo thật, CHƯA deploy/setup trên Pi.**
> Backend `dotnet build` và Angular production build đều pass, nhưng tính năng chưa chạy end-to-end lần
> nào. Còn thiếu trước khi dùng thật:
> 1. POC Playwright headful + Xvfb trên Pi (headless CLI đã đo là **treo** khi tải trang mạng thật trên Pi này).
> 2. Chỉnh lại các CSS selector Zalo Web trong `appsettings.json` — giá trị mặc định hiện tại chỉ là phỏng đoán.
> 3. Cài Xvfb, thêm `Environment=DISPLAY=:99` vào systemd unit backend, `chmod +x` cho Playwright driver sau publish.
>
> Chi tiết đầy đủ của 3 việc trên nằm ở `document/plan-zalo-messenger.md` (bản plan gốc feature này bám theo).
> Tài liệu này mô tả **cái đã code**, không phải plan.

Nút trên Angular gọi API backend, API dùng **Playwright điều khiển Chromium hệ thống** trên Pi để mở
Zalo Web, tự động chọn người nhận từ danh sách định sẵn, gõ nội dung và bấm gửi — như một người dùng
thật thao tác trình duyệt. Đăng nhập một lần bằng quét mã QR, phiên lưu trên đĩa nên các lần sau không
phải quét lại.

> Không có bảng DB nào cho tính năng này — không Repository/EF/Migration, chỉ có Service + Controller +
> DTO (khác chuỗi layer chuẩn Controller → Service → Repository → Mapper → EF Core vì không cần lưu trữ).

---

## Vì sao thiết kế như vậy — 2 phát hiện quan trọng

1. **Headless Chromium bị treo khi tải trang mạng thật trên Pi** (đo trực tiếp trước khi code, xem
   `document/plan-zalo-messenger.md` §3). `chromium --headless=new --dump-dom https://example.com` treo
   tới timeout dù `curl` cùng URL trả 200 tức thì. → Bắt buộc chạy **headful dưới Xvfb** (`Headless: false`
   trong config), điều khiển qua Playwright/CDP chứ không phải CLI một-phát.
2. **Zalo Web chỉ cho một phiên web trên một tài khoản.** Mở phiên thứ hai sẽ đá phiên đang dùng. Vì vậy
   `ZaloSessionManager` là **singleton** và nối tiếp mọi thao tác bằng `SemaphoreSlim(1,1)` — không bao giờ
   có 2 thao tác browser chạy song song.

Cả hai điểm trên đồng thời phục vụ mục tiêu **giảm rủi ro khoá tài khoản** (ưu tiên số 1 của chủ dự án):
headful giống người dùng thật hơn headless; một phiên duy nhất tránh việc Zalo nghi ngờ đăng nhập từ
nhiều nơi.

---

## Backend

### File mới

| File | Vai trò |
|---|---|
| `Service/Zalo/ZaloOptions.cs` | Options bind từ section `Zalo` trong `appsettings.json`: `ExecutablePath`, `UserDataDir`, `Headless`, `MinSecondsBetweenSends`, `QrTimeoutSeconds`, `Contacts` (danh sách người nhận), `Selectors` (CSS selector Zalo Web) |
| `Service/Zalo/IZaloSessionManager.cs` | Interface: `GetStatus`, `GetContacts`, `StartLoginAsync`, `GetLoginStatusAsync`, `SendAsync`, `CloseAsync` |
| `Service/Zalo/ZaloSessionManager.cs` | Implementation — singleton, dùng `Microsoft.Playwright` để lái Chromium |
| `Dto/Zalo/ZaloDtos.cs` | `ZaloContactDto`, `ZaloStatusDto`, `ZaloLoginResultDto`, `ZaloSendRequest`, `ZaloSendResultDto` |
| `Controllers/ZaloController.cs` | 5 route trần, không `[Authorize]` riêng (dựa global JWT `FallbackPolicy`) |

### File đã sửa

| File | Thay đổi |
|---|---|
| `Program.cs` | `builder.Services.Configure<ZaloOptions>(builder.Configuration.GetSection("Zalo"))` + `builder.Services.AddSingleton<IZaloSessionManager, ZaloSessionManager>()` (`Program.cs:228-229`) |
| `API_Raspberry.csproj` | Thêm `Microsoft.Playwright` 1.49.0 (`API_Raspberry.csproj:25`) |
| `appsettings.json` | Thêm section `Zalo` (`appsettings.json:46-62`) |

### Endpoint (`ZaloController.cs`)

Route trần, không `/api` — Caddy strip tiền tố trước khi proxy tới backend.

| Method | Route | Body/Query | Trả về |
|---|---|---|---|
| GET | `/Zalo/Status` | — | `ZaloStatusDto` — `enabled`, `loggedIn` (lần biết gần nhất), `browserOpen` |
| GET | `/Zalo/Contacts` | — | `List<ZaloContactDto>` — `{id, label}` cho dropdown, không lộ `SearchTerm`/`MatchText` |
| POST | `/Zalo/Login/Start` | — | `ZaloLoginResultDto` — mở Chromium, tới `chat.zalo.me`; nếu phiên trên đĩa còn hiệu lực trả `already_logged_in`, ngược lại trả ảnh QR (`qrImageBase64`, data URI) |
| GET | `/Zalo/Login/Status` | — | `ZaloLoginResultDto` — Angular poll khi đang chờ quét, trả `logged_in` khi xong hoặc QR mới nếu Zalo tự làm mới mã |
| POST | `/Zalo/Send` | `{ contactId, message }` (`ZaloSendRequest`) | `ZaloSendResultDto` (kèm `screenshotBase64` — ảnh chụp khung hội thoại sau khi gửi để xác nhận đúng người); `400` nếu thiếu `message` |

`Status` của `ZaloLoginResultDto`: `awaiting_qr` \| `logged_in` \| `already_logged_in` \| `logged_out` \|
`expired` \| `disabled` \| `error`. `Status` của `ZaloSendResultDto`: `sent` \| `need_login` \|
`rate_limited` \| `contact_not_found` \| `disabled` \| `error`.

### `ZaloSessionManager` — vòng đời "reset hết sau mỗi lần dùng"

Theo yêu cầu chủ dự án — **không** giữ Chromium thường trú:

- Mỗi thao tác (đăng nhập hoặc gửi) mở lại `LaunchPersistentContextAsync(UserDataDir, …)`
  (`ZaloSessionManager.cs:207-235`). Xong việc gọi `CloseInternalAsync()`
  (`ZaloSessionManager.cs:302-321`) — đóng cả `IBrowserContext` **và** `Dispose()` đối tượng
  `IPlaywright`, tức là cả tiến trình Chromium lẫn tiến trình Playwright-driver (node) thoát sạch. Lúc
  rảnh tính năng này chiếm **0 MB RAM**.
- **Đóng ≠ đăng xuất**: phiên Zalo (cookie/localStorage) nằm trong thư mục `UserDataDir` trên đĩa —
  `LaunchPersistentContextAsync` lần sau đọc lại, vẫn đăng nhập, không phải quét QR lại.
  `SendAsync` luôn đóng context ở khối `finally` (`ZaloSessionManager.cs:190-195`) dù thành công hay lỗi.
- **Ngoại lệ duy nhất giữ browser sống**: khoảng thời gian chờ người dùng quét QR — không thể đóng khi
  đang chờ hiển thị mã. `QrTimeoutSeconds` (mặc định 180s) tự đóng nếu không ai quét
  (`ZaloSessionManager.cs:113-119`), tránh treo browser vô thời hạn.
- Mọi thao tác browser nối tiếp qua `SemaphoreSlim(1,1) _gate` (`ZaloSessionManager.cs:22,55,104,155,200`)
  — không bao giờ 2 request chạy Playwright song song, khớp giới hạn "1 phiên web/tài khoản" của Zalo.

### Tự tắt khi không phải Linux

Giống `ButtonListener`: `_enabled = _options.Enabled ?? OperatingSystem.IsLinux()`
(`ZaloSessionManager.cs:38`). Chạy local Windows → mọi endpoint trả `disabled` thay vì crash (đường dẫn
`/usr/bin/chromium` không tồn tại trên Windows). Có thể ép bật/tắt qua `Zalo:Enabled` trong appsettings.

### CSS selector — phần dễ vỡ nhất, CẦN chỉnh sau khi test thật

`ZaloOptions.Selectors` (`ZaloOptions.cs:57-73`) gom toàn bộ selector phụ thuộc DOM Zalo Web vào
`appsettings.json` thay vì hard-code trong service, để sau này chỉ cần sửa cấu hình, không phải build lại:

| Selector | Mặc định | Dùng để |
|---|---|---|
| `QrCanvas` | `canvas` | Chụp ảnh QR ở trang đăng nhập |
| `LoggedInMarker` | `#leftContainer` | Phần tử chỉ xuất hiện khi đã đăng nhập — dùng để phát hiện "đã login" |
| `SearchInput` | `input[placeholder*='Tìm']` | Ô tìm kiếm liên hệ |
| `SearchResult` | `.conv-item` | Một dòng kết quả tìm kiếm/hội thoại — lọc theo `MatchText` của từng contact |
| `MessageInput` | `[contenteditable='true'][role='textbox']` | Ô soạn tin (contenteditable) |

**Các giá trị mặc định trên chỉ là phỏng đoán, chưa đối chiếu với DOM Zalo Web thật.** Bắt buộc kiểm tra
và chỉnh lại khi chạy POC (xem cảnh báo đầu tài liệu).

### Giảm rủi ro khoá tài khoản (đã code, không phải chỉ là kế hoạch)

- Chromium hệ thống thật qua `ExecutablePath = "/usr/bin/chromium"`, không phải bản Chromium rút gọn mà
  Playwright tự tải.
- Headful (`Headless: false`) dưới Xvfb (Xvfb là hạ tầng Pi, chưa cài — xem cảnh báo đầu tài liệu).
- Gõ như người: `Keyboard.TypeAsync(…, Delay = RandomDelay())` với `RandomDelay()` random 60–140ms/ký tự
  (`ZaloSessionManager.cs:277,294,323`); dừng ngẫu nhiên 0.5–2s trước khi bấm Enter
  (`ZaloSessionManager.cs:296`).
- Rate-limit: `MinSecondsBetweenSends` (mặc định 5s) chặn gửi liên tiếp quá nhanh
  (`ZaloSessionManager.cs:159-163`).
- Một phiên tại một thời điểm: `SemaphoreSlim(1,1)` (xem trên).
- Ẩn dấu vết automation: args `--disable-blink-features=AutomationControlled`,
  `IgnoreDefaultArgs = ["--enable-automation"]`, script xoá `navigator.webdriver`
  (`ZaloSessionManager.cs:217-232`); `Locale = "vi-VN"`, `TimezoneId = "Asia/Ho_Chi_Minh"`, viewport
  1280×800.

---

## Cấu hình (`appsettings.json` → section `Zalo`)

```jsonc
"Zalo": {
  "ExecutablePath": "/usr/bin/chromium",
  "UserDataDir": "/home/<user>/BotApp/zalo-profile",
  "Headless": false,
  "MinSecondsBetweenSends": 5,
  "QrTimeoutSeconds": 180,
  "Contacts": [
    { "Id": "me", "Label": "Chính tôi", "SearchTerm": "", "MatchText": "" }
  ],
  "Selectors": { /* xem bảng trên */ }
}
```

- `Contacts[].SearchTerm`/`MatchText` hiện đang **để trống** trong `appsettings.json` — phải điền tên/số
  điện thoại thật của từng người nhận trước khi dùng, danh sách đầy đủ người nhận vẫn là câu hỏi mở
  (xem plan §10).
- `UserDataDir` cố ý nằm ngoài thư mục publish (`BotApp/zalo-profile`, không phải trong
  `linux-arm64/`) để không bị deploy ghi đè — cùng nguyên tắc `UserDataDir` như các thư mục dữ liệu Pi
  khác trong repo.
- `Enabled` không có trong JSON (mặc định `null`) → suy ra theo `OperatingSystem.IsLinux()` như mô tả
  ở trên; chỉ cần thêm `"Enabled": false` nếu muốn ép tắt trên Pi.

---

## Angular Web Frontend

- Route: `/app/settings/zalo-settings` (con của `SettingsTabComponent`,
  `app-routing.module.ts:46`), mục menu **"💬 Gửi tin Zalo"**
  (`settings-tab.component.html:80-84`).
- File mới:
  - `model/zalo.model.ts` — `ZaloContact`, `ZaloStatus`, `ZaloLoginResult` (+ `ZaloLoginStatus` union),
    `ZaloSendResult` (+ `ZaloSendStatus` union) — khớp 1-1 với `Dto/Zalo/ZaloDtos.cs`.
  - `services/zalo.service.ts` — `getStatus`, `getContacts`, `startLogin`, `loginStatus`, `send`, gọi
    `HttpClient` trực tiếp (không qua service trung gian nào khác, đúng quy ước "component gọi HttpClient
    thẳng" của repo).
  - `all-app-component/zalo/zalo-page/zalo-page.component.{ts,html,scss}`.
- File sửa: `app.module.ts` (khai báo `ZaloPageComponent`), `app-routing.module.ts` (route
  `zalo-settings`), `settings-tab.component.html` (thêm mục menu).

### Hành vi UI

- **Khu đăng nhập** (hiện khi `!loggedIn`): nút "▶ Đăng nhập Zalo" gọi `POST /Zalo/Login/Start`. Khi kết
  quả là `awaiting_qr`, hiện ảnh QR và tự poll `GET /Zalo/Login/Status` mỗi 2.5s
  (`zalo-page.component.ts:104-116`) cho tới khi `logged_in`/`already_logged_in` (dừng poll,
  ẩn QR) hoặc `expired` (yêu cầu bấm đăng nhập lại). Timer dọn trong `ngOnDestroy`.
- **Khu gửi tin** (hiện khi `loggedIn`): dropdown người nhận (nạp từ `GET /Zalo/Contacts`, tự chọn phần
  tử đầu tiên) + textarea nội dung + nút "➤ Gửi tin nhắn" gọi `POST /Zalo/Send`. Kết quả hiển thị bằng
  tiếng Việt tương ứng từng `status` (`sendResultText()`, `zalo-page.component.ts:150-159`); nếu server
  trả `need_login`, UI tự chuyển lại về khu đăng nhập (`this.loggedIn = false`).
- **Ảnh xác nhận đã gửi đúng người**: sau khi gửi, backend chụp viewport khung hội thoại (tên người nhận
  ở đầu + tin vừa gửi ở cuối) và trả về `screenshotBase64`; UI hiện ảnh này ngay dưới nút gửi
  (`.send-screenshot`, bấm vào mở ảnh lớn ở tab mới) để người dùng tự mắt kiểm tra — kể cả khi gửi nhầm
  người vẫn thấy được mà quyết định tiếp. Backend cũng cố chụp best-effort khi gửi lỗi để dễ chẩn đoán.
- Banner cảnh báo nếu `enabled === false`: "⚠️ Tính năng chỉ chạy trên Raspberry Pi (không hoạt động khi
  chạy máy cục bộ)."
- **Dark mode**: toàn bộ style dùng token `var(--color-*)` (`zalo-page.component.scss`) — riêng khung ảnh
  QR (`.qr-box`) cố tình giữ nền trắng cứng (`#ffffff`) **kể cả ở dark mode**, vì mã QR cần nền sáng để
  quét được bằng điện thoại; đây là ngoại lệ có chủ đích, không phải sót dark-mode.
- Toàn bộ chữ hiển thị là tiếng Việt có dấu (nhãn nút, placeholder, thông báo trạng thái).

---

## Ghi chú vận hành / việc còn thiếu

- **Chưa test với tài khoản Zalo thật, chưa deploy lên Pi** — xem cảnh báo đầu tài liệu và
  `document/plan-zalo-messenger.md` Phase 1 (POC) + Phase 4 (Deploy & Setup Pi) để biết đúng trình tự.
- **Không dùng Hangfire** cho luồng này dù repo đã có Hangfire cho 2 job khác (xem
  `Information_AI/22_feature-hangfire-jobs.md`) — đăng nhập QR cần giữ browser sống chờ tương tác và gửi
  tin cần phản hồi ngay trong request, không hợp với mô hình job nền định kỳ.
- **Không có Repository/Mapper/Migration** — tính năng không có bảng DB, chỉ có Service + Controller +
  DTO, khác chuỗi layer chuẩn của repo một cách có chủ đích.
- **Hạ tầng Pi cần chuẩn bị trước khi dùng** (chưa làm): cài Xvfb + service `Xvfb :99` (systemd), thêm
  `Environment=DISPLAY=:99` vào unit backend hiện có (`tmux-auto-start-api.service`), và `chmod +x` cho
  thư mục `.playwright/` sau publish (SCP từ Windows hay mất bit thực thi). Không cần
  `playwright install`/`install-deps` vì dùng Chromium hệ thống có sẵn.
- **Caddy không cần sửa** — `/Zalo/*` đi chung reverse-proxy `/api/*` sẵn có; endpoint vẫn sau JWT
  `FallbackPolicy` nên không mở ẩn danh ra internet.
- **QR không được ghi log hay cache** — chỉ trả trực tiếp cho response, đúng nguyên tắc "QR là chìa khoá
  tài khoản" trong plan §4.

## Keywords

zalo, gửi tin nhắn, nhắn tin, messenger, playwright, chromium, QR, đăng nhập QR, quét mã, xvfb, headful,
tài khoản Zalo, chat.zalo.me
