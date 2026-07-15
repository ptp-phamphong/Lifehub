using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IVisitorKnownIpRepository
    {
        List<VisitorKnownIp> GetAll();
        List<VisitorKnownIp> GetAllSelf();
        VisitorKnownIp GetById(int id);
        VisitorKnownIp GetByIp(string ipAddress);
        void Add(VisitorKnownIpCreateDto dto);
        void Update(int id, VisitorKnownIpUpdateDto dto);
        void Delete(int id);
        /// <summary>Thêm IP nếu chưa có. Dùng khi login thành công để tự đánh dấu IP của mình.</summary>
        void UpsertSelfIp(string ipAddress, string label);
    }

    public class VisitorKnownIpRepository : IVisitorKnownIpRepository
    {
        private readonly AppDbContext _context;
        private readonly IVisitorKnownIpMapper _visitorKnownIpMapper;

        public VisitorKnownIpRepository(AppDbContext context, IVisitorKnownIpMapper visitorKnownIpMapper)
        {
            _context = context;
            _visitorKnownIpMapper = visitorKnownIpMapper;
        }

        public List<VisitorKnownIp> GetAll()
        {
            return _context.VisitorKnownIps
                .OrderByDescending(k => k.Id)
                .ToList();
        }

        public List<VisitorKnownIp> GetAllSelf()
        {
            return _context.VisitorKnownIps
                .Where(k => k.IsSelf)
                .ToList();
        }

        public VisitorKnownIp GetById(int id)
        {
            return _context.VisitorKnownIps.FirstOrDefault(k => k.Id == id);
        }

        public VisitorKnownIp GetByIp(string ipAddress)
        {
            return _context.VisitorKnownIps.FirstOrDefault(k => k.IpAddress == ipAddress);
        }

        public void Add(VisitorKnownIpCreateDto dto)
        {
            var entity = _visitorKnownIpMapper.ToEntity(dto);
            _context.VisitorKnownIps.Add(entity);
            _context.SaveChanges();
        }

        public void Update(int id, VisitorKnownIpUpdateDto dto)
        {
            var existing = _context.VisitorKnownIps.Find(id);
            if (existing != null)
            {
                _visitorKnownIpMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }

        public void Delete(int id)
        {
            var existing = _context.VisitorKnownIps.Find(id);
            if (existing != null)
            {
                _context.VisitorKnownIps.Remove(existing);
                _context.SaveChanges();
            }
        }

        public void UpsertSelfIp(string ipAddress, string label)
        {
            if (string.IsNullOrWhiteSpace(ipAddress)) return;

            var existing = _context.VisitorKnownIps.FirstOrDefault(k => k.IpAddress == ipAddress);

            if (existing == null)
            {
                _context.VisitorKnownIps.Add(new VisitorKnownIp
                {
                    IpAddress = ipAddress,
                    Label = label,
                    IsSelf = true,
                    CreatedDate = DateTime.UtcNow
                });
                _context.SaveChanges();
                return;
            }

            // IP đã có nhưng đang bị đánh dấu "không phải mình" -> đăng nhập thành công
            // là bằng chứng đủ mạnh để bật lại cờ IsSelf.
            if (!existing.IsSelf)
            {
                existing.IsSelf = true;
                existing.Label = label;
                _context.SaveChanges();
            }
        }
    }
}
