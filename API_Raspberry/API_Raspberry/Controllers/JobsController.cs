using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    /// <summary>
    /// Xem lịch sử chạy và chạy ngay các tác vụ nền. Không cần [Authorize]: FallbackPolicy trong
    /// Program.cs đã yêu cầu JWT cho mọi endpoint không có [AllowAnonymous].
    /// </summary>
    public class JobsController : ControllerBase
    {
        private readonly IJobsService _jobsService;

        public JobsController(IJobsService jobsService)
        {
            _jobsService = jobsService;
        }

        [HttpGet]
        [Route("Jobs/History")]
        public List<JobRunDto> History([FromQuery] int take = 50)
        {
            return _jobsService.GetHistory(take);
        }

        [HttpPost]
        [Route("Jobs/Trigger/{jobKey}")]
        public IActionResult Trigger(string jobKey)
        {
            var jobId = _jobsService.Trigger(jobKey);

            if (jobId == null)
                return NotFound(new { message = $"Không tìm thấy tác vụ '{jobKey}'." });

            return Ok(new { jobId });
        }
    }
}
