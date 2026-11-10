using API_Raspberry.Dto;

namespace API_Raspberry.Service
{
    public interface ICourseScheduleUehSyncService
    {
        Task<CourseScheduleUehSyncResultDto> ResetImportByWeekAsync();
    }

    /// <summary>
    /// Đồng bộ TKB học kỳ hiện tại từ portal UEH theo từng tuần, bằng phiên (cookie) do extension
    /// Chrome gửi về. Tách riêng khỏi Controller vì cả endpoint thủ công lẫn ScheduleImportJob
    /// (chạy qua Hangfire) đều cần đúng flow này.
    /// </summary>
    public class CourseScheduleUehSyncService : ICourseScheduleUehSyncService
    {
        private const string VnTimeZoneId = "SE Asia Standard Time";

        private readonly IUehStudentScheduleService _uehStudentScheduleService;
        private readonly IUehPortalSessionService _uehPortalSessionService;
        private readonly ICourseScheduleImportService _courseScheduleImportService;
        private readonly ICourseScheduleService _courseScheduleService;
        private readonly ILogger<CourseScheduleUehSyncService> _logger;

        public CourseScheduleUehSyncService(
            IUehStudentScheduleService uehStudentScheduleService,
            IUehPortalSessionService uehPortalSessionService,
            ICourseScheduleImportService courseScheduleImportService,
            ICourseScheduleService courseScheduleService,
            ILogger<CourseScheduleUehSyncService> logger)
        {
            _uehStudentScheduleService = uehStudentScheduleService;
            _uehPortalSessionService = uehPortalSessionService;
            _courseScheduleImportService = courseScheduleImportService;
            _courseScheduleService = courseScheduleService;
            _logger = logger;
        }

        public async Task<CourseScheduleUehSyncResultDto> ResetImportByWeekAsync()
        {
            CourseScheduleUehSyncResultDto result;
            try
            {
                result = await RunAsync();
            }
            catch (Exception ex)
            {
                // Lỗi mạng vẫn để lọt ra cho Hangfire thử lại, nhưng ghi lại trước để extension (đang chờ
                // LastSyncAt đổi) và trang trạng thái thấy ngay, không phải chờ hết 3 phút.
                _uehPortalSessionService.RecordSync(false, $"Lỗi khi gọi cổng UEH: {ex.Message}", 0);
                throw;
            }

            // Cuối lượt luôn ghi lại kết quả (không có phiên thì RecordSync tự bỏ qua).
            _uehPortalSessionService.RecordSync(result.Success, result.Message, result.Count);
            return result;
        }

        private async Task<CourseScheduleUehSyncResultDto> RunAsync()
        {
            // Hai trường hợp dưới đây không gọi UEH: biết chắc là hỏng, gọi chỉ tốn request.
            var session = _uehPortalSessionService.Get();
            if (session == null)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    ErrorKind = UehFetchErrorKind.SessionExpired,
                    Message = "Chưa có phiên UEH — mở trang UEH để extension gửi phiên."
                };
            }

