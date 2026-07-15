using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    /// <summary>
    /// Endpoint công khai nhận beacon từ portfolio (static export) và trang login.
    ///
    /// BẮT BUỘC [AllowAnonymous]: Program.cs đặt FallbackPolicy yêu cầu đăng nhập cho MỌI endpoint,
    /// nên nếu thiếu attribute này thì khách vãng lai sẽ bị 401 và không ghi được gì.
    ///
    /// Nguyên tắc: tracking hỏng thì trang web của khách vẫn phải chạy bình thường
    /// -> mọi lỗi đều nuốt và trả về 204, không bao giờ ném 500 về phía khách.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    public class VisitController : ControllerBase
    {
        private readonly IVisitEventService _visitEventService;
        private readonly ILogger<VisitController> _logger;

        public VisitController(IVisitEventService visitEventService, ILogger<VisitController> logger)
        {
            _visitEventService = visitEventService;
            _logger = logger;
        }

        [HttpPost]
        [Route("Visit/Record")]
        [RequestSizeLimit(8 * 1024)]
        public ActionResult Record([FromBody] VisitEventCreateDto dto)
        {
            try
            {
                var id = _visitEventService.Record(dto, HttpContext);
                return Ok(new { id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Visit/Record thất bại.");
                return NoContent();
            }
        }

        [HttpPost]
        [Route("Visit/Leave")]
        [RequestSizeLimit(2 * 1024)]
        public ActionResult Leave([FromBody] VisitLeaveDto dto)
        {
            try
            {
                _visitEventService.RecordLeave(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Visit/Leave thất bại.");
            }

            // sendBeacon không đọc response - luôn trả 204 cho gọn.
            return NoContent();
        }
    }
}
