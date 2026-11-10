namespace API_Raspberry.Dto
{
    /// <summary>
    /// Trạng thái phiên UEH cho extension và UI. Cố ý KHÔNG có cookie.
    /// </summary>
    public class UehSessionStatusDto
    {
        /// <summary>false khi chưa extension nào gửi phiên.</summary>
        public bool HasSession { get; set; }
        public bool IsValid { get; set; }
        public DateTime? SavedAt { get; set; }
        public DateTime? LastValidatedAt { get; set; }
        public DateTime? ExpiredAt { get; set; }

        public DateTime? LastSyncAt { get; set; }
        public bool? LastSyncSuccess { get; set; }
        public string LastSyncMessage { get; set; }
        public int LastSyncCount { get; set; }
    }

    public class UehSessionSubmitDto
    {
        public string CookieHeader { get; set; }

        /// <summary>true khi bấm nút "Đồng bộ ngay": luôn đồng bộ dù cookie không đổi.</summary>
        public bool ForceSync { get; set; }
    }

    public class UehSessionSubmitResultDto
    {
        /// <summary>Mã máy đọc, xem <see cref="UehSessionOutcome"/>.</summary>
        public string Outcome { get; set; }

        /// <summary>Câu mô tả tiếng Việt, extension hiện nguyên văn.</summary>
        public string Message { get; set; }

        /// <summary>Id job đồng bộ của Hangfire. Null khi không cần đồng bộ.</summary>
        public string SyncJobId { get; set; }

        public UehSessionStatusDto Status { get; set; }
    }

    public static class UehSessionOutcome
    {
        /// <summary>Cookie khác cookie đang lưu (hoặc chưa lưu gì) và phiên sống.</summary>
        public const string SavedNew = "saved_new";
        /// <summary>Cookie như cũ nhưng phiên đang bị đánh dấu hết hạn, nay sống lại.</summary>
        public const string Revived = "revived";
        /// <summary>Cookie như cũ, phiên vẫn sống.</summary>
        public const string Unchanged = "unchanged";
        /// <summary>UEH trả trang đăng nhập: cookie gửi lên không còn đăng nhập.</summary>
        public const string NotLoggedIn = "not_logged_in";
        /// <summary>Không có học kỳ nào IsCurrentSemester = true để kiểm tra phiên.</summary>
        public const string NoSemester = "no_semester";
        /// <summary>Cookie rỗng, quá dài hoặc có ký tự xuống dòng.</summary>
        public const string InvalidCookie = "invalid_cookie";
        /// <summary>Không gọi được UEH (mạng, lỗi 5xx...). Phiên đang lưu giữ nguyên.</summary>
        public const string PortalError = "portal_error";
    }
}
