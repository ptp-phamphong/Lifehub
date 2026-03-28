using API_Raspberry.Data;
using API_Raspberry.Mapper;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IPhoneNotificationRepository
    {
        int Add(PhoneNotification entity);
        List<PhoneNotification> GetAll(string sortBy, string sortDirection);
        void DeleteById(int id);
        void DeleteAll();
    }

    public class PhoneNotificationRepository : IPhoneNotificationRepository
    {
        private readonly AppDbContext _context;

        public PhoneNotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public int Add(PhoneNotification entity)
        {
            _context.PhoneNotifications.Add(entity);
            _context.SaveChanges();
            return entity.Id;
        }

        public List<PhoneNotification> GetAll(string sortBy, string sortDirection)
        {
            IQueryable<PhoneNotification> query = _context.PhoneNotifications.AsQueryable();

            bool isDesc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

            query = (sortBy?.ToLower()) switch
            {
                "app" => isDesc
                    ? query.OrderByDescending(n => n.App).ThenByDescending(n => n.Id)
                    : query.OrderBy(n => n.App).ThenByDescending(n => n.Id),
                _ => isDesc
                    ? query.OrderByDescending(n => n.CreatedDate).ThenByDescending(n => n.Id)
                    : query.OrderBy(n => n.CreatedDate).ThenBy(n => n.Id),
            };

            return query.ToList();
        }

        public void DeleteById(int id)
        {
            var existing = _context.PhoneNotifications.Find(id);
            if (existing != null)
            {
                _context.PhoneNotifications.Remove(existing);
                _context.SaveChanges();
            }
        }

        public void DeleteAll()
        {
            var all = _context.PhoneNotifications.ToList();
            _context.PhoneNotifications.RemoveRange(all);
            _context.SaveChanges();
        }
    }
}
