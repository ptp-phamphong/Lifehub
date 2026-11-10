using Hangfire.Common;
using Hangfire.States;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Job ném <see cref="UehSyncSkippedException"/> thì chuyển sang Deleted thay vì Failed.
    /// JobsService chỉ đọc Succeeded/Failed/Processing/Scheduled/Enqueued nên lượt bị bỏ qua không
    /// hiện trên trang Tác vụ nền. Phải đặt trên interface (như AutomaticRetry), và exception này phải
    /// nằm trong ExceptOn của AutomaticRetry để không bị thử lại.
    /// </summary>
    public class SkippedJobToDeletedAttribute : JobFilterAttribute, IElectStateFilter
    {
        public void OnStateElection(ElectStateContext context)
        {
            if (context.CandidateState is FailedState failed && failed.Exception is UehSyncSkippedException)
            {
                context.CandidateState = new DeletedState { Reason = failed.Exception.Message };
            }
        }
    }
}
