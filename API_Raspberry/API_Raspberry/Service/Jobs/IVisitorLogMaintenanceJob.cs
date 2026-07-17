using Hangfire;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Dồn dữ liệu truy cập thô thành số liệu theo ngày và xóa dữ liệu thô quá hạn.
    /// Hangfire gọi định kỳ theo cron (xem HangfireJobs:VisitorLogMaintenanceCron), hoặc chạy ngay
    /// khi bấm "Chạy ngay" ở trang Tác vụ nền.
    /// </summary>
    // Phải nằm trên interface, xem giải thích ở IScheduleImportJob.
    // Job này chỉ đụng DB nội bộ, hỏng thường là hỏng thật (không phải trục trặc mạng tạm thời)
    // nên retry nhiều cũng vô ích; giữ 1 lần thử lại để lỗi hiện sớm trong lịch sử chạy.
    [AutomaticRetry(Attempts = 1)]
    public interface IVisitorLogMaintenanceJob
    {
        Task RunAsync();
    }
}
