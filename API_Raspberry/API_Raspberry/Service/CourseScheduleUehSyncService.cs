using API_Raspberry.Dto;

namespace API_Raspberry.Service
{
    public interface ICourseScheduleUehSyncService
    {
        Task<CourseScheduleUehSyncResultDto> ResetImportByWeekAsync(UehStudentScheduleRequestDto request);
    }

    /// <summary>
    /// Đồng bộ TKB học kỳ hiện tại từ portal UEH theo từng tuần.
    /// Tách riêng khỏi Controller vì cả endpoint thủ công lẫn ScheduleImportJob (chạy qua Hangfire)
    /// đều cần đúng flow này — trước đây hai chỗ chép lại logic của nhau.
    /// </summary>
    public class CourseScheduleUehSyncService : ICourseScheduleUehSyncService
    {
        private readonly IUehStudentScheduleService _uehStudentScheduleService;
        private readonly ICourseScheduleImportService _courseScheduleImportService;
        private readonly ICourseScheduleService _courseScheduleService;
        private readonly ILogger<CourseScheduleUehSyncService> _logger;

        public CourseScheduleUehSyncService(
            IUehStudentScheduleService uehStudentScheduleService,
            ICourseScheduleImportService courseScheduleImportService,
            ICourseScheduleService courseScheduleService,
            ILogger<CourseScheduleUehSyncService> logger)
        {
            _uehStudentScheduleService = uehStudentScheduleService;
            _courseScheduleImportService = courseScheduleImportService;
            _courseScheduleService = courseScheduleService;
            _logger = logger;
        }

        public async Task<CourseScheduleUehSyncResultDto> ResetImportByWeekAsync(UehStudentScheduleRequestDto request)
        {
            var semesters = await _uehStudentScheduleService.GetSemestersToSyncAsync();
            if (semesters.Count == 0)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    Message = "Không có học kỳ nào được đánh dấu đồng bộ (IsCurrentSemester = true)."
                };
            }

            var (fetchResults, loginError) = await _uehStudentScheduleService.FetchAllWeeksForSemestersAsync(semesters, request);
            if (loginError != null)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    Message = loginError
                };
            }

            var semesterResults = fetchResults.Select(ImportOneSemester).ToList();

            var totalCount = semesterResults.Sum(s => s.Count);
            var successCount = semesterResults.Count(s => s.Success);
            var overallSuccess = successCount > 0;

            _logger.LogInformation(
                "Đồng bộ UEH: {SuccessCount}/{Total} học kỳ thành công, tổng {Count} buổi học.",
                successCount, semesterResults.Count, totalCount);

            return new CourseScheduleUehSyncResultDto
            {
                Success = overallSuccess,
                Message = $"Đồng bộ {successCount}/{semesterResults.Count} học kỳ thành công, tổng {totalCount} buổi học.",
                Count = totalCount,
                Semesters = semesterResults
            };
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
