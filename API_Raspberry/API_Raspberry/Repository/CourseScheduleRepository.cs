using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Repository
{
    public interface ICourseScheduleRepository
    {
        List<CourseSchedule> GetAll();
        CourseSchedule GetById(int id);
        void Add(CourseScheduleCreateDto dto);
        void AddRange(List<CourseScheduleCreateDto> dtos);
        void Update(int id, CourseScheduleUpdateDto dto);
        List<CourseSchedule> GetByMonth(int month, int year);
        List<CourseSchedule> GetByWeek(DateTime anyDateInWeek);
        void Delete(int id);
        void DeleteBySemesterMetadataId(int semesterMetadataId);
    }

    public class CourseScheduleRepository : ICourseScheduleRepository
    {
        private readonly AppDbContext _context;
        private readonly ICourseScheduleMapper _courseScheduleMapper;

        public CourseScheduleRepository(AppDbContext context, ICourseScheduleMapper courseScheduleMapper)
        {
            _context = context;
            _courseScheduleMapper = courseScheduleMapper;
        }

        public List<CourseSchedule> GetAll()
        {
            return _context.CourseSchedules
                .Include(c => c.SemesterMetadata)
                .OrderByDescending(c => c.Id)
                .ToList();
        }

        public CourseSchedule GetById(int id)
        {
            return _context.CourseSchedules
                .Include(c => c.SemesterMetadata)
                .FirstOrDefault(c => c.Id == id);
        }

        public void Add(CourseScheduleCreateDto dto)
        {
            var entity = _courseScheduleMapper.ToEntity(dto);
            entity.CreatedDate = DateTime.Now;
            _context.CourseSchedules.Add(entity);
            _context.SaveChanges();
        }

        public void AddRange(List<CourseScheduleCreateDto> dtos)
        {
            var entities = dtos.Select(dto =>
            {
                var entity = _courseScheduleMapper.ToEntity(dto);
                entity.CreatedDate = DateTime.Now;
                return entity;
            }).ToList();

            _context.CourseSchedules.AddRange(entities);
            _context.SaveChanges();
        }

        public void Update(int id, CourseScheduleUpdateDto dto)
        {
            var existing = _context.CourseSchedules.Find(id);
            if (existing != null)
            {
                _courseScheduleMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }

        public List<CourseSchedule> GetByMonth(int month, int year)
        {
            var startOfMonth = new DateTime(year, month, 1);
            var endOfMonth = new DateTime(year, month, DateTime.DaysInMonth(year, month));

            return _context.CourseSchedules
                .Include(c => c.SemesterMetadata)
                .Where(c => c.StartDate.HasValue && c.EndDate.HasValue
                         && c.StartDate.Value <= endOfMonth
                         && c.EndDate.Value >= startOfMonth)
                .OrderBy(c => c.StartTime)
                .ToList();
        }

        /// <summary>
        /// Lấy các buổi học trong tuần chứa ngày truyền vào (tuần bắt đầu từ thứ Hai).
        ///
        /// Lọc theo khoảng SessionDate chứ không theo (năm, tuần ISO): tuần ISO không unique —
        /// tuần 1 của năm học 2026 bắt đầu từ 29/12/2025 — nên so khớp theo năm sẽ hụt đúng
        /// những tuần vắt qua giao thừa. SessionDate mới là sự thật.
        /// </summary>
        public List<CourseSchedule> GetByWeek(DateTime anyDateInWeek)
        {
            var date = anyDateInWeek.Date;
            var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7;
            var startOfWeek = date.AddDays(-daysSinceMonday);
            var endOfWeek = startOfWeek.AddDays(6);

            return _context.CourseSchedules
                .Include(c => c.SemesterMetadata)
                .Where(c =>
                    // Buổi học import theo tuần từ UEH: có ngày cụ thể.
                    (c.SessionDate.HasValue
                        && c.SessionDate.Value >= startOfWeek
                        && c.SessionDate.Value <= endOfWeek)
                    // Bản ghi cũ (import Excel / thêm tay) không có SessionDate mà chỉ có khoảng
                    // ngày lặp — vẫn phải trả về, nếu không chúng biến mất khỏi lịch tuần.
                    // Việc khớp DayOfWeek để lớp hiển thị làm, như nó vẫn đang làm với lịch tháng.
                    || (!c.SessionDate.HasValue
                        && c.StartDate.HasValue && c.EndDate.HasValue
                        && c.StartDate.Value <= endOfWeek
                        && c.EndDate.Value >= startOfWeek))
                .OrderBy(c => c.SessionDate)
                .ThenBy(c => c.StartPeriod)
                .ThenBy(c => c.StartTime)
                .ToList();
        }

        public void Delete(int id)
        {
            var existing = _context.CourseSchedules.Find(id);
            if (existing != null)
            {
                _context.CourseSchedules.Remove(existing);
                _context.SaveChanges();
            }
        }

        public void DeleteBySemesterMetadataId(int semesterMetadataId)
        {
            var existings = _context.CourseSchedules.Where(c => c.SemesterMetadataId == semesterMetadataId);
            if (existings != null && existings.Count() > 0)
            {
                _context.CourseSchedules.RemoveRange(existings);
                _context.SaveChanges();
            }
        }
    }
}
