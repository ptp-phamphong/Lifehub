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
            var semesterService = scope.ServiceProvider.GetRequiredService<ISemesterMetadataService>();
            var uehService = scope.ServiceProvider.GetRequiredService<IUehStudentScheduleService>();
            var courseScheduleService = scope.ServiceProvider.GetRequiredService<ICourseScheduleService>();
            var importService = scope.ServiceProvider.GetRequiredService<ICourseScheduleImportService>();

            var currentSemester = semesterService.GetAll().FirstOrDefault(x => x.IsCurrentSemester);
            if (currentSemester == null)
            {
                _logger.LogWarning("ScheduleImportJob: Không tìm thấy học kỳ hiện tại (IsCurrentSemester = true). Bỏ qua.");
                return;
            }

            _logger.LogInformation("ScheduleImportJob: Đang fetch lịch học từ UEH...");
            var fetchResult = await uehService.FetchScheduleAsync(null);
            if (!fetchResult.Success || string.IsNullOrWhiteSpace(fetchResult.ScheduleHtml))
            {
                _logger.LogWarning("ScheduleImportJob: Không thể lấy lịch từ UEH. Message: {Message}", fetchResult.Message);
                return;
            }

            courseScheduleService.DeleteBySemesterMetadataId(currentSemester.Id);
            var imported = importService.ImportFromHtml(fetchResult.ScheduleHtml, currentSemester.Id);

            _logger.LogInformation("ScheduleImportJob: Import thành công {Count} dòng cho semester {SemesterId}.",
                imported.Count, currentSemester.Id);
        }
    }
}
