using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IVisitEventService _visitEventService;
        private readonly IPasswordResetService _passwordResetService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IVisitEventService visitEventService,
            IPasswordResetService passwordResetService,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _visitEventService = visitEventService;
            _passwordResetService = passwordResetService;
            _logger = logger;
        }

        [HttpPost]
        [Route("Auth/Login")]
        [AllowAnonymous]
        public ActionResult<LoginResponseDto> Login([FromBody] LoginDto login)
        {
            var result = _authService.Authenticate(login);

            // Ghi lại mọi lần thử đăng nhập (kể cả thất bại) để biết ai đang dò trang admin.
            // Login thành công còn tự đánh dấu IP đó là "của mình".
            // Bọc try/catch: lỗi ghi log không được phép làm hỏng việc đăng nhập.
            try
            {
                _visitEventService.RecordLoginAttempt(result != null, login?.Username, HttpContext);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không ghi được sự kiện đăng nhập.");
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
