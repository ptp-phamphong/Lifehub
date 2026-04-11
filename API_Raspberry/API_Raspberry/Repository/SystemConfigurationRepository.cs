using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface ISystemConfigurationRepository
    {
        List<SystemConfiguration> GetAll();
        SystemConfiguration GetById(int id);
        void Add(SystemConfigurationCreateDto dto);
        void Update(int id, SystemConfigurationUpdateDto dto);
        void Delete(int id);
    }

    public class SystemConfigurationRepository : ISystemConfigurationRepository
    {
        private readonly AppDbContext _context;
        private readonly ISystemConfigurationMapper _systemConfigurationMapper;

        public SystemConfigurationRepository(AppDbContext context, ISystemConfigurationMapper systemConfigurationMapper)
        {
            _context = context;
            _systemConfigurationMapper = systemConfigurationMapper;
        }

        public List<SystemConfiguration> GetAll()
        {
            return _context.SystemConfigurations
                .OrderByDescending(s => s.Id)
                .ToList();
        }

        public SystemConfiguration GetById(int id)
        {
            return _context.SystemConfigurations.FirstOrDefault(s => s.Id == id);
        }

        public void Add(SystemConfigurationCreateDto dto)
        {
            var entity = _systemConfigurationMapper.ToEntity(dto);
            _context.SystemConfigurations.Add(entity);
            _context.SaveChanges();
        }

        public void Update(int id, SystemConfigurationUpdateDto dto)
        {
            var existing = _context.SystemConfigurations.Find(id);
            if (existing != null)
            {
                _systemConfigurationMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }

        public void Delete(int id)
        {
            var existing = _context.SystemConfigurations.Find(id);
            if (existing != null)
            {
                _context.SystemConfigurations.Remove(existing);
                _context.SaveChanges();
            }
        }
    }
}
