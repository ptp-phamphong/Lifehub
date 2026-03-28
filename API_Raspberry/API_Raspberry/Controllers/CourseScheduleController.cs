using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class CourseScheduleController : ControllerBase
    {
        private readonly ICourseScheduleService _courseScheduleService;
        private readonly ICourseScheduleImportService _courseScheduleImportService;

        public CourseScheduleController(
            ICourseScheduleService courseScheduleService,
            ICourseScheduleImportService courseScheduleImportService)
        {
            _courseScheduleService = courseScheduleService;
            _courseScheduleImportService = courseScheduleImportService;
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
        [Route("DeleteAll/{semesterName}")]
        public bool DeleteAll(string semesterName)
        {
            _courseScheduleService.DeleteBySemesterName(semesterName);
            return true;
        }

        [HttpPost]
        [Route("ImportCourseSchedule")]
        public IActionResult ImportFromExcel(IFormFile file, [FromForm] string semester)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Vui lòng chọn file Excel.");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".xlsx")
                return BadRequest("Chỉ hỗ trợ file .xlsx");

            using var stream = file.OpenReadStream();
            var imported = _courseScheduleImportService.ImportFromExcel(stream, semester ?? "");

            return Ok(new { count = imported.Count, data = imported });
        }
    }
}
