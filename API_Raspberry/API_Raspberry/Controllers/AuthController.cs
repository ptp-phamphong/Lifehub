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
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IVisitEventService visitEventService,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _visitEventService = visitEventService;
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
    }
}
