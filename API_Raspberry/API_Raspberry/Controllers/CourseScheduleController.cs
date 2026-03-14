using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class CourseScheduleController : ControllerBase
    {
        private readonly ICourseScheduleService _courseScheduleService;

        public CourseScheduleController(ICourseScheduleService courseScheduleService)
        {
            _courseScheduleService = courseScheduleService;
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
    }
}
