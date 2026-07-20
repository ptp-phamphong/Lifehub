using API_Raspberry.Dto.Zalo;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;

namespace API_Raspberry.Service.Zalo
{
    /// <summary>
    /// Xem IZaloSessionManager. Vòng đời "reset hết sau mỗi lần dùng": mỗi thao tác mở Chromium từ
    /// UserDataDir, xong việc gọi <see cref="CloseInternalAsync"/> để đóng cả Chromium lẫn tiến trình
    /// Playwright-driver (node) -> lúc rảnh chiếm 0 MB. Ngoại lệ duy nhất giữ browser sống là khoảng
    /// thời gian chờ người dùng quét QR (có QrTimeoutSeconds tự đóng nếu không ai quét).
    /// </summary>
    public class ZaloSessionManager : IZaloSessionManager, IAsyncDisposable
    {
        private const string ZaloWebUrl = "https://chat.zalo.me";

        private readonly ZaloOptions _options;
        private readonly bool _enabled;
        private readonly ILogger<ZaloSessionManager> _logger;

        // Zalo Web chỉ cho một phiên web/tài khoản: nối tiếp mọi thao tác browser để không bao giờ mở 2 phiên.
        private readonly SemaphoreSlim _gate = new(1, 1);

        private IPlaywright _playwright;
        private IBrowserContext _context;
        private IPage _page;

        private bool _isLoggedIn;             // "lần biết gần nhất"; kiểm tra thật diễn ra lúc mở lại
        private string _lastQr;
        private DateTime? _awaitingSince;      // mốc bắt đầu chờ quét QR (để tính hết giờ)
        private DateTime? _lastSendUtc;        // cho rate-limit

        public ZaloSessionManager(IOptions<ZaloOptions> options, ILogger<ZaloSessionManager> logger)
        {
            _options = options.Value;
            _logger = logger;
            // Giống ButtonListener: mặc định bật khi Linux, tắt khi dev Windows (Chromium ở /usr/bin không tồn tại).
            _enabled = _options.Enabled ?? OperatingSystem.IsLinux();
        }

        public ZaloStatusDto GetStatus() => new()
        {
            Enabled = _enabled,
            LoggedIn = _isLoggedIn,
            BrowserOpen = _context != null
        };

        public IReadOnlyList<ZaloContactDto> GetContacts() =>
            _options.Contacts.Select(c => new ZaloContactDto { Id = c.Id, Label = c.Label }).ToList();

