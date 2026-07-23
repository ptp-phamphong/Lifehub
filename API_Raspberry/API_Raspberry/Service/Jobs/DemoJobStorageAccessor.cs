using Hangfire;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Cầu nối tới kho Hangfire của instance demo (DB raspberry_demo). Chỉ khác null trên instance
    /// thật khi có cấu hình DemoControl:ConnectionString; trên instance demo thì Storage = null.
    ///
    /// Instance thật dùng kho này CHỈ để đẩy việc vào hàng đợi (bấm "Chạy ngay" ở /app) và đọc lịch
    /// sử job demo - nó KHÔNG chạy job: không có Hangfire server nào của instance thật poll kho này,
    /// nên việc xóa/seed vẫn thực thi trên chính instance demo (DemoMode=true). Xem
    /// document/plans/clever-scribbling-coral.md.
    /// </summary>
    public class DemoJobStorageAccessor
    {
        public JobStorage Storage { get; }

        public DemoJobStorageAccessor(JobStorage storage)
        {
            Storage = storage;
        }
    }
}
