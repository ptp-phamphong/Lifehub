using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IReasonTypeRepository
    {
        List<ReasonType> GetAllReasonType();
        void AddReasonType(ReasonTypeCreateDto dto);
        ReasonType GetReasonTypeById(int id);
        void UpdateReasonType(int id, ReasonTypeUpdateDto dto);
    }

    public class ReasonTypeRepository : IReasonTypeRepository
    {
        private readonly AppDbContext _context;
        private readonly IReasonTypeMapper _reasonTypeMapper;

        public ReasonTypeRepository(AppDbContext context, IReasonTypeMapper reasonTypeMapper)
        {
            _context = context;
            _reasonTypeMapper = reasonTypeMapper;
        }

        public List<ReasonType> GetAllReasonType()
        {
            return _context.ReasonTypes
                .OrderBy(r => r.SortOrder)
                .ToList();
        }

        public void AddReasonType(ReasonTypeCreateDto dto)
        {
            var entity = _reasonTypeMapper.ToEntity(dto);
            _context.ReasonTypes.Add(entity);
            _context.SaveChanges();
        }

        public ReasonType GetReasonTypeById(int id)
        {
            return _context.ReasonTypes.FirstOrDefault(r => r.Id == id);
        }

        public void UpdateReasonType(int id, ReasonTypeUpdateDto dto)
        {
            var existing = _context.ReasonTypes.Find(id);
            if (existing != null)
            {
                _reasonTypeMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }
    }
}
