namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Lượt đồng bộ UEH theo lịch bị bỏ qua vì chưa có phiên hoặc phiên đã hết hạn - không gọi UEH.
    /// Không phải lỗi: <see cref="SkippedJobToDeletedAttribute"/> chuyển job sang trạng thái Deleted,
    /// nên nó không hiện thành "Thất bại" (cũng không thành "Thành công") trên trang Tác vụ nền.
    /// Phải ném exception vì Hangfire không có trạng thái "bỏ qua": return bình thường sẽ thành Succeeded.
    /// </summary>
    public class UehSyncSkippedException : Exception
    {
        public UehSyncSkippedException(string message) : base(message)
        {
        }
    }
}
