using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class CourseScheduleController : ControllerBase
    {
        public CourseScheduleController() { }

        [HttpGet]
        [Route("GetAllCourseSchedule")]
        public List<CourseSchedule> GetAll()
        {
            CourseScheduleService service = new CourseScheduleService();
            return service.GetAll();
        }

        [HttpGet]
        [Route("GetCourseScheduleById/{id}")]
        public CourseSchedule GetById(int id)
        {
            CourseScheduleService service = new CourseScheduleService();
            return service.GetById(id);
        }

        [HttpPost]
        [Route("AddCourseSchedule")]
        public bool Add([FromBody] CourseSchedule course)
        {
            CourseScheduleService service = new CourseScheduleService();
            service.Add(course);
            return true;
        }

        [HttpPut]
        [Route("UpdateCourseSchedule/{id}")]
        public bool Update(int id, [FromBody] CourseSchedule course)
        {
            CourseScheduleService service = new CourseScheduleService();
            service.Update(id, course);
            return true;
        }

        [HttpGet]
        [Route("GetCourseScheduleByMonth/{month}/{year}")]
        public List<CourseSchedule> GetByMonth(int month, int year)
        {
            CourseScheduleService service = new CourseScheduleService();
            return service.GetByMonth(month, year);
        }

        [HttpDelete]
        [Route("DeleteCourseSchedule/{id}")]
        public bool Delete(int id)
        {
            CourseScheduleService service = new CourseScheduleService();
            service.Delete(id);
            return true;
        }
    }
}
