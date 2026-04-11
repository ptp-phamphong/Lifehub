using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface ISystemConfigurationMapper
    {
        SystemConfigurationDto ToDto(SystemConfiguration entity);
        List<SystemConfigurationDto> ToDtoList(List<SystemConfiguration> entities);
        SystemConfiguration ToEntity(SystemConfigurationCreateDto dto);
        void UpdateEntity(SystemConfiguration entity, SystemConfigurationUpdateDto dto);
    }

    public class SystemConfigurationMapper : ISystemConfigurationMapper
    {
        public SystemConfigurationDto ToDto(SystemConfiguration entity)
        {
            if (entity == null) return null;

            return new SystemConfigurationDto
            {
                Id = entity.Id,
                KeyConfig = entity.KeyConfig,
                ValueConfig = entity.ValueConfig
            };
        }

        public List<SystemConfigurationDto> ToDtoList(List<SystemConfiguration> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public SystemConfiguration ToEntity(SystemConfigurationCreateDto dto)
        {
            return new SystemConfiguration
            {
                KeyConfig = dto.KeyConfig,
                ValueConfig = dto.ValueConfig
            };
        }

        public void UpdateEntity(SystemConfiguration entity, SystemConfigurationUpdateDto dto)
        {
            entity.KeyConfig = dto.KeyConfig;
            entity.ValueConfig = dto.ValueConfig;
        }
    }
}
