using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Authorization;
using API_Raspberry.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using API_Raspberry.Middleware;

namespace API_Raspberry.Controllers
{
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IVisitEventService _visitEventService;
        private readonly IPasswordResetService _passwordResetService;
        private readonly IDemoModeService _demoMode;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IVisitEventService visitEventService,
            IPasswordResetService passwordResetService,
            IDemoModeService demoMode,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _visitEventService = visitEventService;
            _passwordResetService = passwordResetService;
            _demoMode = demoMode;
            _logger = logger;
        }

        [AllowInDemo]
        [HttpPost]
        [Route("Auth/Login")]
        [EnableRateLimiting(RateLimitPolicies.Login)]
        [AllowAnonymous]
        public ActionResult<LoginResponseDto> Login([FromBody] LoginDto login)
        {
            var result = _authService.Authenticate(login);

            // Ghi lại mọi lần thử đăng nhập (kể cả thất bại) để biết ai đang dò trang admin.
            // Login thành công còn tự đánh dấu IP đó là "của mình".
            // Bọc try/catch: lỗi ghi log không được phép làm hỏng việc đăng nhập.
            // Demo không ghi: visitor log của demo không có ai xem, chỉ tích IP của người lạ.
            if (!_demoMode.IsDemo)
            {
                try
                {
                    _visitEventService.RecordLoginAttempt(result != null, login?.Username, HttpContext);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Không ghi được sự kiện đăng nhập.");
                }
            }

            if (result == null)
                return Unauthorized(new { message = "Invalid username or password" });

            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Quên mật khẩu — Bước 1: gửi mã OTP về email của user.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost]
        [Route("Auth/ForgotPassword")]
        [EnableRateLimiting(RateLimitPolicies.ForgotPassword)]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
        {
            var result = await _passwordResetService.RequestOtpAsync(dto?.Username);
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(new ForgotPasswordResponseDto
            {
                Message = result.Message,
                MaskedEmail = result.MaskedEmail
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Quên mật khẩu — Bước 2: xác thực OTP + đặt mật khẩu mới.
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost]
        [Route("Auth/ResetPassword")]
        [EnableRateLimiting(RateLimitPolicies.ResetPassword)]
        [AllowAnonymous]
        public IActionResult ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var result = _passwordResetService.VerifyAndReset(dto?.Username, dto?.Otp, dto?.NewPassword);
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = result.Message });
        }
    }
}
