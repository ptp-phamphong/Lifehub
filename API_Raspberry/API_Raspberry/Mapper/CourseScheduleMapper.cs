using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface ICourseScheduleMapper
    {
        CourseScheduleDto ToDto(CourseSchedule entity);
        List<CourseScheduleDto> ToDtoList(List<CourseSchedule> entities);
        CourseSchedule ToEntity(CourseScheduleCreateDto dto);
        void UpdateEntity(CourseSchedule entity, CourseScheduleUpdateDto dto);
    }

    public class CourseScheduleMapper : ICourseScheduleMapper
    {
        public CourseScheduleDto ToDto(CourseSchedule entity)
        {
            if (entity == null) return null;

            return new CourseScheduleDto
            {
                Id = entity.Id,
                CourseName = entity.CourseName,
                CourseCode = entity.CourseCode,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Room = entity.Room,
                Address = entity.Address,
                Semester = entity.Semester,
                DayOfWeek = entity.DayOfWeek,
                CreatedDate = entity.CreatedDate,
            };
        }

        public List<CourseScheduleDto> ToDtoList(List<CourseSchedule> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public CourseSchedule ToEntity(CourseScheduleCreateDto dto)
        {
            return new CourseSchedule
            {
                CourseName = dto.CourseName,
                CourseCode = dto.CourseCode,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Room = dto.Room,
                Address = dto.Address,
                Semester = dto.Semester,
                DayOfWeek = dto.DayOfWeek,
            };
        }

        public void UpdateEntity(CourseSchedule entity, CourseScheduleUpdateDto dto)
        {
            entity.CourseName = dto.CourseName;
            entity.CourseCode = dto.CourseCode;
            entity.StartDate = dto.StartDate;
            entity.EndDate = dto.EndDate;
            entity.StartTime = dto.StartTime;
            entity.EndTime = dto.EndTime;
            entity.Room = dto.Room;
            entity.Address = dto.Address;
            entity.Semester = dto.Semester;
            entity.DayOfWeek = dto.DayOfWeek;
        }
    }
}
