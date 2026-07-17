namespace API_Raspberry.Dto
{
    /// <summary>
    /// Một lần chạy của tác vụ nền, đọc từ lịch sử Hangfire (không có bảng riêng trong app).
    /// </summary>
    public class JobRunDto
    {
        public string JobId { get; set; }

        /// <summary>Tên tiếng Việt để hiển thị, vd "Đồng bộ lịch học UEH".</summary>
        public string JobName { get; set; }

        /// <summary>Succeeded | Failed | Processing | Scheduled (Scheduled = đang chờ thử lại sau khi lỗi).</summary>
        public string Status { get; set; }

        public DateTime? StartedAt { get; set; }
        public DateTime? FinishedAt { get; set; }
        public long? DurationMs { get; set; }

        /// <summary>Chỉ có khi Status = Failed.</summary>
        public string ErrorMessage { get; set; }
    }
}
