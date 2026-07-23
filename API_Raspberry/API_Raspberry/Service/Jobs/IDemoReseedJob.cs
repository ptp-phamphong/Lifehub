using Hangfire;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Xóa sạch data demo hiện có rồi sinh lại data giả tiếng Anh cuốn theo ngày hiện tại (chi tiêu,
    /// thu nhập, thời khóa biểu). Chỉ chạy trên instance demo - xem DemoMode trong appsettings.
    /// AutomaticRetry phải nằm trên interface, không phải class - xem IScheduleImportJob.cs.
    /// </summary>
    [AutomaticRetry(Attempts = 2)]
    public interface IDemoReseedJob
    {
        Task RunAsync();
    }
}
