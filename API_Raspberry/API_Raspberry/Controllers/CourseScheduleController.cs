using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class CourseScheduleController : ControllerBase
    {
        private readonly ICourseScheduleService _courseScheduleService;
        private readonly ICourseScheduleImportService _courseScheduleImportService;
        private readonly ISemesterMetadataService _semesterMetadataService;
        private readonly IUehStudentScheduleService _uehStudentScheduleService;

        public CourseScheduleController(
            ICourseScheduleService courseScheduleService,
            ICourseScheduleImportService courseScheduleImportService,
            ISemesterMetadataService semesterMetadataService,
            IUehStudentScheduleService uehStudentScheduleService)
        {
            _courseScheduleService = courseScheduleService;
            _courseScheduleImportService = courseScheduleImportService;
            _semesterMetadataService = semesterMetadataService;
            _uehStudentScheduleService = uehStudentScheduleService;
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
            var currentSemester = _semesterMetadataService
                .GetAll()
                .FirstOrDefault(x => x.IsCurrentSemester);

            if (currentSemester == null)
            {
                return BadRequest(new { message = "Không tìm thấy học kỳ hiện tại (IsCurrentSemester = true)." });
            }

            var fetchResult = await _uehStudentScheduleService.FetchScheduleAsync(request);
            if (!fetchResult.Success || string.IsNullOrWhiteSpace(fetchResult.ScheduleHtml))
            {
                return BadRequest(new
                {
                    message = fetchResult.Message ?? "Không thể lấy HTML thời khóa biểu từ UEH.",
                    detail = fetchResult
                });
            }

            _courseScheduleService.DeleteBySemesterMetadataId(currentSemester.Id);
            var imported = _courseScheduleImportService.ImportFromHtml(fetchResult.ScheduleHtml, currentSemester.Id);

            return Ok(new
            {
                message = $"Reset và import thành công {imported.Count} dòng.",
                count = imported.Count,
                semesterMetadataId = currentSemester.Id,
                yearStudy = fetchResult.YearStudy,
                termId = fetchResult.TermId,
                data = imported
            });
        }
    }
}
