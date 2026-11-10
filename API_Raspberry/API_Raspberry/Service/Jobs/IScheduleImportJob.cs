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
    // ExceptOn: phiên UEH hết hạn thì thử lại chắc chắn hỏng tiếp (và gọi UEH vô ích), nên ra
    // "Thất bại" ngay một lần. Lỗi mạng tạm thời vẫn được thử lại 2 lần như cũ.
    // UehSyncSkippedException: lượt theo lịch bị bỏ qua, SkippedJobToDeleted chuyển nó sang Deleted.
    [AutomaticRetry(Attempts = 2, ExceptOn = new[] { typeof(UehSessionExpiredException), typeof(UehSyncSkippedException) })]
    [SkippedJobToDeleted]
    public interface IScheduleImportJob
    {
        /// <summary>
        /// Đồng bộ ngay. Dùng cho "Chạy ngay" và khi extension gửi phiên mới. Phiên hết hạn thì ghi
        /// "Thất bại" để người bấm thấy lý do.
        /// </summary>
        Task RunAsync();

        /// <summary>
        /// Lượt chạy theo cron. Chưa có phiên hoặc phiên đã hết hạn thì bỏ qua im lặng (không gọi UEH,
        /// không ghi "Thất bại"). Lượt kế tiếp sẽ do extension kích hoạt khi người dùng đăng nhập lại.
        /// </summary>
        Task RunScheduledAsync();
    }
}
