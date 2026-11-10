namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Đồng bộ UEH hỏng vì chưa có phiên hoặc phiên đã hết hạn. Thử lại không giúp gì - phải chờ
    /// người dùng mở trang UEH để extension gửi phiên mới - nên IScheduleImportJob loại lỗi này ra
    /// khỏi AutomaticRetry (ExceptOn). Message là câu hướng dẫn hiện trên trang Tác vụ nền.
    /// </summary>
    public class UehSessionExpiredException : Exception
    {
        public UehSessionExpiredException(string message) : base(message)
        {
        }
    }
}
