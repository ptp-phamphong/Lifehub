using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class CourseScheduleService
    {
        public List<CourseSchedule> GetAll()
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            return repo.GetAll();
        }

        public CourseSchedule GetById(int id)
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            return repo.GetById(id);
        }

        public void Add(CourseSchedule course)
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            repo.Add(course);
        }

        public void Update(int id, CourseSchedule course)
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            repo.Update(id, course);
        }

        public List<CourseSchedule> GetByMonth(int month, int year)
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            return repo.GetByMonth(month, year);
        }

        public void Delete(int id)
        {
            CourseScheduleRepository repo = new CourseScheduleRepository();
            repo.Delete(id);
        }
    }
}
