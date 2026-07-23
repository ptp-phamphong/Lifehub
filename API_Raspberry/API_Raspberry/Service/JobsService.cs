using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Service.Jobs;
using Hangfire;

namespace API_Raspberry.Service
{
    public interface IJobsService
    {
        List<JobRunDto> GetHistory(int take);

        /// <summary>Chạy tác vụ ngay lập tức. Trả về jobId của Hangfire, hoặc null nếu khóa không hợp lệ.</summary>
        string Trigger(string jobKey);
    }

    /// <summary>
    /// Lịch sử chạy lấy thẳng từ Hangfire (JobStorage) chứ không có bảng riêng - Hangfire đã lưu sẵn
    /// mọi thứ cần thiết vào các bảng Hangfire_* trong cùng DB.
    /// </summary>
    public class JobsService : IJobsService
    {
        /// <summary>Cả hai job đều chạy trên queue mặc định của Hangfire.</summary>
        private const string DefaultQueue = "default";

        private readonly IJobRunMapper _jobRunMapper;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly JobStorage _jobStorage;
        private readonly DemoJobStorageAccessor _demoStorage;

        public JobsService(
            IJobRunMapper jobRunMapper,
            IBackgroundJobClient backgroundJobClient,
            JobStorage jobStorage,
            DemoJobStorageAccessor demoStorage)
        {
            _jobRunMapper = jobRunMapper;
            _backgroundJobClient = backgroundJobClient;
            _jobStorage = jobStorage;
            _demoStorage = demoStorage;
        }

        public List<JobRunDto> GetHistory(int take)
        {
            if (take <= 0) take = 50;

            var rows = ReadRows(_jobStorage, take);

            // Trên instance thật, lịch sử job demo-reseed nằm ở kho raspberry_demo -> trộn vào để
            // /app thấy nó như một job thứ ba. Bọc try/catch để DB demo trục trặc không làm hỏng cả
            // trang Tác vụ nền của app thật.
            if (_demoStorage.Storage != null)
            {
                try
                {
                    rows.AddRange(ReadRows(_demoStorage.Storage, take));
                }
                catch
                {
                    // Bỏ qua: chỉ mất phần lịch sử job demo, các job thật vẫn hiển thị bình thường.
                }
            }

            // Mỗi trạng thái là một danh sách riêng nên phải trộn lại rồi mới xếp theo thời gian.
            return rows
                .OrderByDescending(r => r.FinishedAt ?? r.StartedAt ?? DateTime.MinValue)
                .Take(take)
                .ToList();
        }

        private List<JobRunDto> ReadRows(JobStorage storage, int take)
        {
            var api = storage.GetMonitoringApi();
            return _jobRunMapper.ToDto(
                api.SucceededJobs(0, take),
                api.FailedJobs(0, take),
                api.ProcessingJobs(0, take),
                api.ScheduledJobs(0, take),
                api.EnqueuedJobs(DefaultQueue, 0, take));
        }

        public string Trigger(string jobKey)
        {
            // Enqueue qua IBackgroundJobClient (DI) thay vì API tĩnh BackgroundJob.Enqueue:
            // API tĩnh phụ thuộc JobStorage.Current nên dễ vỡ tùy thời điểm khởi động.
            switch (jobKey)
            {
                case JobDefinitions.ScheduleImportKey:
                    return _backgroundJobClient.Enqueue<IScheduleImportJob>(job => job.RunAsync());
                case JobDefinitions.VisitorLogMaintenanceKey:
                    return _backgroundJobClient.Enqueue<IVisitorLogMaintenanceJob>(job => job.RunAsync());
                case JobDefinitions.DemoReseedKey:
                    // Đẩy vào kho demo (raspberry_demo) để server Hangfire của instance demo chạy.
                    // Không có cầu nối (instance thật thiếu config, hoặc chính là instance demo) thì
                    // coi như job không tồn tại -> controller trả 404 như khóa lạ.
                    if (_demoStorage.Storage == null) return null;
                    return new BackgroundJobClient(_demoStorage.Storage)
                        .Enqueue<IDemoReseedJob>(job => job.RunAsync());
                default:
                    return null;
            }
        }
    }
}
