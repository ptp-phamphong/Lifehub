namespace API_Raspberry.Dto.Zalo
{
    /// <summary>Người nhận hiển thị trên dropdown (không lộ SearchTerm/MatchText nội bộ ra UI).</summary>
    public class ZaloContactDto
    {
        public string Id { get; set; }
        public string Label { get; set; }
    }

    /// <summary>Trạng thái nhanh cho UI. LoggedIn là "lần biết gần nhất" — kiểm tra thật diễn ra lúc gửi/đăng nhập.</summary>
    public class ZaloStatusDto
    {
        public bool Enabled { get; set; }
        public bool LoggedIn { get; set; }
        public bool BrowserOpen { get; set; }
    }

    /// <summary>
    /// Kết quả của luồng đăng nhập QR.
    /// Status: awaiting_qr | logged_in | already_logged_in | logged_out | expired | disabled | error.
    /// </summary>
    public class ZaloLoginResultDto
    {
        public string Status { get; set; }

        /// <summary>Ảnh QR dạng data URI (data:image/png;base64,...). Chỉ có khi Status = awaiting_qr.</summary>
        public string QrImageBase64 { get; set; }

        public string Message { get; set; }
    }

    public class ZaloSendRequest
    {
        public string ContactId { get; set; }
        public string Message { get; set; }
    }

    /// <summary>Status: sent | need_login | rate_limited | contact_not_found | disabled | error.</summary>
    public class ZaloSendResultDto
    {
        public string Status { get; set; }
        public string Message { get; set; }

        /// <summary>
        /// Ảnh chụp khung hội thoại ngay sau khi gửi (data:image/png;base64,...), để người dùng tự
        /// mắt xác nhận đã gửi ĐÚNG người. Có khi Status = sent, và cũng cố chụp khi lỗi để dễ chẩn đoán.
        /// </summary>
        public string ScreenshotBase64 { get; set; }
    }
}
