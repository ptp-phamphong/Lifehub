using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface ICourseScheduleService
    {
        List<CourseScheduleDto> GetAll();
        CourseScheduleDto GetById(int id);
        void Add(CourseScheduleCreateDto dto);
        void Update(int id, CourseScheduleUpdateDto dto);
        List<CourseScheduleDto> GetByMonth(int month, int year);
        void Delete(int id);
        void DeleteBySemesterMetadataId(int semesterMetadataId);

    }

    public class CourseScheduleService : ICourseScheduleService
    {
        private readonly ICourseScheduleRepository _courseScheduleRepository;
        private readonly ICourseScheduleMapper _courseScheduleMapper;

        public CourseScheduleService(ICourseScheduleRepository courseScheduleRepository, ICourseScheduleMapper courseScheduleMapper)
        {
            _courseScheduleRepository = courseScheduleRepository;
            _courseScheduleMapper = courseScheduleMapper;
        }

        public List<CourseScheduleDto> GetAll()
        {
            var entities = _courseScheduleRepository.GetAll();
            return _courseScheduleMapper.ToDtoList(entities);
        }

        public CourseScheduleDto GetById(int id)
        {
            var entity = _courseScheduleRepository.GetById(id);
            return _courseScheduleMapper.ToDto(entity);
        }

        public void Add(CourseScheduleCreateDto dto)
        {
            _courseScheduleRepository.Add(dto);
        }

        public void Update(int id, CourseScheduleUpdateDto dto)
        {
            _courseScheduleRepository.Update(id, dto);
        }

        public List<CourseScheduleDto> GetByMonth(int month, int year)
        {
            var entities = _courseScheduleRepository.GetByMonth(month, year);
            return _courseScheduleMapper.ToDtoList(entities);
        }

        public void Delete(int id)
        {
            _courseScheduleRepository.Delete(id);
        }

        public void DeleteBySemesterMetadataId(int semesterMetadataId)
        {
            _courseScheduleRepository.DeleteBySemesterMetadataId(semesterMetadataId);
        }
    }
}
