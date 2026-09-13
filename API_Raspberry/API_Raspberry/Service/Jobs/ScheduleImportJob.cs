namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Thay cho ScheduleImportBackgroundService cũ (vòng while + Task.Delay).
    /// Hangfire tự tạo DI scope cho mỗi lần chạy nên không cần IServiceScopeFactory nữa.
    /// Số lần thử lại khai báo bằng [AutomaticRetry] trên IScheduleImportJob, không phải ở đây.
    /// </summary>
    public class ScheduleImportJob : IScheduleImportJob
    {
        private readonly ICourseScheduleUehSyncService _syncService;
        private readonly ILogger<ScheduleImportJob> _logger;

        public ScheduleImportJob(
            ICourseScheduleUehSyncService syncService,
            ILogger<ScheduleImportJob> logger)
        {
            _syncService = syncService;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            _logger.LogInformation("ScheduleImportJob: Đang đồng bộ lịch học theo tuần từ UEH...");
            var result = await _syncService.ResetImportByWeekAsync(null);

            if (!result.Success)
            {
                // Bản BackgroundService cũ chỉ log warning rồi return, nên lần đồng bộ hỏng vẫn bị
                // coi là chạy xong êm. Ném exception để Hangfire đánh dấu Thất bại và lưu lại lý do -
                // đây chính là thứ trang Tác vụ nền cần hiển thị.
                throw new InvalidOperationException($"Đồng bộ lịch học từ UEH thất bại: {result.Message}");
            }

            _logger.LogInformation(
                "ScheduleImportJob: {SemesterCount} học kỳ, tổng {Count} buổi học ({SuccessCount} học kỳ OK).",
                result.Semesters.Count, result.Count, result.Semesters.Count(s => s.Success));
        }
    }
}
