using API_Raspberry.Data;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IUehPortalSessionRepository
    {
        /// <summary>Dòng duy nhất (Id = 1), hoặc null khi chưa extension nào gửi phiên.</summary>
        UehPortalSession Get();

        /// <summary>Thêm dòng nếu chưa có, ngược lại lưu thay đổi của entity đang được track.</summary>
        void Save(UehPortalSession entity);
    }

    public class UehPortalSessionRepository : IUehPortalSessionRepository
    {
        private readonly AppDbContext _context;

        public UehPortalSessionRepository(AppDbContext context)
        {
            _context = context;
        }

        public UehPortalSession Get()
        {
            return _context.UehPortalSessions.FirstOrDefault(x => x.Id == UehPortalSession.SingletonId);
        }

        public void Save(UehPortalSession entity)
        {
            entity.Id = UehPortalSession.SingletonId;
            if (_context.Entry(entity).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            {
                _context.UehPortalSessions.Add(entity);
            }
            _context.SaveChanges();
        }
    }
}
