using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class UehStudentScheduleController : ControllerBase
    {
        private readonly IUehStudentScheduleService _uehStudentScheduleService;

        public UehStudentScheduleController(IUehStudentScheduleService uehStudentScheduleService)
        {
            _uehStudentScheduleService = uehStudentScheduleService;
        }

        [HttpPost]
        [Route("FetchUehStudentSchedule")]
        public async Task<IActionResult> Fetch([FromBody] UehStudentScheduleRequestDto request = null)
        {
            var result = await _uehStudentScheduleService.FetchScheduleAsync(request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}
