using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class CourseScheduleController : ControllerBase
    {
        private readonly ICourseScheduleService _courseScheduleService;
        private readonly ICourseScheduleImportService _courseScheduleImportService;
        private readonly ICourseScheduleUehSyncService _courseScheduleUehSyncService;

        public CourseScheduleController(
            ICourseScheduleService courseScheduleService,
            ICourseScheduleImportService courseScheduleImportService,
            ICourseScheduleUehSyncService courseScheduleUehSyncService)
        {
            _courseScheduleService = courseScheduleService;
            _courseScheduleImportService = courseScheduleImportService;
            _courseScheduleUehSyncService = courseScheduleUehSyncService;
        }

        [HttpGet]
        [Route("GetAllCourseSchedule")]
        public List<CourseScheduleDto> GetAll()
        {
            return _courseScheduleService.GetAll();
        }

        [HttpGet]
        [Route("GetCourseScheduleById/{id}")]
        public CourseScheduleDto GetById(int id)
        {
            return _courseScheduleService.GetById(id);
        }

        [HttpPost]
        [Route("AddCourseSchedule")]
        public bool Add([FromBody] CourseScheduleCreateDto course)
        {
            _courseScheduleService.Add(course);
            return true;
        }

        [HttpPut]
        [Route("UpdateCourseSchedule/{id}")]
        public bool Update(int id, [FromBody] CourseScheduleUpdateDto course)
        {
            _courseScheduleService.Update(id, course);
            return true;
        }

        [HttpGet]
        [Route("GetCourseScheduleByMonth/{month}/{year}")]
        public List<CourseScheduleDto> GetByMonth(int month, int year)
        {
            return _courseScheduleService.GetByMonth(month, year);
        }

        /// <summary>
        /// date: ngày bất kỳ trong tuần cần lấy, dạng yyyy-MM-dd. Tuần tính từ thứ Hai.
        /// </summary>
        [HttpGet]
        [Route("GetCourseScheduleByWeek/{date}")]
        public List<CourseScheduleDto> GetByWeek(DateTime date)
        {
            return _courseScheduleService.GetByWeek(date);
        }

        [HttpDelete]
        [Route("DeleteCourseSchedule/{id}")]
        public bool Delete(int id)
        {
            _courseScheduleService.Delete(id);
            return true;
        }

        

        [HttpDelete]
        [Route("DeleteBySemesterMetadataId/{semesterMetadataId}")]
        public bool DeleteBySemesterMetadataId(int semesterMetadataId)
        {
            _courseScheduleService.DeleteBySemesterMetadataId(semesterMetadataId);
            return true;
        }

        [HttpPost]
        [Route("ImportCourseSchedule")]
        public IActionResult ImportFromExcel(IFormFile file, [FromForm] int? semesterMetadataId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Vui lòng chọn file Excel.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".xlsx")
                return BadRequest("Chỉ hỗ trợ file .xlsx");

            using var stream = file.OpenReadStream();
            var imported = _courseScheduleImportService.ImportFromExcel(stream, semesterMetadataId);

            return Ok(new { count = imported.Count, data = imported });
        }

        [HttpPost]
        [Route("ResetImportCourseScheduleFromUeh")]
        public async Task<IActionResult> ResetImportFromUeh([FromBody] UehStudentScheduleRequestDto request = null)
        {
            var result = await _courseScheduleUehSyncService.ResetImportByWeekAsync(request);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    message = result.Message,
                    semesters = result.Semesters
                });
            }

            return Ok(new
            {
                message = result.Message,
                count = result.Count,
                semesters = result.Semesters
            });
        }
    }
}
