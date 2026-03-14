using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface ISystemInfoMapper
    {
        SystemInfoDto ToDto(SystemInfo entity);
    }

    public class SystemInfoMapper : ISystemInfoMapper
    {
        public SystemInfoDto ToDto(SystemInfo entity)
        {
            if (entity == null) return null;

            return new SystemInfoDto
            {
                CpuTemperature = entity.CpuTemperature,
                RamAvailable = entity.RamAvailable,
                MemoryAvailable = entity.MemoryAvailable,
            };
        }
    }
}
