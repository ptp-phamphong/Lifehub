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
                SemesterMetadataId = entity.SemesterMetadataId,
                SemesterName = entity.SemesterMetadata?.SemesterName,
                SemesterYear = entity.SemesterMetadata?.Year,
                DayOfWeek = entity.DayOfWeek,
                SessionDate = entity.SessionDate,
                WeekOfYear = entity.WeekOfYear,
                DisplayWeek = entity.DisplayWeek,
                StartPeriod = entity.StartPeriod,
                EndPeriod = entity.EndPeriod,
                ClassCode = entity.ClassCode,
                Lecturer = entity.Lecturer,
                LecturerEmail = entity.LecturerEmail,
                LearningMode = entity.LearningMode,
                Language = entity.Language,
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
                SemesterMetadataId = dto.SemesterMetadataId,
                DayOfWeek = dto.DayOfWeek,
                SessionDate = dto.SessionDate,
                WeekOfYear = dto.WeekOfYear,
                DisplayWeek = dto.DisplayWeek,
                StartPeriod = dto.StartPeriod,
                EndPeriod = dto.EndPeriod,
                ClassCode = dto.ClassCode,
                Lecturer = dto.Lecturer,
                LecturerEmail = dto.LecturerEmail,
                LearningMode = dto.LearningMode,
                Language = dto.Language,
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
            entity.SemesterMetadataId = dto.SemesterMetadataId;
            entity.DayOfWeek = dto.DayOfWeek;
            entity.SessionDate = dto.SessionDate;
            entity.WeekOfYear = dto.WeekOfYear;
            entity.DisplayWeek = dto.DisplayWeek;
            entity.StartPeriod = dto.StartPeriod;
            entity.EndPeriod = dto.EndPeriod;
            entity.ClassCode = dto.ClassCode;
            entity.Lecturer = dto.Lecturer;
            entity.LecturerEmail = dto.LecturerEmail;
            entity.LearningMode = dto.LearningMode;
            entity.Language = dto.Language;
        }
    }
}
