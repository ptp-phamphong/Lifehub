using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace API_Raspberry.Service
{
    public class ScheduleImportBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ScheduleImportBackgroundService> _logger;
        private readonly IConfiguration _configuration;

        public ScheduleImportBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<ScheduleImportBackgroundService> logger,
            IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var enabled = _configuration.GetValue<bool>("ScheduleImportJob:Enabled");
            if (!enabled)
            {
                _logger.LogInformation("ScheduleImportJob is disabled in configuration.");
                return;
            }

            var intervalMinutes = _configuration.GetValue<int>("ScheduleImportJob:IntervalMinutes");
            if (intervalMinutes <= 0)
            {
                intervalMinutes = 120; // default 2 hours
            }

            _logger.LogInformation("ScheduleImportJob started. Interval: {Minutes} minutes.", intervalMinutes);

            // Đợi 30 giây sau khi app start để đảm bảo mọi thứ sẵn sàng
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunImportAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "ScheduleImportJob encountered an error.");
                }

                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
        }

        private async Task RunImportAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var syncService = scope.ServiceProvider.GetRequiredService<ICourseScheduleUehSyncService>();

            _logger.LogInformation("ScheduleImportJob: Đang đồng bộ lịch học theo tuần từ UEH...");
            var result = await syncService.ResetImportByWeekAsync(null);

            if (!result.Success)
            {
                _logger.LogWarning("ScheduleImportJob: Đồng bộ thất bại. Message: {Message}", result.Message);
                return;
            }

            _logger.LogInformation(
                "ScheduleImportJob: Import thành công {Count} buổi học từ {WithData}/{Scanned} tuần cho semester {SemesterId}.",
                result.Count, result.WeeksWithData, result.WeeksScanned, result.SemesterMetadataId);
        }
    }
}
