using API_Raspberry.Data;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface INotificationFilterRepository
    {
        List<NotificationFilter> GetAll();
        List<NotificationFilter> GetActiveByType(string filterType);
        NotificationFilter GetById(int id);
        int Add(NotificationFilter entity);
        void Update(NotificationFilter entity);
        void DeleteById(int id);
        bool Exists(string filterType, string filterValue);
        void SeedDefaults(List<NotificationFilter> defaults);
    }

    public class NotificationFilterRepository : INotificationFilterRepository
    {
        private readonly AppDbContext _context;

        public NotificationFilterRepository(AppDbContext context)
        {
            _context = context;
        }

        public List<NotificationFilter> GetAll()
        {
            return _context.NotificationFilters
                .OrderBy(f => f.FilterType)
                .ThenBy(f => f.FilterValue)
                .ToList();
        }

        public List<NotificationFilter> GetActiveByType(string filterType)
        {
            return _context.NotificationFilters
                .Where(f => f.FilterType == filterType && f.IsActive)
                .OrderBy(f => f.FilterValue)
                .ToList();
        }

        public NotificationFilter GetById(int id)
        {
            return _context.NotificationFilters.Find(id);
        }

        public int Add(NotificationFilter entity)
        {
            _context.NotificationFilters.Add(entity);
            _context.SaveChanges();
            return entity.Id;
        }

        public void Update(NotificationFilter entity)
        {
            _context.SaveChanges();
        }

        public void DeleteById(int id)
        {
            var existing = _context.NotificationFilters.Find(id);
            if (existing != null)
            {
                _context.NotificationFilters.Remove(existing);
                _context.SaveChanges();
            }
        }

        public bool Exists(string filterType, string filterValue)
        {
            return _context.NotificationFilters
                .Any(f => f.FilterType == filterType && f.FilterValue == filterValue);
        }

        public void SeedDefaults(List<NotificationFilter> defaults)
        {
            foreach (var filter in defaults)
            {
                if (!Exists(filter.FilterType, filter.FilterValue))
                {
                    _context.NotificationFilters.Add(filter);
                }
            }
            _context.SaveChanges();
        }
    }
}
