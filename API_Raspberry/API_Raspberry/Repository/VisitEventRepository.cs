using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Repository
{
    /// <summary>Một trang dữ liệu thô kèm tổng số dòng khớp filter.</summary>
    public class VisitEventPage
    {
        public List<VisitEvent> Items { get; set; } = new List<VisitEvent>();
        public int TotalCount { get; set; }
    }

    public interface IVisitEventRepository
    {
        int Add(VisitEvent entity);
        void UpdateDuration(int id, int durationMs);
        VisitEventPage GetPaged(VisitorLogFilter filter, List<string> selfIps, List<string> selfVisitorIds);
        List<VisitEvent> GetForAnalytics(VisitorLogFilter filter, List<string> selfIps, List<string> selfVisitorIds);
        List<VisitEvent> GetPageViewsForDate(DateTime date, List<string> selfIps, List<string> selfVisitorIds);
        DateTime? GetOldestVisitDate();
        int PurgeOlderThan(DateTime cutoffUtc);
    }

    public class VisitEventRepository : IVisitEventRepository
    {
        private readonly AppDbContext _context;

        public VisitEventRepository(AppDbContext context)
        {
            _context = context;
        }

        public int Add(VisitEvent entity)
        {
            _context.VisitEvents.Add(entity);
            _context.SaveChanges();
            return entity.Id;
        }

        public void UpdateDuration(int id, int durationMs)
        {
            var existing = _context.VisitEvents.Find(id);
            if (existing != null)
            {
                existing.DurationMs = durationMs;
                _context.SaveChanges();
            }
        }

        public VisitEventPage GetPaged(VisitorLogFilter filter, List<string> selfIps, List<string> selfVisitorIds)
        {
            var query = BuildQuery(filter, selfIps, selfVisitorIds);

            var totalCount = query.Count();

            var page = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = filter.PageSize < 1 ? 50 : filter.PageSize;
            if (pageSize > 200) pageSize = 200; // chặn client xin cả bảng về

            var items = ApplySort(query, filter.SortColumn, filter.SortDirection)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .AsNoTracking()
                .ToList();

            return new VisitEventPage
            {
                Items = items,
                TotalCount = totalCount
            };
        }

        public List<VisitEvent> GetForAnalytics(VisitorLogFilter filter, List<string> selfIps, List<string> selfVisitorIds)
        {
            return BuildQuery(filter, selfIps, selfVisitorIds)
                .AsNoTracking()
                .ToList();
        }

        public List<VisitEvent> GetPageViewsForDate(DateTime date, List<string> selfIps, List<string> selfVisitorIds)
        {
            var from = date.Date;
            var to = from.AddDays(1);

            var query = _context.VisitEvents
                .Where(e => e.VisitedAt >= from && e.VisitedAt < to)
                .Where(e => e.EventType == (int)VisitEventType.PageView)
                .Where(e => !e.IsBot);

            query = ApplySelfExclusion(query, selfIps, selfVisitorIds);

            return query.AsNoTracking().ToList();
        }

        public DateTime? GetOldestVisitDate()
        {
            if (!_context.VisitEvents.Any()) return null;
            return _context.VisitEvents.Min(e => e.VisitedAt);
        }

        public int PurgeOlderThan(DateTime cutoffUtc)
        {
            // ExecuteDelete chạy thẳng một câu DELETE, không nạp entity vào memory.
            return _context.VisitEvents
                .Where(e => e.VisitedAt < cutoffUtc)
                .ExecuteDelete();
        }

        private IQueryable<VisitEvent> BuildQuery(VisitorLogFilter filter, List<string> selfIps, List<string> selfVisitorIds)
        {
            IQueryable<VisitEvent> query = _context.VisitEvents.AsQueryable();

            if (filter.FromDate.HasValue)
            {
                var from = filter.FromDate.Value.Date;
                query = query.Where(e => e.VisitedAt >= from);
            }

            if (filter.ToDate.HasValue)
            {
                // ToDate là ngày cuối (inclusive) -> so tới hết ngày đó.
                var to = filter.ToDate.Value.Date.AddDays(1);
                query = query.Where(e => e.VisitedAt < to);
            }

            if (filter.Area.HasValue)
                query = query.Where(e => e.Area == filter.Area.Value);

            if (filter.EventType.HasValue)
                query = query.Where(e => e.EventType == filter.EventType.Value);

            if (!string.IsNullOrWhiteSpace(filter.PathContains))
            {
                var term = filter.PathContains.Trim();
                query = query.Where(e => e.Path.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(filter.IpAddress))
            {
                var ip = filter.IpAddress.Trim();
                query = query.Where(e => e.IpAddress == ip);
            }

            if (!string.IsNullOrWhiteSpace(filter.VisitorId))
            {
                var visitorId = filter.VisitorId.Trim();
                query = query.Where(e => e.VisitorId == visitorId);
            }

            if (!string.IsNullOrWhiteSpace(filter.CountryCode))
            {
                var country = filter.CountryCode.Trim();
                query = query.Where(e => e.CountryCode == country);
            }

            if (filter.ExcludeBots)
            {
                // Chỉ ẩn bot ở lượt xem trang. Sự kiện đăng nhập thì KHÔNG bao giờ ẩn:
                // một lần dò mật khẩu bằng curl/script luôn bị đánh dấu IsBot, mà đó lại
                // đúng là thứ cần nhìn thấy nhất.
                query = query.Where(e => !e.IsBot || e.EventType != (int)VisitEventType.PageView);
            }

            if (filter.ExcludeSelf)
                query = ApplySelfExclusion(query, selfIps, selfVisitorIds);

            return query;
        }

        /// <summary>
        /// Loại traffic của mình. Lưu ý NULL: trong SQL, "NULL NOT IN ('x')" cho ra NULL (=false),
        /// nên nếu không kiểm tra null trước thì các dòng có VisitorId/IpAddress null
        /// (ví dụ login thất bại từ script) sẽ bị loại nhầm.
        /// </summary>
        private IQueryable<VisitEvent> ApplySelfExclusion(IQueryable<VisitEvent> query, List<string> selfIps, List<string> selfVisitorIds)
        {
            if (selfIps != null && selfIps.Any())
                query = query.Where(e => e.IpAddress == null || !selfIps.Contains(e.IpAddress));

            if (selfVisitorIds != null && selfVisitorIds.Any())
                query = query.Where(e => e.VisitorId == null || !selfVisitorIds.Contains(e.VisitorId));

            return query;
        }

        private IQueryable<VisitEvent> ApplySort(IQueryable<VisitEvent> query, string sortColumn, string sortDirection)
        {
            var desc = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            var column = (sortColumn ?? "visitedAt").ToLowerInvariant();

            // Whitelist: không bao giờ ghép chuỗi cột từ input người dùng vào query.
            switch (column)
            {
                case "path":
                    return desc ? query.OrderByDescending(e => e.Path) : query.OrderBy(e => e.Path);
                case "ipaddress":
                    return desc ? query.OrderByDescending(e => e.IpAddress) : query.OrderBy(e => e.IpAddress);
                case "countrycode":
                    return desc ? query.OrderByDescending(e => e.CountryCode) : query.OrderBy(e => e.CountryCode);
                case "browser":
                    return desc ? query.OrderByDescending(e => e.Browser) : query.OrderBy(e => e.Browser);
                case "devicetype":
                    return desc ? query.OrderByDescending(e => e.DeviceType) : query.OrderBy(e => e.DeviceType);
                case "referrerdomain":
                    return desc ? query.OrderByDescending(e => e.ReferrerDomain) : query.OrderBy(e => e.ReferrerDomain);
                case "durationms":
                    return desc ? query.OrderByDescending(e => e.DurationMs) : query.OrderBy(e => e.DurationMs);
                case "visitedat":
                default:
                    // ThenBy Id để phân trang ổn định khi nhiều dòng trùng thời điểm.
                    return desc
                        ? query.OrderByDescending(e => e.VisitedAt).ThenByDescending(e => e.Id)
                        : query.OrderBy(e => e.VisitedAt).ThenBy(e => e.Id);
            }
        }
    }
}
