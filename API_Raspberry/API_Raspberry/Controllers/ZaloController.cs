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
        private readonly IConfiguration _configuration;

        public ZaloController(IZaloSessionManager zalo, IConfiguration configuration)
        {
            _zalo = zalo;
            _configuration = configuration;
        }

        /// <summary>
        /// Zalo gửi tin nhắn thật qua phiên đăng nhập thật của người vận hành. Trên instance demo,
        /// tài khoản đăng nhập là credential công khai chia sẻ để demo - phải chặn cứng ở đây chứ
        /// không chỉ ẩn nav ở Angular, vì ai cũng gọi thẳng API được bằng token demo.
        /// </summary>
        private ActionResult BlockIfDemo()
        {
            if (_configuration.GetValue<bool>("DemoMode"))
            {
                return StatusCode(403, new { message = "Tính năng Zalo không khả dụng trên bản demo." });
            }
            return null;
        }

        [HttpGet]
        [Route("Zalo/Status")]
        public ActionResult<ZaloStatusDto> Status() => BlockIfDemo() ?? Ok(_zalo.GetStatus());

        [HttpGet]
        [Route("Zalo/Contacts")]
        public ActionResult<IReadOnlyList<ZaloContactDto>> Contacts() => BlockIfDemo() ?? Ok(_zalo.GetContacts());

        [HttpPost]
        [Route("Zalo/Login/Start")]
        public async Task<ActionResult<ZaloLoginResultDto>> LoginStart() => BlockIfDemo() ?? Ok(await _zalo.StartLoginAsync());

        [HttpGet]
        [Route("Zalo/Login/Status")]
        public async Task<ActionResult<ZaloLoginResultDto>> LoginStatus() => BlockIfDemo() ?? Ok(await _zalo.GetLoginStatusAsync());

        [HttpPost]
        [Route("Zalo/Send")]
        public async Task<IActionResult> Send([FromBody] ZaloSendRequest request)
        {
            var blocked = BlockIfDemo();
            if (blocked != null) return blocked;

            if (request == null || string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { message = "Thiếu nội dung tin nhắn." });

            var result = await _zalo.SendAsync(request.ContactId, request.Message);
            return Ok(result);
        }
    }
}
