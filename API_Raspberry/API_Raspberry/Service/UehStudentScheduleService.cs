using System.Text.Json;
using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Service
{
    public interface IUehStudentScheduleService
    {
        // Học kỳ nào có IsCurrentSemester = true thì được đồng bộ - cho phép nhiều dòng cùng true.
        Task<List<SemesterMetadata>> GetSemestersToSyncAsync();

        // Dùng một phiên (cookie từ extension) cho toàn bộ semesters truyền vào.
        // Gặp SessionExpired thì dừng cả lượt, ErrorKind = SessionExpired.
        Task<UehFetchSemestersResult> FetchAllWeeksForSemestersAsync(List<SemesterMetadata> semesters, string cookieHeader);

        // Gọi đúng 1 request GetWeek để biết cookie còn đăng nhập không. Không ném lỗi mạng ra ngoài.
        Task<UehValidateResult> ValidateAsync(string cookieHeader, SemesterMetadata semester);
    }

    public class UehFetchSemestersResult
    {
        public List<UehAllWeeksResponseDto> Results { get; set; } = new List<UehAllWeeksResponseDto>();
        public UehFetchErrorKind ErrorKind { get; set; }
        public string Error { get; set; }
    }

    public class UehValidateResult
    {
        public UehFetchErrorKind ErrorKind { get; set; }
        public string Message { get; set; }
    }

    /// <summary>
    /// Đọc TKB từ cổng sinh viên UEH bằng cookie phiên do extension Chrome gửi về.
    /// Từ 04/11/2026 trang đăng nhập UEH có reCAPTCHA nên backend không tự đăng nhập bằng mật khẩu
    /// nữa (xem document/plans/plan_sync_UEH_time_table_by_extension.md trong repo pi-infra).
    /// Cookie KHÔNG bao giờ được ghi ra log.
    /// </summary>
    public class UehStudentScheduleService : IUehStudentScheduleService
    {
        private const string WeekListUrlFormat = "https://student.ueh.edu.vn/Home/GetWeek/{0}${1}";
        private const string WeekScheduleUrlFormat = "https://student.ueh.edu.vn/Home/DrawingSchedules?YearStudy={0}&TermID={1}&Week={2}";
        private const int DefaultWeekRequestDelayMs = 400;
        private const int DefaultSemesterRequestDelayMs = 2000;
        private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(30);

        private static readonly JsonSerializerOptions WeekListJsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UehStudentScheduleService> _logger;

        public UehStudentScheduleService(
            AppDbContext context,
            IConfiguration configuration,
            ILogger<UehStudentScheduleService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<List<SemesterMetadata>> GetSemestersToSyncAsync()
        {
            return await _context.SemesterMetadatas
                .AsNoTracking()
                .Where(x => x.IsCurrentSemester)
                .OrderByDescending(x => x.Id)
                .ToListAsync();
        }

        // UseCookies = false để header Cookie gửi đúng nguyên văn chuỗi từ trình duyệt.
        // AllowAutoRedirect = false để thấy được 302 về trang đăng nhập khi phiên chết, thay vì
        // lặng lẽ đi theo redirect rồi nhận về HTML trang login với mã 200.
        private static HttpClient CreateSession(string cookieHeader)
        {
            var handler = new HttpClientHandler
            {
                UseCookies = false,
                AllowAutoRedirect = false
            };

            var client = new HttpClient(handler) { Timeout = RequestTimeout };
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Cookie", cookieHeader);
            return client;
        }

        public async Task<UehValidateResult> ValidateAsync(string cookieHeader, SemesterMetadata semester)
        {
            using var client = CreateSession(cookieHeader);
            try
            {
                var (_, kind, error) = await GetWeekListAsync(client, semester.Year, semester.CodeSemester);
                return new UehValidateResult
                {
                    ErrorKind = kind,
                    Message = kind == UehFetchErrorKind.Ok ? "Phiên UEH còn hiệu lực." : error
                };
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException)
            {
                return new UehValidateResult
                {
                    ErrorKind = UehFetchErrorKind.PortalError,
                    Message = $"Không kết nối được cổng UEH: {ex.Message}"
                };
            }
        }

        public async Task<UehFetchSemestersResult> FetchAllWeeksForSemestersAsync(List<SemesterMetadata> semesters, string cookieHeader)
        {
            var semesterDelayMs = _configuration.GetValue<int?>("UehSchedule:SemesterRequestDelayMs") ?? DefaultSemesterRequestDelayMs;
            var output = new UehFetchSemestersResult { ErrorKind = UehFetchErrorKind.Ok };

            // Lỗi mạng (HttpRequestException/timeout) cố ý để lọt ra ngoài: job Hangfire sẽ thử lại.
            using var client = CreateSession(cookieHeader);

            for (var i = 0; i < semesters.Count; i++)
            {
                var result = await FetchAllWeeksForSemesterAsync(client, semesters[i]);
                output.Results.Add(result);

                if (result.ErrorKind == UehFetchErrorKind.SessionExpired)
                {
                    // Phiên đã chết thì các học kỳ sau cũng chết theo: dừng luôn, không gọi UEH thêm.
                    output.ErrorKind = UehFetchErrorKind.SessionExpired;
                    output.Error = result.Message;
                    return output;
                }

                if (semesterDelayMs > 0 && i < semesters.Count - 1)
                {
                    await Task.Delay(semesterDelayMs);
                }
            }

            return output;
        }

        private async Task<UehAllWeeksResponseDto> FetchAllWeeksForSemesterAsync(HttpClient client, SemesterMetadata semester)
        {
            var yearStudy = semester.Year;
            var termId = semester.CodeSemester;

            var (weekList, weekKind, weekError) = await GetWeekListAsync(client, yearStudy, termId);
            if (weekKind != UehFetchErrorKind.Ok)
            {
                return new UehAllWeeksResponseDto
                {
                    Success = false,
                    ErrorKind = weekKind,
                    Message = weekError,
                    YearStudy = yearStudy,
                    TermId = termId,
                    SemesterMetadataId = semester.Id
                };
            }

            // Week không unique khi học kỳ vắt qua giao thừa, và portal luôn trả về lần xuất hiện
            // đầu tiên, nên gọi trùng chỉ tốn request mà không lấy thêm được dữ liệu.
            var distinctWeeks = weekList
                .Select(x => x.Week)
                .Distinct()
                .ToList();

            var delayMs = _configuration.GetValue<int?>("UehSchedule:WeekRequestDelayMs") ?? DefaultWeekRequestDelayMs;
            var results = new List<UehWeekHtmlDto>();

            for (var i = 0; i < distinctWeeks.Count; i++)
            {
                var week = distinctWeeks[i];
                var (html, htmlKind, htmlError) = await GetWeekHtmlAsync(client, yearStudy, termId, week);

                if (htmlKind == UehFetchErrorKind.SessionExpired)
                {
                    // Khác lỗi lẻ một tuần: phiên chết giữa chừng thì mọi tuần sau đều hỏng, và dữ liệu
                    // đã lấy được chỉ là một phần học kỳ. Dừng hẳn để không ghi đè TKB bằng dữ liệu thiếu.
                    return new UehAllWeeksResponseDto
                    {
                        Success = false,
                        ErrorKind = UehFetchErrorKind.SessionExpired,
                        Message = htmlError,
                        YearStudy = yearStudy,
                        TermId = termId,
                        SemesterMetadataId = semester.Id,
                        WeeksScanned = distinctWeeks.Count
                    };
                }

                if (htmlKind != UehFetchErrorKind.Ok)
                {
                    // Một tuần lỗi không nên làm hỏng cả lần import; các tuần còn lại vẫn có giá trị.
                    _logger.LogWarning("Bỏ qua tuần {Week} của {Year}/{Term}: {Error}", week, yearStudy, termId, htmlError);
                    continue;
                }

                results.Add(new UehWeekHtmlDto { Week = week, Html = html });

                if (delayMs > 0 && i < distinctWeeks.Count - 1)
                {
                    await Task.Delay(delayMs);
                }
            }

            if (results.Count == 0)
            {
                return new UehAllWeeksResponseDto
                {
                    Success = false,
                    ErrorKind = UehFetchErrorKind.PortalError,
                    Message = $"Không lấy được tuần nào trong {distinctWeeks.Count} tuần của học kỳ {termId} năm {yearStudy}.",
                    YearStudy = yearStudy,
                    TermId = termId,
                    SemesterMetadataId = semester.Id,
                    WeeksScanned = distinctWeeks.Count,
                    Weeks = results
                };
            }

            return new UehAllWeeksResponseDto
            {
                Success = true,
                ErrorKind = UehFetchErrorKind.Ok,
                Message = $"Lấy thành công {results.Count}/{distinctWeeks.Count} tuần.",
                YearStudy = yearStudy,
                TermId = termId,
                SemesterMetadataId = semester.Id,
                WeeksScanned = distinctWeeks.Count,
                Weeks = results
            };
        }

        private static async Task<(List<UehWeekDto> weeks, UehFetchErrorKind kind, string error)> GetWeekListAsync(
            HttpClient client, int yearStudy, string termId)
        {
            // '$' là ký tự phân cách thật trong route của portal, không phải escape.
            var url = string.Format(WeekListUrlFormat, yearStudy, Uri.EscapeDataString(termId));
            using var response = await client.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();

            if (UehPortalResponse.IsLoginResponse((int)response.StatusCode, body, expectJson: true))
            {
                return (null, UehFetchErrorKind.SessionExpired, "Phiên UEH đã hết hạn (cổng UEH trả về trang đăng nhập).");
            }

            if (!response.IsSuccessStatusCode)
            {
                return (null, UehFetchErrorKind.PortalError, $"Gọi API danh sách tuần thất bại. Status: {(int)response.StatusCode}");
            }

            try
            {
                var weeks = JsonSerializer.Deserialize<List<UehWeekDto>>(body, WeekListJsonOptions);
                if (weeks == null || weeks.Count == 0)
                {
                    return (null, UehFetchErrorKind.PortalError, $"Danh sách tuần rỗng cho học kỳ {termId} năm {yearStudy}.");
                }

                return (weeks, UehFetchErrorKind.Ok, null);
            }
            catch (JsonException ex)
            {
                return (null, UehFetchErrorKind.PortalError, $"Không đọc được danh sách tuần: {ex.Message}");
            }
        }

        private static async Task<(string html, UehFetchErrorKind kind, string error)> GetWeekHtmlAsync(
            HttpClient client, int yearStudy, string termId, int week)
        {
            var url = string.Format(WeekScheduleUrlFormat, yearStudy, Uri.EscapeDataString(termId), week);
            using var response = await client.GetAsync(url);
            var html = await response.Content.ReadAsStringAsync();

            if (UehPortalResponse.IsLoginResponse((int)response.StatusCode, html, expectJson: false))
            {
                return (null, UehFetchErrorKind.SessionExpired, $"Phiên UEH đã hết hạn khi đang lấy tuần {week} (cổng UEH trả về trang đăng nhập).");
            }

            if (!response.IsSuccessStatusCode)
            {
                return (null, UehFetchErrorKind.PortalError, $"Gọi API lịch học tuần {week} thất bại. Status: {(int)response.StatusCode}");
            }

            // Cố ý KHÔNG chuẩn hoá Unicode ở đây. Portal mã hoá một phần dấu tiếng Việt bằng HTML entity,
            // nên lúc này chúng vẫn là chuỗi ASCII "&#...;" — Normalize không nhìn xuyên qua được, và
            // DeEntitize ở lớp parse sẽ giải mã ra dạng tổ hợp trở lại. Việc chuẩn hoá vì vậy phải nằm
            // ở nơi biến markup thành text (CourseScheduleImportService.GetNodeText / ParseWeekHtml).
            return (html, UehFetchErrorKind.Ok, null);
        }
    }
}
