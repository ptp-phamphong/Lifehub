namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Giữ phiên UEH sống bằng một request GetWeek mỗi lượt.
    ///  - Chưa có phiên hoặc phiên đã hết hạn: không làm gì (không gọi UEH).
    ///  - Phiên còn sống: MarkValidated().
    ///  - Phiên vừa chết: MarkExpired() và log cảnh báo kèm thời gian phiên đã sống. Log này dùng để đo
    ///    UEH hủy phiên sau bao lâu dù có job giữ phiên.
    ///  - Lỗi mạng / UEH lỗi: ghi Thất bại trên trang Tác vụ nền, giữ nguyên trạng thái phiên
    ///    (không biết chắc phiên đã chết).
    /// </summary>
    public class UehKeepAliveJob : IUehKeepAliveJob
    {
        private readonly IUehPortalSessionService _sessionService;
        private readonly IUehStudentScheduleService _uehStudentScheduleService;
        private readonly ILogger<UehKeepAliveJob> _logger;

        public UehKeepAliveJob(
            IUehPortalSessionService sessionService,
            IUehStudentScheduleService uehStudentScheduleService,
            ILogger<UehKeepAliveJob> logger)
        {
            _sessionService = sessionService;
            _uehStudentScheduleService = uehStudentScheduleService;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            var session = _sessionService.Get();
            if (session == null || !session.IsValid)
            {
                return;
            }

            var semester = (await _uehStudentScheduleService.GetSemestersToSyncAsync()).FirstOrDefault();
            if (semester == null)
            {
                // GetWeek cần năm học + mã học kỳ; không có học kỳ nào được đánh dấu thì không gọi được.
                _logger.LogWarning("UehKeepAlive: không có học kỳ nào IsCurrentSemester = true, bỏ qua lượt này.");
                return;
            }

            var result = await _uehStudentScheduleService.ValidateAsync(session.CookieHeader, semester);

            switch (result.ErrorKind)
            {
                case UehFetchErrorKind.Ok:
                    _sessionService.MarkValidated();
                    break;

                case UehFetchErrorKind.SessionExpired:
                    _sessionService.MarkExpired();
                    var savedAtUtc = DateTime.SpecifyKind(session.SavedAt, DateTimeKind.Utc);
                    var lastValidatedUtc = DateTime.SpecifyKind(session.LastValidatedAt, DateTimeKind.Utc);
                    _logger.LogWarning(
                        "UehKeepAlive: phiên UEH đã chết. Sống được {Lifetime} kể từ lúc extension gửi ({SavedAt:o}); lần cuối còn sống {LastValidated:o}.",
                        DateTime.UtcNow - savedAtUtc, savedAtUtc, lastValidatedUtc);
                    break;

                default:
                    // Ném lỗi để Hangfire ghi Thất bại (hiện trên trang Tác vụ nền), nhưng không đánh dấu
                    // hết hạn: UEH trục trặc tạm thời không có nghĩa là phiên đã chết.
                    throw new InvalidOperationException($"Giữ phiên UEH: không gọi được cổng UEH. {result.Message}");
            }
        }
    }
}
