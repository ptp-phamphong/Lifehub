using API_Raspberry.Dto.Zalo;
using API_Raspberry.Service.Zalo;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    /// <summary>
    /// Gửi tin nhắn Zalo qua Playwright. Không cần [Authorize]: FallbackPolicy JWT ở Program.cs đã
    /// bắt buộc đăng nhập cho mọi endpoint không có [AllowAnonymous]. Route trần (không /api) vì Caddy
    /// strip sẵn tiền tố /api trước khi proxy.
    /// </summary>
    public class ZaloController : ControllerBase
    {
        private readonly IZaloSessionManager _zalo;

        public ZaloController(IZaloSessionManager zalo)
        {
            _zalo = zalo;
        }

        [HttpGet]
        [Route("Zalo/Status")]
        public ZaloStatusDto Status() => _zalo.GetStatus();

        [HttpGet]
        [Route("Zalo/Contacts")]
        public IReadOnlyList<ZaloContactDto> Contacts() => _zalo.GetContacts();

        [HttpPost]
        [Route("Zalo/Login/Start")]
        public Task<ZaloLoginResultDto> LoginStart() => _zalo.StartLoginAsync();

        [HttpGet]
        [Route("Zalo/Login/Status")]
        public Task<ZaloLoginResultDto> LoginStatus() => _zalo.GetLoginStatusAsync();

        [HttpPost]
        [Route("Zalo/Send")]
        public async Task<IActionResult> Send([FromBody] ZaloSendRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { message = "Thiếu nội dung tin nhắn." });

            var result = await _zalo.SendAsync(request.ContactId, request.Message);
            return Ok(result);
        }
    }
}
