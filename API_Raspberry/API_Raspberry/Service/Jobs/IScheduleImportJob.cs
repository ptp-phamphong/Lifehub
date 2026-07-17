using Hangfire;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Đồng bộ lịch học theo tuần từ cổng sinh viên UEH.
    /// Hangfire gọi định kỳ theo cron (xem HangfireJobs:ScheduleImportCron), hoặc chạy ngay
    /// khi bấm "Chạy ngay" ở trang Tác vụ nền.
    /// </summary>
    // AutomaticRetry phải nằm trên INTERFACE chứ không phải class implementation: job được enqueue
    // qua interface (Enqueue<IScheduleImportJob>) nên Hangfire chỉ đọc filter attribute ở đây;
    // đặt trên class thì bị bỏ qua và job âm thầm chạy theo mặc định 10 lần thử lại.
    // Mặc định 10 lần với backoff tăng dần nghĩa là lỗi phải mất nhiều giờ mới hiện trạng thái
    // "Thất bại". Giới hạn 2 để lỗi nổi lên sớm, và vì job này chạy lại mỗi giờ nên hỏng một lần
    // cũng không mất mát gì.
    [AutomaticRetry(Attempts = 2)]
    public interface IScheduleImportJob
    {
        Task RunAsync();
    }
}
