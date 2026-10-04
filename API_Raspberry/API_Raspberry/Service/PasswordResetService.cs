using System.Collections.Concurrent;
using System.Security.Cryptography;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    // ─────────────────────────────────────────────────────────────────────────
    // Luồng quên mật khẩu bằng OTP:
    //   1. User nhập username  → RequestOtpAsync sinh mã 6 số, lưu tạm + gửi email.
    //   2. User nhập OTP + mật khẩu mới → VerifyAndReset kiểm tra rồi đổi mật khẩu.
    //
    // OTP được lưu trong bộ nhớ (IOtpStore singleton) chứ không ghi DB: app chỉ chạy
    // một tiến trình trên Pi nên đủ dùng, và mã hết hạn nhanh (10 phút). Nếu restart
    // service thì mã cũ mất — người dùng chỉ cần bấm gửi lại.
    // ─────────────────────────────────────────────────────────────────────────

    public class OtpEntry
    {
        public string Code { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int Attempts { get; set; }
    }

    public interface IOtpStore
    {
        void Set(string username, OtpEntry entry);
        OtpEntry Get(string username);
        void Remove(string username);

        /// <summary>
        /// Ghi nhận một lần xin OTP cho username. Trả false (và không ghi nhận) nếu trong cửa sổ
        /// <paramref name="window"/> đã có đủ <paramref name="maxPerWindow"/> lần, hoặc lần gần nhất
        /// cách chưa tới <paramref name="minInterval"/>.
        /// </summary>
        bool TryRegisterRequest(string username, DateTime utcNow, int maxPerWindow, TimeSpan window, TimeSpan minInterval);
    }

    /// <summary>
    /// Kho OTP trong bộ nhớ, key theo username (đã lowercase). Singleton, thread-safe.
    /// </summary>
    public class OtpStore : IOtpStore
    {
        private readonly ConcurrentDictionary<string, OtpEntry> _store = new();
        private readonly ConcurrentDictionary<string, List<DateTime>> _requests = new();

        public bool TryRegisterRequest(string username, DateTime utcNow, int maxPerWindow, TimeSpan window, TimeSpan minInterval)
        {
            var times = _requests.GetOrAdd(Key(username), _ => new List<DateTime>());
            lock (times)
            {
                times.RemoveAll(t => utcNow - t >= window);
                if (times.Count >= maxPerWindow)
                    return false;
                if (times.Count > 0 && utcNow - times[^1] < minInterval)
                    return false;

                times.Add(utcNow);
                return true;
            }
        }

        public void Set(string username, OtpEntry entry)
            => _store[Key(username)] = entry;

        public OtpEntry Get(string username)
            => _store.TryGetValue(Key(username), out var e) ? e : null;

        public void Remove(string username)
            => _store.TryRemove(Key(username), out _);

        private static string Key(string username) => (username ?? string.Empty).Trim().ToLowerInvariant();
    }

    public class PasswordResetResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string MaskedEmail { get; set; }

        public static PasswordResetResult Fail(string message) => new() { Success = false, Message = message };
        public static PasswordResetResult Ok(string message, string maskedEmail = null)
            => new() { Success = true, Message = message, MaskedEmail = maskedEmail };
    }

    public interface IPasswordResetService
    {
        Task<PasswordResetResult> RequestOtpAsync(string username);
        PasswordResetResult VerifyAndReset(string username, string otp, string newPassword);
    }

    public class PasswordResetService : IPasswordResetService
    {
        private const int OtpLifetimeMinutes = 10;
        private const int MaxVerifyAttempts = 5;
        private const int MinPasswordLength = 4;

        // Giới hạn theo TÀI KHOẢN (rate limit theo IP ở RateLimitPolicies không chặn được kẻ đổi IP).
        // Mỗi OTP mới đặt lại Attempts = 0, nên không có giới hạn này thì cứ xin mã mới là dò tiếp
        // được. 3 mã/giờ x 5 lần nhập = tối đa 15 lần đoán mỗi giờ trên 1 triệu khả năng.
        private const int MaxOtpRequestsPerHour = 3;
        private static readonly TimeSpan MinTimeBetweenOtpRequests = TimeSpan.FromSeconds(60);

        // Cùng một câu cho mọi trường hợp (có/không có user, có/không có email, bị giới hạn), để
        // không ai dò được username nào tồn tại. Vì vậy cũng không trả MaskedEmail nữa: web và
        // mobile đã có sẵn chữ dự phòng "email của bạn".
        public static readonly string GenericRequestMessage =
            $"Nếu tài khoản tồn tại và đã có email, mã OTP đã được gửi tới email đó. Mã có hiệu lực {OtpLifetimeMinutes} phút.";

        private const string DemoBlockedMessage = "Tính năng quên mật khẩu không khả dụng trên bản demo.";

        private readonly IUserRepository _userRepository;
        private readonly IOtpStore _otpStore;
        private readonly IDemoModeService _demoMode;
        private readonly ILogger<PasswordResetService> _logger;

        public PasswordResetService(
            IUserRepository userRepository,
            IOtpStore otpStore,
            IDemoModeService demoMode,
            ILogger<PasswordResetService> logger)
        {
            _userRepository = userRepository;
            _otpStore = otpStore;
            _demoMode = demoMode;
            _logger = logger;
        }

        public async Task<PasswordResetResult> RequestOtpAsync(string username)
        {
            // Lớp chặn thứ hai sau DemoGateMiddleware: demo không được gửi mail từ Gmail của chủ repo.
            if (_demoMode.IsDemo)
                return PasswordResetResult.Fail(DemoBlockedMessage);

            if (string.IsNullOrWhiteSpace(username))
                return PasswordResetResult.Fail("Vui lòng nhập username.");

            var user = _userRepository.GetByUsername(username);
            if (user == null || !user.Active || string.IsNullOrWhiteSpace(user.Email))
            {
                _logger.LogInformation("Yêu cầu OTP cho username không hợp lệ hoặc chưa có email - trả lời chung, không gửi mail.");
                return PasswordResetResult.Ok(GenericRequestMessage);
            }

            // Chỉ đếm cho user có thật, để username bịa ra không làm phình bộ nhớ.
            if (!_otpStore.TryRegisterRequest(user.Username, DateTime.UtcNow,
                    MaxOtpRequestsPerHour, TimeSpan.FromHours(1), MinTimeBetweenOtpRequests))
            {
                _logger.LogWarning("Yêu cầu OTP cho {Username} bị từ chối do vượt giới hạn theo tài khoản.", user.Username);
                return PasswordResetResult.Ok(GenericRequestMessage);
            }

            // Đọc thông tin SMTP từ biến môi trường (giống NotificationEmailController).
            var senderEmail = Environment.GetEnvironmentVariable("EMAIL_ADDRESS");
            var appPassword = Environment.GetEnvironmentVariable("EMAIL_APP_PASSWORD");
            if (string.IsNullOrEmpty(senderEmail) || string.IsNullOrEmpty(appPassword))
            {
                _logger.LogError("EMAIL_ADDRESS / EMAIL_APP_PASSWORD chưa được cấu hình trên server.");
                return PasswordResetResult.Fail("Email chưa được cấu hình trên server.");
            }

            var code = GenerateOtp();
            _otpStore.Set(user.Username, new OtpEntry
            {
                Code = code,
                ExpiresAt = DateTime.UtcNow.AddMinutes(OtpLifetimeMinutes),
                Attempts = 0
            });

            var subject = "🔐 Mã OTP đặt lại mật khẩu - LifeHub";
            var body = BuildOtpEmail(user.Name ?? user.Username, code);

            var emailService = new EmailService(senderEmail, appPassword);
            var sent = await emailService.SendEmailAsync(user.Email, subject, body);
            if (!sent)
            {
                _otpStore.Remove(user.Username);
                return PasswordResetResult.Fail("Gửi email thất bại. Vui lòng thử lại.");
            }

            return PasswordResetResult.Ok(GenericRequestMessage);
        }

        public PasswordResetResult VerifyAndReset(string username, string otp, string newPassword)
        {
            if (_demoMode.IsDemo)
                return PasswordResetResult.Fail(DemoBlockedMessage);

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(otp))
                return PasswordResetResult.Fail("Vui lòng nhập đầy đủ username và mã OTP.");

            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < MinPasswordLength)
                return PasswordResetResult.Fail($"Mật khẩu mới phải có ít nhất {MinPasswordLength} ký tự.");

            var entry = _otpStore.Get(username);
            if (entry == null)
                return PasswordResetResult.Fail("Chưa có yêu cầu OTP hoặc mã đã bị xoá. Vui lòng gửi lại.");

            if (DateTime.UtcNow > entry.ExpiresAt)
            {
                _otpStore.Remove(username);
                return PasswordResetResult.Fail("Mã OTP đã hết hạn. Vui lòng gửi lại.");
            }

            if (entry.Attempts >= MaxVerifyAttempts)
            {
                _otpStore.Remove(username);
                return PasswordResetResult.Fail("Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.");
            }

            if (!string.Equals(entry.Code, otp.Trim(), StringComparison.Ordinal))
            {
                entry.Attempts++;
                _otpStore.Set(username, entry);
                return PasswordResetResult.Fail("Mã OTP không đúng.");
            }

            var user = _userRepository.GetByUsername(username);
            if (user == null)
            {
                _otpStore.Remove(username);
                return PasswordResetResult.Fail("Không tìm thấy tài khoản.");
            }

            user.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _userRepository.Update(user);
            _otpStore.Remove(username);

            return PasswordResetResult.Ok("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
        }

        // Mã OTP 6 chữ số, dùng RNG mật mã để không đoán được.
        private static string GenerateOtp()
        {
            var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
            return value.ToString("D6");
        }

        private static string BuildOtpEmail(string name, string code)
        {
            return $@"
                <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto'>
                    <h2 style='color:#0d6efd'>🔐 Đặt lại mật khẩu</h2>
                    <p>Xin chào <strong>{System.Net.WebUtility.HtmlEncode(name)}</strong>,</p>
                    <p>Mã OTP để đặt lại mật khẩu của bạn là:</p>
                    <p style='font-size:32px;font-weight:bold;letter-spacing:8px;
                              background:#f1f5f9;padding:16px;text-align:center;border-radius:8px'>
                        {code}
                    </p>
                    <p>Mã có hiệu lực trong <strong>{OtpLifetimeMinutes} phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
                    <p style='color:#999;font-size:12px;margin-top:20px'>
                        Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                    </p>
                </div>";
        }
    }
}
