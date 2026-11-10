using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    /// <summary>
    /// Nhận phiên UEH từ extension Chrome (LifeHub/Extension_Raspberry/) và trả trạng thái phiên.
    /// Cần JWT (FallbackPolicy). Cố ý KHÔNG có [AllowInDemo]: demo không được chạm vào UEH thật.
    /// Không endpoint nào trả cookie về.
    /// </summary>
    public class UehSessionController : ControllerBase
    {
        private readonly IUehPortalSessionService _uehPortalSessionService;

        public UehSessionController(IUehPortalSessionService uehPortalSessionService)
        {
            _uehPortalSessionService = uehPortalSessionService;
        }

        [HttpPost]
        [Route("UehSession/Submit")]
        public async Task<IActionResult> Submit([FromBody] UehSessionSubmitDto dto)
        {
            var result = await _uehPortalSessionService.SubmitAsync(dto);

            if (result.Outcome == UehSessionOutcome.InvalidCookie)
            {
                return BadRequest(result);
            }

            // Các outcome còn lại (kể cả not_logged_in, no_semester, portal_error) là kết quả nghiệp vụ,
            // extension đọc trường Outcome để hiển thị - nên vẫn trả 200.
            return Ok(result);
        }

        [HttpGet]
        [Route("UehSession/Status")]
        public IActionResult Status()
        {
            return Ok(_uehPortalSessionService.GetStatus());
        }
    }
}
