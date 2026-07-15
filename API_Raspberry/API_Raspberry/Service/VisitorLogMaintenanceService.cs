using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    /// <summary>
    /// Chạy nền: dồn dữ liệu thô thành số liệu theo ngày và xóa dữ liệu thô quá hạn.
    /// Nhờ vậy bảng visitEvent không phình mãi trên thẻ nhớ của Pi, mà biểu đồ dài hạn vẫn còn.
    /// </summary>
    public class VisitorLogMaintenanceService : BackgroundService
    {
        /// <summary>Dựng lại 7 ngày gần nhất mỗi lần chạy: nếu hôm nay mới đánh dấu một IP là "của mình"
        /// thì số liệu vài ngày trước cũng được tính lại cho đúng.</summary>
        private const int RebuildTrailingDays = 7;

        private const int IntervalHours = 6;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<VisitorLogMaintenanceService> _logger;

        public VisitorLogMaintenanceService(
            IServiceScopeFactory scopeFactory,
            ILogger<VisitorLogMaintenanceService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Đợi app khởi động xong (migration chạy trước) rồi mới đụng vào DB.
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    Run();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "VisitorLogMaintenance: lỗi khi chạy bảo trì.");
                }

                await Task.Delay(TimeSpan.FromHours(IntervalHours), stoppingToken);
            }
        }

        private void Run()
        {
            using var scope = _scopeFactory.CreateScope();

            var settingsService = scope.ServiceProvider.GetRequiredService<IVisitorLogSettingsService>();
            var eventRepository = scope.ServiceProvider.GetRequiredService<IVisitEventRepository>();
            var knownIpRepository = scope.ServiceProvider.GetRequiredService<IVisitorKnownIpRepository>();
            var dailyStatRepository = scope.ServiceProvider.GetRequiredService<IVisitorDailyStatRepository>();

            var settings = settingsService.Get();

            var known = knownIpRepository.GetAllSelf();
            var selfIps = known.Where(k => !string.IsNullOrEmpty(k.IpAddress)).Select(k => k.IpAddress).Distinct().ToList();
            var selfVisitorIds = known.Where(k => !string.IsNullOrEmpty(k.VisitorId)).Select(k => k.VisitorId).Distinct().ToList();

            // 1) Dựng lại số liệu ngày cho các ngày gần đây.
            var today = DateTime.UtcNow.Date;
            for (var i = 0; i < RebuildTrailingDays; i++)
            {
                var date = today.AddDays(-i);
                var rows = BuildDailyStats(eventRepository, date, selfIps, selfVisitorIds);
                dailyStatRepository.ReplaceForDate(date, rows);
            }

            // 2) Xóa dữ liệu thô quá hạn. Số liệu tổng hợp ở trên vẫn giữ lại lịch sử.
            if (settings.RetentionDays != int.MaxValue)
            {
                var cutoff = today.AddDays(-settings.RetentionDays);

                // Ngày sắp bị xóa cũng phải được tổng hợp trước, nếu không sẽ mất luôn.
                var oldest = eventRepository.GetOldestVisitDate();
                if (oldest.HasValue)
                {
                    for (var date = oldest.Value.Date; date < cutoff; date = date.AddDays(1))
                    {
                        var rows = BuildDailyStats(eventRepository, date, selfIps, selfVisitorIds);
                        dailyStatRepository.ReplaceForDate(date, rows);
                    }
                }

                var deleted = eventRepository.PurgeOlderThan(cutoff);
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
            IVisitEventRepository eventRepository,
            DateTime date,
            List<string> selfIps,
            List<string> selfVisitorIds)
        {
            var events = eventRepository.GetPageViewsForDate(date, selfIps, selfVisitorIds);
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

        private const int MaxStatPathLength = 191;

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