            if (!session.IsValid)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    ErrorKind = UehFetchErrorKind.SessionExpired,
                    Message = $"Phiên UEH đã hết hạn từ {FormatVnTime(session.ExpiredAt)} — mở trang UEH để extension gửi phiên mới."
                };
            }

            var semesters = await _uehStudentScheduleService.GetSemestersToSyncAsync();
            if (semesters.Count == 0)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    ErrorKind = UehFetchErrorKind.PortalError,
                    Message = "Không có học kỳ nào được đánh dấu đồng bộ (IsCurrentSemester = true)."
                };
            }

            var fetch = await _uehStudentScheduleService.FetchAllWeeksForSemestersAsync(semesters, session.CookieHeader);

            // Học kỳ nào lấy xong trước khi phiên chết thì vẫn ghi: dữ liệu đó đầy đủ và đúng.
            var semesterResults = fetch.Results.Select(ImportOneSemester).ToList();

            var totalCount = semesterResults.Sum(s => s.Count);
            var successCount = semesterResults.Count(s => s.Success);

            if (fetch.ErrorKind == UehFetchErrorKind.SessionExpired)
            {
                _uehPortalSessionService.MarkExpired();
                _logger.LogWarning(
                    "Đồng bộ UEH: phiên hết hạn giữa chừng sau {Done}/{Total} học kỳ. Đã đánh dấu phiên hết hạn.",
                    successCount, semesters.Count);

                var expiredMessage = $"Phiên UEH đã hết hạn từ {FormatVnTime(DateTime.UtcNow)} — mở trang UEH để extension gửi phiên mới.";
                if (successCount > 0)
                {
                    expiredMessage += $" (Đã kịp đồng bộ {successCount} học kỳ, {totalCount} buổi học.)";
                }

                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    ErrorKind = UehFetchErrorKind.SessionExpired,
                    Message = expiredMessage,
                    Count = totalCount,
                    Semesters = semesterResults
                };
            }

            // Gọi UEH tới cuối mà không gặp trang đăng nhập nghĩa là phiên còn sống.
            _uehPortalSessionService.MarkValidated();

            var overallSuccess = successCount > 0;

            _logger.LogInformation(
                "Đồng bộ UEH: {SuccessCount}/{Total} học kỳ thành công, tổng {Count} buổi học.",
                successCount, semesterResults.Count, totalCount);

            // Lý do lỗi của từng học kỳ trước đây chỉ nằm trong Semesters[] — job Hangfire chỉ ném Message
            // tổng nên trang Tác vụ nền và journald không bao giờ thấy được nguyên nhân thật.
            var failed = semesterResults.Where(s => !s.Success).ToList();
            foreach (var s in failed)
            {
                _logger.LogWarning(
                    "Đồng bộ UEH: học kỳ {TermId} năm {YearStudy} (SemesterMetadataId {Id}) thất bại: {Reason}",
                    s.TermId, s.YearStudy, s.SemesterMetadataId, s.Message);
            }

            var message = $"Đồng bộ {successCount}/{semesterResults.Count} học kỳ thành công, tổng {totalCount} buổi học.";
            if (failed.Count > 0)
            {
                message += " Lỗi: " + string.Join(" | ", failed.Select(s => $"[{s.TermId}/{s.YearStudy}] {s.Message}"));
            }

            return new CourseScheduleUehSyncResultDto
            {
                Success = overallSuccess,
                ErrorKind = overallSuccess ? UehFetchErrorKind.Ok : UehFetchErrorKind.PortalError,
                Message = message,
                Count = totalCount,
                Semesters = semesterResults
            };
        }

        // Giờ Việt Nam dạng "HH:mm dd/MM". Cột trong DB là UTC nhưng đọc lên Kind = Unspecified.
        private static string FormatVnTime(DateTime? utc)
        {
            if (!utc.HasValue) return "?";
            var vnZone = TimeZoneInfo.FindSystemTimeZoneById(VnTimeZoneId);
            var vn = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc.Value, DateTimeKind.Utc), vnZone);
            return vn.ToString("HH:mm dd/MM");
        }

        // Parse + dedupe + xoá/ghi lại TKB cho ĐÚNG 1 học kỳ. DeleteBySemesterMetadataId chỉ xoá theo
        // SemesterMetadataId nên không đụng dữ liệu của các học kỳ khác đang được loop cùng lượt này.
        private CourseScheduleUehSyncSemesterResultDto ImportOneSemester(UehAllWeeksResponseDto fetchResult)
        {
            if (!fetchResult.Success)
            {
                return new CourseScheduleUehSyncSemesterResultDto
                {
                    Success = false,
                    Message = fetchResult.Message,
                    SemesterMetadataId = fetchResult.SemesterMetadataId,
                    YearStudy = fetchResult.YearStudy,
                    TermId = fetchResult.TermId,
                    WeeksScanned = fetchResult.WeeksScanned
                };
            }

            var semesterMetadataId = fetchResult.SemesterMetadataId;
            var parsed = new List<CourseScheduleCreateDto>();
            var weeksWithData = 0;

            foreach (var weekHtml in fetchResult.Weeks)
            {
                var weekDtos = _courseScheduleImportService.ParseWeekHtml(weekHtml.Html, semesterMetadataId, weekHtml.Week);
                if (weekDtos.Count == 0)
                {
                    // Bình thường: danh sách tuần của portal rộng hơn học kỳ thật, nhiều tuần rỗng.
                    continue;
                }

                weeksWithData++;
                parsed.AddRange(weekDtos);
            }

            var toInsert = parsed
                .GroupBy(x => (x.SessionDate, x.StartPeriod, x.CourseCode))
                .Select(g => g.First())
                .ToList();

            // Không xoá khi không parse được buổi nào. Học kỳ rỗng thật thì hiếm, còn portal đổi layout
            // hoặc session hết hạn thì thường xuyên — và khi đó xoá sạch TKB là hỏng nặng hơn nhiều
            // so với việc giữ lại dữ liệu cũ. Muốn dọn học kỳ rỗng thì dùng DeleteBySemesterMetadataId.
            if (toInsert.Count == 0)
            {
                _logger.LogWarning(
                    "Đồng bộ UEH: học kỳ {SemesterId} quét {Scanned} tuần nhưng không parse được buổi học nào. Giữ nguyên dữ liệu cũ.",
                    semesterMetadataId, fetchResult.WeeksScanned);

                return new CourseScheduleUehSyncSemesterResultDto
                {
                    Success = false,
                    Message = $"Quét {fetchResult.WeeksScanned} tuần nhưng không đọc được buổi học nào. Đã giữ nguyên thời khóa biểu cũ để tránh mất dữ liệu.",
                    SemesterMetadataId = semesterMetadataId,
                    YearStudy = fetchResult.YearStudy,
                    TermId = fetchResult.TermId,
                    WeeksScanned = fetchResult.WeeksScanned
                };
            }

            // Chỉ xoá sau khi đã fetch + parse xong toàn bộ: portal lỗi giữa chừng thì TKB cũ vẫn còn.
            _courseScheduleService.DeleteBySemesterMetadataId(semesterMetadataId);
            _courseScheduleService.AddRange(toInsert);

            _logger.LogInformation(
                "Đồng bộ UEH: {Count} buổi học từ {WithData}/{Scanned} tuần cho học kỳ {SemesterId}.",
                toInsert.Count, weeksWithData, fetchResult.WeeksScanned, semesterMetadataId);

            return new CourseScheduleUehSyncSemesterResultDto
            {
                Success = true,
                Message = $"Đồng bộ thành công {toInsert.Count} buổi học từ {weeksWithData} tuần có lịch.",
                Count = toInsert.Count,
                SemesterMetadataId = semesterMetadataId,
                YearStudy = fetchResult.YearStudy,
                TermId = fetchResult.TermId,
                WeeksScanned = fetchResult.WeeksScanned,
                WeeksWithData = weeksWithData
            };
        }
    }
}
