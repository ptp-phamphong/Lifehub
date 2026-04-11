using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface ISemesterMetadataService
    {
        List<SemesterMetadataDto> GetAll();
        SemesterMetadataDto GetById(int id);
        void Add(SemesterMetadataCreateDto dto);
        void Update(int id, SemesterMetadataUpdateDto dto);
        void Delete(int id);
    }

    public class SemesterMetadataService : ISemesterMetadataService
    {
        private readonly ISemesterMetadataRepository _semesterMetadataRepository;
        private readonly ISemesterMetadataMapper _semesterMetadataMapper;

        public SemesterMetadataService(
            ISemesterMetadataRepository semesterMetadataRepository,
            ISemesterMetadataMapper semesterMetadataMapper)
        {
            _semesterMetadataRepository = semesterMetadataRepository;
            _semesterMetadataMapper = semesterMetadataMapper;
        }

        public List<SemesterMetadataDto> GetAll()
        {
            var entities = _semesterMetadataRepository.GetAll();
            return _semesterMetadataMapper.ToDtoList(entities);
        }

        public SemesterMetadataDto GetById(int id)
        {
            var entity = _semesterMetadataRepository.GetById(id);
            return _semesterMetadataMapper.ToDto(entity);
        }

        public void Add(SemesterMetadataCreateDto dto)
        {
            _semesterMetadataRepository.Add(dto);
        }

        public void Update(int id, SemesterMetadataUpdateDto dto)
        {
            _semesterMetadataRepository.Update(id, dto);
        }

        public void Delete(int id)
        {
            _semesterMetadataRepository.Delete(id);
        }
    }
}
