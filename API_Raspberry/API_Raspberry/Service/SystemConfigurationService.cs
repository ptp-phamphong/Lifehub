using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface ISystemConfigurationService
    {
        List<SystemConfigurationDto> GetAll();
        SystemConfigurationDto GetById(int id);
        void Add(SystemConfigurationCreateDto dto);
        void Update(int id, SystemConfigurationUpdateDto dto);
        void Delete(int id);
    }

    public class SystemConfigurationService : ISystemConfigurationService
    {
        private readonly ISystemConfigurationRepository _systemConfigurationRepository;
        private readonly ISystemConfigurationMapper _systemConfigurationMapper;

        public SystemConfigurationService(
            ISystemConfigurationRepository systemConfigurationRepository,
            ISystemConfigurationMapper systemConfigurationMapper)
        {
            _systemConfigurationRepository = systemConfigurationRepository;
            _systemConfigurationMapper = systemConfigurationMapper;
        }

        public List<SystemConfigurationDto> GetAll()
        {
            var entities = _systemConfigurationRepository.GetAll();
            return _systemConfigurationMapper.ToDtoList(entities);
        }

        public SystemConfigurationDto GetById(int id)
        {
            var entity = _systemConfigurationRepository.GetById(id);
            return _systemConfigurationMapper.ToDto(entity);
        }

        public void Add(SystemConfigurationCreateDto dto)
        {
            _systemConfigurationRepository.Add(dto);
        }

        public void Update(int id, SystemConfigurationUpdateDto dto)
        {
            _systemConfigurationRepository.Update(id, dto);
        }

        public void Delete(int id)
        {
            _systemConfigurationRepository.Delete(id);
        }
    }
}
