using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IVisitorAnalyticsService
    {
        PagedResult<VisitEventDto> GetPaged(VisitorLogFilter filter);
        VisitorSummaryDto GetSummary(VisitorLogFilter filter);
        List<VisitorProfileDto> GetVisitors(VisitorLogFilter filter);
        List<VisitorDailyPointDto> GetHistory();

        List<VisitorKnownIpDto> GetKnownIps();
        void AddKnownIp(VisitorKnownIpCreateDto dto);
        void UpdateKnownIp(int id, VisitorKnownIpUpdateDto dto);
        void DeleteKnownIp(int id);

        VisitorLogSettings GetSettings();
    }

    public class VisitorAnalyticsService : IVisitorAnalyticsService
    {
        /// <summary>Marker cho dòng tổng của cả ngày trong visitorDailyStat (xem VisitorLogMaintenanceService).</summary>
        public const string TotalMarker = "*";

        private const int TopListSize = 10;

        private readonly IVisitEventRepository _visitEventRepository;
        private readonly IVisitorKnownIpRepository _visitorKnownIpRepository;
        private readonly IVisitorDailyStatRepository _visitorDailyStatRepository;
        private readonly IVisitEventMapper _visitEventMapper;
        private readonly IVisitorKnownIpMapper _visitorKnownIpMapper;
        private readonly IVisitorLogSettingsService _visitorLogSettingsService;

        public VisitorAnalyticsService(
            IVisitEventRepository visitEventRepository,
            IVisitorKnownIpRepository visitorKnownIpRepository,
            IVisitorDailyStatRepository visitorDailyStatRepository,
            IVisitEventMapper visitEventMapper,
            IVisitorKnownIpMapper visitorKnownIpMapper,
            IVisitorLogSettingsService visitorLogSettingsService)
        {
            _visitEventRepository = visitEventRepository;
            _visitorKnownIpRepository = visitorKnownIpRepository;
            _visitorDailyStatRepository = visitorDailyStatRepository;
            _visitEventMapper = visitEventMapper;
            _visitorKnownIpMapper = visitorKnownIpMapper;
            _visitorLogSettingsService = visitorLogSettingsService;
        }

        public PagedResult<VisitEventDto> GetPaged(VisitorLogFilter filter)
        {
            filter ??= new VisitorLogFilter();

            var known = _visitorKnownIpRepository.GetAll();
            var selfIps = SelfIps(known);
            var selfVisitorIds = SelfVisitorIds(known);

            var page = _visitEventRepository.GetPaged(filter, selfIps, selfVisitorIds);
            var items = _visitEventMapper.ToDtoList(page.Items);

            // Gắn nhãn / cờ IsSelf sau khi map (tính lúc query, không lưu vào bảng visitEvent).
            foreach (var item in items)
            {
                var match = known.FirstOrDefault(k =>
                    (!string.IsNullOrEmpty(k.IpAddress) && k.IpAddress == item.IpAddress) ||
                    (!string.IsNullOrEmpty(k.VisitorId) && k.VisitorId == item.VisitorId));

                if (match != null)
                {
                    item.IsSelf = match.IsSelf;
                    item.KnownLabel = match.Label;
                }
            }

            var pageSize = page.Items.Count == 0 && filter.PageSize < 1 ? 50 : filter.PageSize;
            if (pageSize < 1) pageSize = 50;

            return new PagedResult<VisitEventDto>
            {
                Items = items,
                TotalCount = page.TotalCount,
                Page = filter.Page < 1 ? 1 : filter.Page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(page.TotalCount / (double)pageSize)
            };
        }

        public VisitorSummaryDto GetSummary(VisitorLogFilter filter)
        {
            filter ??= new VisitorLogFilter();

            var known = _visitorKnownIpRepository.GetAll();
            var events = _visitEventRepository.GetForAnalytics(filter, SelfIps(known), SelfVisitorIds(known));

            var summary = new VisitorSummaryDto();

            var pageViews = events.Where(e => e.EventType == (int)VisitEventType.PageView).ToList();

            summary.TotalViews = pageViews.Count;
            summary.LoginAttempts = events.Count(e => e.EventType == (int)VisitEventType.LoginSuccess
                                                   || e.EventType == (int)VisitEventType.LoginFailed);
            summary.FailedLogins = events.Count(e => e.EventType == (int)VisitEventType.LoginFailed);

            summary.UniqueVisitors = pageViews
                .Select(VisitorKey)
                .Where(k => k != null)
                .Distinct()
                .Count();

            summary.Sessions = pageViews
                .Select(e => e.SessionId)
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .Count();

            // "Quay lại" = khách có từ 2 phiên trở lên. Đây là con số trả lời câu hỏi
            // "có ai đọc portfolio nhiều lần không", nên nó tính theo phiên chứ không theo lượt xem.
            summary.ReturningVisitors = pageViews
                .Where(e => VisitorKey(e) != null && !string.IsNullOrEmpty(e.SessionId))
                .GroupBy(VisitorKey)
                .Count(g => g.Select(e => e.SessionId).Distinct().Count() > 1);

            var durations = pageViews.Where(e => e.DurationMs.HasValue && e.DurationMs.Value > 0)
                                     .Select(e => e.DurationMs.Value)
                                     .ToList();
            summary.AvgDurationSeconds = durations.Any()
                ? (int)Math.Round(durations.Average() / 1000d)
                : 0;

            summary.DailySeries = pageViews
                .GroupBy(e => e.VisitedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new VisitorDailyPointDto
                {
                    Date = g.Key,
                    Views = g.Count(),
                    Visitors = g.Select(VisitorKey).Where(k => k != null).Distinct().Count()
                })
                .ToList();

            summary.TopPages = TopBy(pageViews, e => e.Path);
            summary.TopReferrers = TopBy(pageViews, e => string.IsNullOrWhiteSpace(e.ReferrerDomain) ? "(direct)" : e.ReferrerDomain);
            summary.TopCountries = TopBy(pageViews, e => string.IsNullOrWhiteSpace(e.CountryName) ? "(unknown)" : e.CountryName);
            summary.TopDevices = TopBy(pageViews, e => string.IsNullOrWhiteSpace(e.DeviceType) ? "unknown" : e.DeviceType);
            summary.TopBrowsers = TopBy(pageViews, e => string.IsNullOrWhiteSpace(e.Browser) ? "(unknown)" : e.Browser);

            return summary;
        }

        public List<VisitorProfileDto> GetVisitors(VisitorLogFilter filter)
        {
            filter ??= new VisitorLogFilter();

            var known = _visitorKnownIpRepository.GetAll();
            var events = _visitEventRepository.GetForAnalytics(filter, SelfIps(known), SelfVisitorIds(known));

            var pageViews = events
                .Where(e => e.EventType == (int)VisitEventType.PageView)
                .Where(e => VisitorKey(e) != null)
                .ToList();

            var profiles = pageViews
                .GroupBy(VisitorKey)
                .Select(g =>
                {
                    var latest = g.OrderByDescending(e => e.VisitedAt).First();

                    var match = known.FirstOrDefault(k =>
                        (!string.IsNullOrEmpty(k.IpAddress) && k.IpAddress == latest.IpAddress) ||
                        (!string.IsNullOrEmpty(k.VisitorId) && k.VisitorId == latest.VisitorId));

                    return new VisitorProfileDto
                    {
                        VisitorId = latest.VisitorId,
                        IpAddress = latest.IpAddress,
                        FirstSeen = g.Min(e => e.VisitedAt),
                        LastSeen = g.Max(e => e.VisitedAt),
                        Views = g.Count(),
                        Sessions = g.Select(e => e.SessionId).Where(s => !string.IsNullOrEmpty(s)).Distinct().Count(),
                        DistinctPages = g.Select(e => e.Path).Distinct().Count(),
                        CountryCode = latest.CountryCode,
                        CountryName = latest.CountryName,
                        City = latest.City,
                        Browser = latest.Browser,
                        Os = latest.Os,
                        DeviceType = latest.DeviceType,
                        IsBot = latest.IsBot,
                        IsSelf = match?.IsSelf ?? false,
                        KnownLabel = match?.Label
                    };
                })
                .ToList();

            return SortProfiles(profiles, filter.SortColumn, filter.SortDirection);
        }

        /// <summary>
        /// Lịch sử dài hạn đọc từ bảng tổng hợp visitorDailyStat, nên vẫn còn số liệu
        /// kể cả khi dữ liệu thô đã bị xóa theo RetentionDays.
        /// Chỉ lấy dòng tổng của ngày (Path = "*", CountryCode = "*") - cộng dồn các dòng
        /// theo từng path sẽ đếm trùng khách.
        /// </summary>
        public List<VisitorDailyPointDto> GetHistory()
        {
            var stats = _visitorDailyStatRepository.GetBetween(DateTime.UtcNow.Date.AddYears(-5), DateTime.UtcNow.Date);

            return stats
                .Where(s => s.Path == TotalMarker
                         && s.CountryCode == TotalMarker
                         && s.Area == (int)VisitArea.Portfolio)
                .OrderBy(s => s.Date)
                .Select(s => new VisitorDailyPointDto
                {
                    Date = s.Date,
                    Views = s.Views,
                    Visitors = s.UniqueVisitors
                })
                .ToList();
        }

        public List<VisitorKnownIpDto> GetKnownIps()
        {
            return _visitorKnownIpMapper.ToDtoList(_visitorKnownIpRepository.GetAll());
        }

        public void AddKnownIp(VisitorKnownIpCreateDto dto)
        {
            if (dto == null) return;
            if (string.IsNullOrWhiteSpace(dto.IpAddress) && string.IsNullOrWhiteSpace(dto.VisitorId)) return;

            // Đánh dấu lại IP đã tồn tại thì cập nhật thay vì tạo dòng trùng.
            if (!string.IsNullOrWhiteSpace(dto.IpAddress))
            {
                var existing = _visitorKnownIpRepository.GetByIp(dto.IpAddress.Trim());
                if (existing != null)
                {
                    _visitorKnownIpRepository.Update(existing.Id, new VisitorKnownIpUpdateDto
                    {
                        Label = string.IsNullOrWhiteSpace(dto.Label) ? existing.Label : dto.Label,
                        IsSelf = dto.IsSelf
                    });
                    return;
                }
            }

            _visitorKnownIpRepository.Add(dto);
        }

        public void UpdateKnownIp(int id, VisitorKnownIpUpdateDto dto)
        {
            _visitorKnownIpRepository.Update(id, dto);
        }

        public void DeleteKnownIp(int id)
        {
            _visitorKnownIpRepository.Delete(id);
        }

        public VisitorLogSettings GetSettings()
        {
            return _visitorLogSettingsService.Get();
        }

        /// <summary>
        /// Khóa định danh khách: ưu tiên VisitorId (bền qua việc đổi IP),
        /// lùi về IP khi client chặn localStorage.
        /// </summary>
        private static string VisitorKey(VisitEvent e)
        {
            if (!string.IsNullOrEmpty(e.VisitorId)) return e.VisitorId;
            if (!string.IsNullOrEmpty(e.IpAddress)) return e.IpAddress;
            return null;
        }

        private static List<string> SelfIps(List<VisitorKnownIp> known)
        {
            return known.Where(k => k.IsSelf && !string.IsNullOrEmpty(k.IpAddress))
                        .Select(k => k.IpAddress)
                        .Distinct()
                        .ToList();
        }

        private static List<string> SelfVisitorIds(List<VisitorKnownIp> known)
        {
            return known.Where(k => k.IsSelf && !string.IsNullOrEmpty(k.VisitorId))
                        .Select(k => k.VisitorId)
                        .Distinct()
                        .ToList();
        }

        private static List<VisitorCountItemDto> TopBy(List<VisitEvent> events, Func<VisitEvent, string> selector)
        {
            return events
                .GroupBy(selector)
                .Select(g => new VisitorCountItemDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Label)
                .Take(TopListSize)
                .ToList();
        }

        private static List<VisitorProfileDto> SortProfiles(List<VisitorProfileDto> profiles, string sortColumn, string sortDirection)
        {
            var desc = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            var column = (sortColumn ?? "lastSeen").ToLowerInvariant();

            Func<VisitorProfileDto, object> key = column switch
            {
                "views" => p => p.Views,
                "sessions" => p => p.Sessions,
                "firstseen" => p => p.FirstSeen,
                "distinctpages" => p => p.DistinctPages,
                "countryname" => p => p.CountryName ?? string.Empty,
                "ipaddress" => p => p.IpAddress ?? string.Empty,
                _ => p => p.LastSeen
            };

            return desc
                ? profiles.OrderByDescending(key).ToList()
                : profiles.OrderBy(key).ToList();
        }
    }
}
