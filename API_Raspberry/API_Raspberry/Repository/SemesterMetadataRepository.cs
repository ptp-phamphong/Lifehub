using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface ISemesterMetadataRepository
    {
        List<SemesterMetadata> GetAll();
        SemesterMetadata GetById(int id);
        void Add(SemesterMetadataCreateDto dto);
        void Update(int id, SemesterMetadataUpdateDto dto);
        void Delete(int id);
    }

    public class SemesterMetadataRepository : ISemesterMetadataRepository
    {
        private readonly AppDbContext _context;
        private readonly ISemesterMetadataMapper _semesterMetadataMapper;

        public SemesterMetadataRepository(AppDbContext context, ISemesterMetadataMapper semesterMetadataMapper)
        {
            _context = context;
            _semesterMetadataMapper = semesterMetadataMapper;
        }

        public List<SemesterMetadata> GetAll()
        {
            return _context.SemesterMetadatas
                .OrderByDescending(s => s.Id)
                .ToList();
        }

        public SemesterMetadata GetById(int id)
        {
            return _context.SemesterMetadatas.FirstOrDefault(s => s.Id == id);
        }

        public void Add(SemesterMetadataCreateDto dto)
        {
            var entity = _semesterMetadataMapper.ToEntity(dto);
            _context.SemesterMetadatas.Add(entity);
            _context.SaveChanges();
        }

        public void Update(int id, SemesterMetadataUpdateDto dto)
        {
            var existing = _context.SemesterMetadatas.Find(id);
            if (existing != null)
            {
                _semesterMetadataMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }

        public void Delete(int id)
        {
            var existing = _context.SemesterMetadatas.Find(id);
            if (existing != null)
            {
                _context.SemesterMetadatas.Remove(existing);
                _context.SaveChanges();
            }
        }
    }
}
