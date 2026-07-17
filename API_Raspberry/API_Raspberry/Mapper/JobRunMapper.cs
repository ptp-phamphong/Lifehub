using API_Raspberry.Dto;
using API_Raspberry.Service.Jobs;
using Hangfire.Storage.Monitoring;

namespace API_Raspberry.Mapper
{
    public interface IJobRunMapper
    {
        List<JobRunDto> ToDto(
            JobList<SucceededJobDto> succeeded,
            JobList<FailedJobDto> failed,
            JobList<ProcessingJobDto> processing,
            JobList<ScheduledJobDto> scheduled,
            JobList<EnqueuedJobDto> enqueued);
    }

    /// <summary>
    /// Gộp các danh sách theo trạng thái của Hangfire thành một dòng lịch sử thống nhất cho UI.
    /// </summary>
    public class JobRunMapper : IJobRunMapper
    {
        public List<JobRunDto> ToDto(
            JobList<SucceededJobDto> succeeded,
            JobList<FailedJobDto> failed,
            JobList<ProcessingJobDto> processing,
            JobList<ScheduledJobDto> scheduled,
            JobList<EnqueuedJobDto> enqueued)
        {
            var rows = new List<JobRunDto>();

            foreach (var item in succeeded)
            {
                // Hangfire chỉ lưu thời điểm kết thúc và tổng thời gian chạy, không lưu thời điểm
                // bắt đầu -> suy ngược ra để bảng hiển thị đủ cả hai cột.
                DateTime? startedAt = null;
                if (item.Value.SucceededAt.HasValue && item.Value.TotalDuration.HasValue)
                    startedAt = item.Value.SucceededAt.Value.AddMilliseconds(-item.Value.TotalDuration.Value);

                rows.Add(new JobRunDto
                {
                    JobId = item.Key,
                    JobName = NameOf(item.Value.Job),
                    Status = "Succeeded",
                    StartedAt = startedAt,
                    FinishedAt = item.Value.SucceededAt,
                    DurationMs = item.Value.TotalDuration
                });
            }

            foreach (var item in failed)
            {
                rows.Add(new JobRunDto
                {
                    JobId = item.Key,
                    JobName = NameOf(item.Value.Job),
                    Status = "Failed",
                    FinishedAt = item.Value.FailedAt,
                    // ExceptionMessage là dòng tóm tắt; ExceptionDetails có cả stack trace nhưng
                    // dài quá cho một bảng - ai cần xem sâu thì vào dashboard Hangfire.
                    ErrorMessage = item.Value.ExceptionMessage
                });
            }

            foreach (var item in processing)
            {
                rows.Add(new JobRunDto
                {
                    JobId = item.Key,
                    JobName = NameOf(item.Value.Job),
                    Status = "Processing",
                    StartedAt = item.Value.StartedAt
                });
            }

            foreach (var item in scheduled)
            {
                // Job lỗi đang chờ thử lại nằm ở trạng thái Scheduled. Không hiện ra thì người dùng
                // thấy job "biến mất" giữa lần chạy hỏng và lần thử lại.
                rows.Add(new JobRunDto
                {
                    JobId = item.Key,
                    JobName = NameOf(item.Value.Job),
                    Status = "Scheduled",
                    StartedAt = item.Value.ScheduledAt
                });
            }

            foreach (var item in enqueued)
            {
                // Vừa bấm "Chạy ngay" thì job nằm ở Enqueued cho tới khi worker nhặt lên. Thiếu
                // trạng thái này thì bảng trống ngay sau khi bấm, người dùng tưởng hỏng và bấm lại.
                rows.Add(new JobRunDto
                {
                    JobId = item.Key,
                    JobName = NameOf(item.Value.Job),
                    Status = "Enqueued",
                    StartedAt = item.Value.EnqueuedAt
                });
            }

            return rows;
        }

        private static string NameOf(Hangfire.Common.Job job)
        {
            return JobDefinitions.FriendlyName(job?.Type?.Name);
        }
    }
}
