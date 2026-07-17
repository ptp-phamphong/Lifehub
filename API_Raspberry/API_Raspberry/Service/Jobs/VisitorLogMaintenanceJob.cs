using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Thay cho VisitorLogMaintenanceService cũ (vòng while + Task.Delay).
    /// Dồn dữ liệu thô thành số liệu theo ngày và xóa dữ liệu thô quá hạn, nhờ vậy bảng visitEvent
    /// không phình mãi trên thẻ nhớ của Pi mà biểu đồ dài hạn vẫn còn.
    /// Hangfire tự tạo DI scope cho mỗi lần chạy nên không cần IServiceScopeFactory nữa.
    /// Số lần thử lại khai báo bằng [AutomaticRetry] trên IVisitorLogMaintenanceJob, không phải ở đây.
    /// </summary>
    public class VisitorLogMaintenanceJob : IVisitorLogMaintenanceJob
    {
        /// <summary>Dựng lại 7 ngày gần nhất mỗi lần chạy: nếu hôm nay mới đánh dấu một IP là "của mình"
        /// thì số liệu vài ngày trước cũng được tính lại cho đúng.</summary>
        private const int RebuildTrailingDays = 7;

        private const int MaxStatPathLength = 191;

        private readonly IVisitorLogSettingsService _settingsService;
        private readonly IVisitEventRepository _eventRepository;
        private readonly IVisitorKnownIpRepository _knownIpRepository;
        private readonly IVisitorDailyStatRepository _dailyStatRepository;
        private readonly ILogger<VisitorLogMaintenanceJob> _logger;

        public VisitorLogMaintenanceJob(
            IVisitorLogSettingsService settingsService,
            IVisitEventRepository eventRepository,
            IVisitorKnownIpRepository knownIpRepository,
            IVisitorDailyStatRepository dailyStatRepository,
            ILogger<VisitorLogMaintenanceJob> logger)
        {
            _settingsService = settingsService;
            _eventRepository = eventRepository;
            _knownIpRepository = knownIpRepository;
            _dailyStatRepository = dailyStatRepository;
            _logger = logger;
        }

        public Task RunAsync()
        {
            Run();
            return Task.CompletedTask;
        }

        private void Run()
        {
            var settings = _settingsService.Get();

            var known = _knownIpRepository.GetAllSelf();
            var selfIps = known.Where(k => !string.IsNullOrEmpty(k.IpAddress)).Select(k => k.IpAddress).Distinct().ToList();
            var selfVisitorIds = known.Where(k => !string.IsNullOrEmpty(k.VisitorId)).Select(k => k.VisitorId).Distinct().ToList();

            // 1) Dựng lại số liệu ngày cho các ngày gần đây.
            var today = DateTime.UtcNow.Date;
            for (var i = 0; i < RebuildTrailingDays; i++)
            {
                var date = today.AddDays(-i);
                var rows = BuildDailyStats(date, selfIps, selfVisitorIds);
                _dailyStatRepository.ReplaceForDate(date, rows);
            }

            // 2) Xóa dữ liệu thô quá hạn. Số liệu tổng hợp ở trên vẫn giữ lại lịch sử.
            if (settings.RetentionDays != int.MaxValue)
            {
                var cutoff = today.AddDays(-settings.RetentionDays);

                // Ngày sắp bị xóa cũng phải được tổng hợp trước, nếu không sẽ mất luôn.
                var oldest = _eventRepository.GetOldestVisitDate();
                if (oldest.HasValue)
                {
                    for (var date = oldest.Value.Date; date < cutoff; date = date.AddDays(1))
                    {
                        var rows = BuildDailyStats(date, selfIps, selfVisitorIds);
                        _dailyStatRepository.ReplaceForDate(date, rows);
                    }
                }

                var deleted = _eventRepository.PurgeOlderThan(cutoff);
                if (deleted > 0)
                    _logger.LogInformation("VisitorLogMaintenance: đã xóa {Count} dòng thô cũ hơn {Cutoff:yyyy-MM-dd}.", deleted, cutoff);
            }
        }

        /// <summary>
        /// Sinh các dòng tổng hợp cho một ngày.
        ///
        /// Quy ước quan trọng: dòng có Path = "*" và CountryCode = "*" là TỔNG CỦA CẢ NGÀY.
        /// Chỉ dòng đó mới có UniqueVisitors đúng - cộng UniqueVisitors của các dòng theo path
        /// sẽ đếm trùng một khách xem nhiều trang.
        /// </summary>
        private List<VisitorDailyStat> BuildDailyStats(
            DateTime date,
            List<string> selfIps,
            List<string> selfVisitorIds)
        {
            var events = _eventRepository.GetPageViewsForDate(date, selfIps, selfVisitorIds);
            var rows = new List<VisitorDailyStat>();

            if (!events.Any())
                return rows;

            foreach (var areaGroup in events.GroupBy(e => e.Area))
            {
                var areaEvents = areaGroup.ToList();

                // Dòng tổng của ngày.
                rows.Add(new VisitorDailyStat
                {
                    Date = date,
                    Area = areaGroup.Key,
                    Path = VisitorAnalyticsService.TotalMarker,
                    CountryCode = VisitorAnalyticsService.TotalMarker,
                    Views = areaEvents.Count,
                    UniqueVisitors = CountVisitors(areaEvents),
                    Sessions = CountSessions(areaEvents)
                });

                // Theo từng trang. Cắt còn 191 ký tự cho khớp giới hạn cột (nằm trong unique index).
                foreach (var pathGroup in areaEvents.GroupBy(e => TruncatePath(e.Path)))
                {
                    rows.Add(new VisitorDailyStat
                    {
                        Date = date,
                        Area = areaGroup.Key,
                        Path = pathGroup.Key,
                        CountryCode = VisitorAnalyticsService.TotalMarker,
                        Views = pathGroup.Count(),
                        UniqueVisitors = CountVisitors(pathGroup.ToList()),
                        Sessions = CountSessions(pathGroup.ToList())
                    });
                }

                // Theo từng quốc gia.
                foreach (var countryGroup in areaEvents.GroupBy(e => string.IsNullOrWhiteSpace(e.CountryCode) ? "??" : e.CountryCode))
                {
                    rows.Add(new VisitorDailyStat
                    {
                        Date = date,
                        Area = areaGroup.Key,
                        Path = VisitorAnalyticsService.TotalMarker,
                        CountryCode = countryGroup.Key,
                        Views = countryGroup.Count(),
                        UniqueVisitors = CountVisitors(countryGroup.ToList()),
                        Sessions = CountSessions(countryGroup.ToList())
                    });
                }
            }

            return rows;
        }

        private static string TruncatePath(string path)
        {
            if (string.IsNullOrEmpty(path)) return "/";
            return path.Length <= MaxStatPathLength ? path : path.Substring(0, MaxStatPathLength);
        }

        private static int CountVisitors(List<VisitEvent> events)
        {
            return events
                .Select(e => !string.IsNullOrEmpty(e.VisitorId) ? e.VisitorId : e.IpAddress)
                .Where(k => !string.IsNullOrEmpty(k))
                .Distinct()
                .Count();
        }

        private static int CountSessions(List<VisitEvent> events)
        {
            return events
                .Select(e => e.SessionId)
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .Count();
        }
    }
}
