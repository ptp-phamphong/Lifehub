using Hangfire;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Gọi nhẹ cổng UEH định kỳ (mặc định 15 phút, xem HangfireJobs:UehKeepAliveCron) để phiên ASP.NET
    /// của UEH không bị hủy vì không hoạt động, và để phát hiện sớm khi phiên chết.
    /// </summary>
    // Phải nằm trên interface, xem giải thích ở IScheduleImportJob.
    // Không thử lại: lượt sau chỉ cách 15 phút, và thử lại liên tục khi UEH lỗi chỉ tạo thêm request.
    [AutomaticRetry(Attempts = 0)]
    public interface IUehKeepAliveJob
    {
        Task RunAsync();
    }
}
