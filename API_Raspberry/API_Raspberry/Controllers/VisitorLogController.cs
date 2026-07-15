using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    /// <summary>
    /// API cho tab Visitor Log trong trang quản trị.
    /// Không cần [Authorize]: FallbackPolicy trong Program.cs đã yêu cầu JWT cho mọi endpoint
    /// không có [AllowAnonymous].
    /// </summary>
    [ApiController]
    public class VisitorLogController : ControllerBase
    {
        private readonly IVisitorAnalyticsService _visitorAnalyticsService;

        public VisitorLogController(IVisitorAnalyticsService visitorAnalyticsService)
        {
            _visitorAnalyticsService = visitorAnalyticsService;
        }

        /// <summary>Bảng dữ liệu thô: phân trang / sắp xếp / lọc ở phía server.</summary>
        [HttpPost]
        [Route("VisitorLog/GetAll")]
        public ActionResult<PagedResult<VisitEventDto>> GetAll([FromBody] VisitorLogFilter filter)
        {
            return Ok(_visitorAnalyticsService.GetPaged(filter));
        }

        /// <summary>Số liệu tổng quan + biểu đồ + bảng xếp hạng.</summary>
        [HttpPost]
        [Route("VisitorLog/Summary")]
        public ActionResult<VisitorSummaryDto> Summary([FromBody] VisitorLogFilter filter)
        {
            return Ok(_visitorAnalyticsService.GetSummary(filter));
        }

        /// <summary>Gộp theo khách: ai quay lại bao nhiêu lần.</summary>
        [HttpPost]
        [Route("VisitorLog/Visitors")]
        public ActionResult<List<VisitorProfileDto>> Visitors([FromBody] VisitorLogFilter filter)
        {
            return Ok(_visitorAnalyticsService.GetVisitors(filter));
        }

        /// <summary>Lịch sử dài hạn từ bảng tổng hợp (còn lại sau khi dữ liệu thô bị xóa).</summary>
        [HttpGet]
        [Route("VisitorLog/History")]
        public ActionResult<List<VisitorDailyPointDto>> History()
        {
            return Ok(_visitorAnalyticsService.GetHistory());
        }

        [HttpGet]
        [Route("VisitorLog/Settings")]
        public ActionResult<VisitorLogSettings> Settings()
        {
            return Ok(_visitorAnalyticsService.GetSettings());
        }

        [HttpGet]
        [Route("VisitorLog/KnownIp/GetAll")]
        public ActionResult<List<VisitorKnownIpDto>> GetKnownIps()
        {
            return Ok(_visitorAnalyticsService.GetKnownIps());
        }

        /// <summary>Đánh dấu một IP (hoặc một trình duyệt) là của mình.</summary>
        [HttpPost]
        [Route("VisitorLog/KnownIp")]
        public ActionResult AddKnownIp([FromBody] VisitorKnownIpCreateDto dto)
        {
            _visitorAnalyticsService.AddKnownIp(dto);
            return Ok(true);
        }

        [HttpPut]
        [Route("VisitorLog/KnownIp/{id}")]
        public ActionResult UpdateKnownIp(int id, [FromBody] VisitorKnownIpUpdateDto dto)
        {
            _visitorAnalyticsService.UpdateKnownIp(id, dto);
            return Ok(true);
        }

        [HttpDelete]
        [Route("VisitorLog/KnownIp/{id}")]
        public ActionResult DeleteKnownIp(int id)
        {
            _visitorAnalyticsService.DeleteKnownIp(id);
            return Ok(true);
        }
    }
}
