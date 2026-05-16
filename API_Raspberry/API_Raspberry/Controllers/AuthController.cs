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

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost]
        [Route("Auth/Login")]
        [AllowAnonymous]
        public ActionResult<LoginResponseDto> Login([FromBody] LoginDto login)
        {
            var result = _authService.Authenticate(login);
            if (result == null)
                return Unauthorized(new { message = "Invalid username or password" });

            return Ok(result);
        }
    }
}
