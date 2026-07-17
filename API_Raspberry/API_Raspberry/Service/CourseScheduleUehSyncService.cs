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
            var fetchResult = await _uehStudentScheduleService.FetchAllWeeksAsync(request);
            if (!fetchResult.Success)
            {
                return new CourseScheduleUehSyncResultDto
                {
                    Success = false,
                    Message = fetchResult.Message,
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
                    "Đồng bộ UEH: quét {Scanned} tuần nhưng không parse được buổi học nào. Giữ nguyên dữ liệu cũ.",
                    fetchResult.WeeksScanned);

                return new CourseScheduleUehSyncResultDto
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

            return new CourseScheduleUehSyncResultDto
            {
                Success = true,
                Message = $"Đồng bộ thành công {toInsert.Count} buổi học từ {weeksWithData} tuần có lịch.",
                Count = toInsert.Count,
                SemesterMetadataId = semesterMetadataId,
                YearStudy = fetchResult.YearStudy,
                TermId = fetchResult.TermId,
                WeeksScanned = fetchResult.WeeksScanned,
                WeeksWithData = weeksWithData,
                Data = toInsert
            };
        }
    }
}