        public async Task<ZaloLoginResultDto> StartLoginAsync()
        {
            if (!_enabled) return Disabled();

            await _gate.WaitAsync();
            try
            {
                if (_context != null && _isLoggedIn)
                    return new ZaloLoginResultDto { Status = "already_logged_in", Message = "Đã đăng nhập Zalo." };

                // Dọn context cũ còn treo (vd lần chờ QR trước không ai quét).
                await CloseInternalAsync();

                await OpenContextAsync();
                await _page.GotoAsync(ZaloWebUrl, new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded,
                    Timeout = 60000
                });

                // Phiên trên đĩa còn hiệu lực -> vào thẳng chat, không có QR.
                if (await IsLoggedInAsync())
                {
                    _isLoggedIn = true;
                    await CloseInternalAsync(); // reset cho nhẹ RAM; phiên đã lưu trên đĩa
                    return new ZaloLoginResultDto { Status = "already_logged_in", Message = "Đã đăng nhập Zalo." };
                }

                _awaitingSince = DateTime.UtcNow;
                _lastQr = await CaptureQrAsync();
                return new ZaloLoginResultDto
                {
                    Status = "awaiting_qr",
                    QrImageBase64 = _lastQr,
                    Message = "Quét mã QR bằng ứng dụng Zalo trên điện thoại."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Zalo StartLogin lỗi");
                await CloseInternalAsync();
                return Error(ex.Message);
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task<ZaloLoginResultDto> GetLoginStatusAsync()
        {
            if (!_enabled) return Disabled();

            await _gate.WaitAsync();
            try
            {
                if (_isLoggedIn)
                    return new ZaloLoginResultDto { Status = "logged_in", Message = "Đã đăng nhập Zalo." };

                if (_context == null || _page == null)
                    return new ZaloLoginResultDto { Status = "logged_out" };

                // Hết giờ chờ quét -> đóng cho nhẹ RAM.
                if (_awaitingSince.HasValue &&
                    DateTime.UtcNow - _awaitingSince.Value > TimeSpan.FromSeconds(_options.QrTimeoutSeconds))
                {
                    await CloseInternalAsync();
                    return new ZaloLoginResultDto { Status = "expired", Message = "Mã QR đã hết hạn. Bấm đăng nhập lại." };
                }

                if (await IsLoggedInAsync())
                {
                    _isLoggedIn = true;
                    _awaitingSince = null;
                    await CloseInternalAsync(); // reset; phiên đã lưu trên đĩa
                    return new ZaloLoginResultDto { Status = "logged_in", Message = "Đã đăng nhập Zalo." };
                }

                // Chưa quét: cập nhật lại ảnh QR (Zalo tự làm mới QR theo chu kỳ).
                _lastQr = await CaptureQrAsync();
                return new ZaloLoginResultDto { Status = "awaiting_qr", QrImageBase64 = _lastQr };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Zalo GetLoginStatus lỗi");
                return Error(ex.Message);
            }
            finally
            {
                _gate.Release();
            }
        }

        public async Task<ZaloSendResultDto> SendAsync(string contactId, string message)
        {
            if (!_enabled)
                return new ZaloSendResultDto { Status = "disabled", Message = "Tính năng chỉ chạy trên Pi." };
            if (string.IsNullOrWhiteSpace(message))
                return new ZaloSendResultDto { Status = "error", Message = "Nội dung tin nhắn trống." };

            var contact = _options.Contacts.FirstOrDefault(c => c.Id == contactId);
            if (contact == null)
                return new ZaloSendResultDto { Status = "contact_not_found", Message = "Không tìm thấy người nhận." };

            await _gate.WaitAsync();
            try
            {
                // Rate-limit chống spam.
                if (_lastSendUtc.HasValue &&
                    DateTime.UtcNow - _lastSendUtc.Value < TimeSpan.FromSeconds(_options.MinSecondsBetweenSends))
                {
                    return new ZaloSendResultDto { Status = "rate_limited", Message = "Gửi quá nhanh, thử lại sau vài giây." };
                }

                if (_context == null) await OpenContextAsync();
                await _page.GotoAsync(ZaloWebUrl, new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded,
                    Timeout = 60000
                });

                if (!await IsLoggedInAsync())
                {
                    _isLoggedIn = false;
                    return new ZaloSendResultDto { Status = "need_login", Message = "Chưa đăng nhập Zalo. Hãy đăng nhập trước." };
                }
                _isLoggedIn = true;

                await OpenConversationAsync(contact);
                await TypeAndSendAsync(message);

                _lastSendUtc = DateTime.UtcNow;

                // Chụp lại khung hội thoại (tên người nhận ở đầu + tin vừa gửi ở cuối) để người dùng
                // tự xác nhận đã gửi đúng người. Chụp TRƯỚC khi finally đóng browser.
                var screenshot = await CaptureConversationAsync();
                return new ZaloSendResultDto
                {
                    Status = "sent",
                    Message = "Đã gửi tin nhắn.",
                    ScreenshotBase64 = screenshot
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Zalo Send lỗi");
                // Cố chụp lại màn hình lúc lỗi (best-effort) để dễ chẩn đoán chọn sai người / sai selector.
                string shot = null;
                try { if (_page != null) shot = await CaptureConversationAsync(); }
                catch (Exception) { /* bỏ qua: lỗi chụp không được che lỗi gốc */ }
                return new ZaloSendResultDto { Status = "error", Message = ex.Message, ScreenshotBase64 = shot };
            }
            finally
            {
                // Reset hết sau mỗi lần gửi cho nhẹ RAM; phiên vẫn nằm trên đĩa.
                await CloseInternalAsync();
                _gate.Release();
            }
        }

        public async Task CloseAsync()
        {
            await _gate.WaitAsync();
            try { await CloseInternalAsync(); }
            finally { _gate.Release(); }
        }

        // ---------------- Helpers (đều chạy trong _gate) ----------------

        private async Task OpenContextAsync()
        {
            Directory.CreateDirectory(_options.UserDataDir);

            _playwright = await Playwright.CreateAsync();
            _context = await _playwright.Chromium.LaunchPersistentContextAsync(_options.UserDataDir,
                new BrowserTypeLaunchPersistentContextOptions
                {
                    ExecutablePath = _options.ExecutablePath,
                    Headless = _options.Headless,
                    Args = new[]
                    {
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu",
                        // Ẩn dấu vết automation.
                        "--disable-blink-features=AutomationControlled"
                    },
                    IgnoreDefaultArgs = new[] { "--enable-automation" },
                    Locale = "vi-VN",
                    TimezoneId = "Asia/Ho_Chi_Minh",
                    ViewportSize = new ViewportSize { Width = 1280, Height = 800 }
                });

            // Xoá cờ navigator.webdriver — chỉ báo automation phổ biến nhất.
            await _context.AddInitScriptAsync("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});");

            _page = _context.Pages.Count > 0 ? _context.Pages[0] : await _context.NewPageAsync();
        }

        private async Task<bool> IsLoggedInAsync()
        {
            try
            {
                await _page.WaitForSelectorAsync(_options.Selectors.LoggedInMarker,
                    new PageWaitForSelectorOptions { Timeout = 8000, State = WaitForSelectorState.Visible });
                return true;
            }
            catch (Exception)
            {
                // Không thấy khung chat trong thời gian chờ -> coi như chưa đăng nhập.
                return false;
            }
        }

        private async Task<string> CaptureQrAsync()
        {
            byte[] bytes;
            try
            {
                var qr = await _page.WaitForSelectorAsync(_options.Selectors.QrCanvas,
                    new PageWaitForSelectorOptions { Timeout = 15000, State = WaitForSelectorState.Visible });
                bytes = await qr.ScreenshotAsync();
            }
            catch (Exception)
            {
                // Không tìm thấy phần tử QR -> chụp cả trang để người dùng vẫn thấy được QR.
                bytes = await _page.ScreenshotAsync();
            }
            return "data:image/png;base64," + Convert.ToBase64String(bytes);
        }

        /// <summary>Chụp viewport hiện tại (1280×800) — đủ thấy tên người nhận ở đầu và tin mới ở cuối.</summary>
        private async Task<string> CaptureConversationAsync()
        {
            var bytes = await _page.ScreenshotAsync();
            return "data:image/png;base64," + Convert.ToBase64String(bytes);
        }

        private async Task OpenConversationAsync(ZaloContactOption contact)
        {
            var search = await _page.WaitForSelectorAsync(_options.Selectors.SearchInput,
                new PageWaitForSelectorOptions { Timeout = 15000 });
            await search.ClickAsync();
            await search.FillAsync(string.Empty);

            // Gõ từng ký tự như người.
            await _page.Keyboard.TypeAsync(contact.SearchTerm, new KeyboardTypeOptions { Delay = RandomDelay() });
            await _page.WaitForTimeoutAsync(1200);

            // Chọn kết quả khớp tên hội thoại.
            var result = _page.Locator(_options.Selectors.SearchResult)
                              .Filter(new LocatorFilterOptions { HasTextString = contact.MatchText })
                              .First;
            await result.ClickAsync(new LocatorClickOptions { Timeout = 10000 });
            await _page.WaitForTimeoutAsync(600);
        }

        private async Task TypeAndSendAsync(string message)
        {
            var box = await _page.WaitForSelectorAsync(_options.Selectors.MessageInput,
                new PageWaitForSelectorOptions { Timeout = 15000 });
            await box.ClickAsync();

            await _page.Keyboard.TypeAsync(message, new KeyboardTypeOptions { Delay = RandomDelay() });
            // Dừng ngẫu nhiên trước khi gửi cho tự nhiên.
            await _page.WaitForTimeoutAsync(Random.Shared.Next(500, 2000));
            await _page.Keyboard.PressAsync("Enter");
            await _page.WaitForTimeoutAsync(800);
        }

        /// <summary>Đóng sạch Chromium + tiến trình Playwright-driver. Idempotent (gọi lại là no-op).</summary>
        private async Task CloseInternalAsync()
        {
            try
            {
                if (_context != null) await _context.CloseAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Đóng Zalo context lỗi (bỏ qua)");
            }
            finally
            {
                _page = null;
                _context = null;
                _playwright?.Dispose();
                _playwright = null;
                _lastQr = null;
                _awaitingSince = null;
            }
        }

        private static float RandomDelay() => Random.Shared.Next(60, 140);

        private static ZaloLoginResultDto Disabled() =>
            new() { Status = "disabled", Message = "Tính năng chỉ chạy trên Pi." };

        private static ZaloLoginResultDto Error(string message) =>
            new() { Status = "error", Message = message };

        public async ValueTask DisposeAsync()
        {
            await CloseInternalAsync();
            _gate.Dispose();
        }
    }
}
