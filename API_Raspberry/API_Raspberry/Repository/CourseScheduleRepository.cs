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
