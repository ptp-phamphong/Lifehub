using System.Net;
using System.Text;
using System.Text.Json;
using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Model;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Service
{
    public interface IUehStudentScheduleService
    {
        Task<UehStudentScheduleResponseDto> FetchScheduleAsync(UehStudentScheduleRequestDto request);
        Task<UehWeekListResponseDto> FetchWeekListAsync(UehStudentScheduleRequestDto request);
        Task<UehWeekScheduleResponseDto> FetchWeekScheduleAsync(UehStudentScheduleRequestDto request, int week);
        Task<UehAllWeeksResponseDto> FetchAllWeeksAsync(UehStudentScheduleRequestDto request);
    }

    public class UehStudentScheduleService : IUehStudentScheduleService
    {
        private const string LoginUrl = "https://loginst.ueh.edu.vn/signin";
        private const string PeriodScheduleUrlFormat = "https://student.ueh.edu.vn/Home/DrawingStudentSchedule_Perior?YearStudy={0}&TermID={1}";
        private const string WeekListUrlFormat = "https://student.ueh.edu.vn/Home/GetWeek/{0}${1}";
        private const string WeekScheduleUrlFormat = "https://student.ueh.edu.vn/Home/DrawingSchedules?YearStudy={0}&TermID={1}&Week={2}";
        private const int DefaultWeekRequestDelayMs = 400;

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

        // Session đã đăng nhập UEH; dùng chung cho nhiều request để chỉ login một lần.
        private class UehSession : IDisposable
        {
            public HttpClient Client { get; set; }
            public string Token { get; set; }

            public void Dispose()
            {
                Client?.Dispose();
            }
        }

        private async Task<SemesterMetadata> GetCurrentSemesterAsync()
        {
            return await _context.SemesterMetadatas
                .AsNoTracking()
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync(x => x.IsCurrentSemester);
        }

        // Trả về (session, error). Đúng một trong hai khác null.
        private async Task<(UehSession session, string error)> LoginAsync(bool saveLogin)
        {
            var taiKhoan = Environment.GetEnvironmentVariable("UEH_LOGIN_TAIKHOAN")
                ?? _configuration.GetValue<string>("UehLogin:TaiKhoan");
            var matKhau = Environment.GetEnvironmentVariable("UEH_LOGIN_MATKHAU")
                ?? _configuration.GetValue<string>("UehLogin:MatKhau");

            if (string.IsNullOrWhiteSpace(taiKhoan) || string.IsNullOrWhiteSpace(matKhau))
            {
                return (null, "Thiếu thông tin đăng nhập UEH. Hãy set UEH_LOGIN_TAIKHOAN/UEH_LOGIN_MATKHAU hoặc cấu hình UehLogin trong appsettings.");
            }

            var cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer,
                UseCookies = true,
                AllowAutoRedirect = true
            };

            var client = new HttpClient(handler);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");

            try
            {
                var loginPage = await client.GetAsync(LoginUrl);
                if (!loginPage.IsSuccessStatusCode)
                {
                    client.Dispose();
                    return (null, $"Không tải được trang login. Status: {(int)loginPage.StatusCode}");
                }

                var html = await loginPage.Content.ReadAsStringAsync();
                var doc = new HtmlDocument();
                doc.LoadHtml(html);

                var tokenNode = doc.DocumentNode.SelectSingleNode("//input[@name='__RequestVerificationToken']");
                var token = tokenNode?.GetAttributeValue("value", string.Empty) ?? string.Empty;

                if (string.IsNullOrWhiteSpace(token))
                {
                    client.Dispose();
                    return (null, "Không lấy được __RequestVerificationToken từ trang login.");
                }

                var formData = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("__RequestVerificationToken", token),
                    new KeyValuePair<string, string>("TaiKhoan", taiKhoan),
                    new KeyValuePair<string, string>("MatKhau", matKhau),
                    new KeyValuePair<string, string>("SaveLogin", saveLogin ? "checked" : "false")
                });

                var loginResponse = await client.PostAsync(LoginUrl, formData);
                if (!loginResponse.IsSuccessStatusCode)
                {
                    client.Dispose();
                    return (null, $"Login thất bại. Status: {(int)loginResponse.StatusCode}");
                }

                return (new UehSession { Client = client, Token = token }, null);
            }
            catch
            {
                client.Dispose();
                throw;
            }
        }

        public async Task<UehStudentScheduleResponseDto> FetchScheduleAsync(UehStudentScheduleRequestDto request)
        {
            var currentSemester = await GetCurrentSemesterAsync();
            if (currentSemester == null)
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy SemesterMetadata có IsCurrentSemester = true."
                };
            }

            var yearStudy = currentSemester.Year;
            var termId = currentSemester.CodeSemester;

            var (session, error) = await LoginAsync(request?.SaveLogin ?? true);
            if (session == null)
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = error,
                    YearStudy = yearStudy,
                    TermId = termId
                };
            }

            using (session)
            {
                var scheduleUrl = string.Format(PeriodScheduleUrlFormat, yearStudy, Uri.EscapeDataString(termId));
                var scheduleResponse = await session.Client.GetAsync(scheduleUrl);

                if (!scheduleResponse.IsSuccessStatusCode)
                {
                    return new UehStudentScheduleResponseDto
                    {
                        Success = false,
                        Message = $"Gọi API lịch học thất bại. Status: {(int)scheduleResponse.StatusCode}",
                        YearStudy = yearStudy,
                        TermId = termId,
                        LoginPageToken = session.Token
                    };
                }

                var content = await scheduleResponse.Content.ReadAsStringAsync();
                return new UehStudentScheduleResponseDto
                {
                    Success = true,
                    Message = "Đăng nhập và lấy lịch học thành công.",
                    YearStudy = yearStudy,
                    TermId = termId,
                    LoginPageToken = session.Token,
                    ScheduleHtml = content
                };
            }
        }

        public async Task<UehWeekListResponseDto> FetchWeekListAsync(UehStudentScheduleRequestDto request)
        {
            var currentSemester = await GetCurrentSemesterAsync();
            if (currentSemester == null)
            {
                return new UehWeekListResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy SemesterMetadata có IsCurrentSemester = true."
                };
            }

            var (session, error) = await LoginAsync(request?.SaveLogin ?? true);
            if (session == null)
            {
                return new UehWeekListResponseDto
                {
                    Success = false,
                    Message = error,
                    YearStudy = currentSemester.Year,
                    TermId = currentSemester.CodeSemester
                };
            }

            using (session)
            {
                var (weeks, weekError) = await GetWeekListAsync(session, currentSemester.Year, currentSemester.CodeSemester);
                return new UehWeekListResponseDto
                {
                    Success = weeks != null,
                    Message = weeks != null ? "Lấy danh sách tuần thành công." : weekError,
                    YearStudy = currentSemester.Year,
                    TermId = currentSemester.CodeSemester,
                    Weeks = weeks
                };
            }
        }

        public async Task<UehWeekScheduleResponseDto> FetchWeekScheduleAsync(UehStudentScheduleRequestDto request, int week)
        {
            var currentSemester = await GetCurrentSemesterAsync();
            if (currentSemester == null)
            {
                return new UehWeekScheduleResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy SemesterMetadata có IsCurrentSemester = true.",
                    Week = week
                };
            }

            var (session, error) = await LoginAsync(request?.SaveLogin ?? true);
            if (session == null)
            {
                return new UehWeekScheduleResponseDto
                {
                    Success = false,
                    Message = error,
                    YearStudy = currentSemester.Year,
                    TermId = currentSemester.CodeSemester,
                    Week = week
                };
            }

            using (session)
            {
                var (html, htmlError) = await GetWeekHtmlAsync(session, currentSemester.Year, currentSemester.CodeSemester, week);
                return new UehWeekScheduleResponseDto
                {
                    Success = html != null,
                    Message = html != null ? "Lấy lịch học theo tuần thành công." : htmlError,
                    YearStudy = currentSemester.Year,
                    TermId = currentSemester.CodeSemester,
                    Week = week,
                    ScheduleHtml = html
                };
            }
        }

        public async Task<UehAllWeeksResponseDto> FetchAllWeeksAsync(UehStudentScheduleRequestDto request)
        {
            var currentSemester = await GetCurrentSemesterAsync();
            if (currentSemester == null)
            {
                return new UehAllWeeksResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy SemesterMetadata có IsCurrentSemester = true."
                };
            }

            var yearStudy = currentSemester.Year;
            var termId = currentSemester.CodeSemester;

            var (session, error) = await LoginAsync(request?.SaveLogin ?? true);
            if (session == null)
            {
                return new UehAllWeeksResponseDto
                {
                    Success = false,
                    Message = error,
                    YearStudy = yearStudy,
                    TermId = termId
                };
            }

            using (session)
            {
                var (weekList, weekError) = await GetWeekListAsync(session, yearStudy, termId);
                if (weekList == null)
                {
                    return new UehAllWeeksResponseDto
                    {
                        Success = false,
                        Message = weekError,
                        YearStudy = yearStudy,
                        TermId = termId
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
                    var (html, htmlError) = await GetWeekHtmlAsync(session, yearStudy, termId, week);

                    if (html == null)
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
                        Message = $"Không lấy được tuần nào trong {distinctWeeks.Count} tuần của học kỳ {termId} năm {yearStudy}.",
                        YearStudy = yearStudy,
                        TermId = termId,
                        SemesterMetadataId = currentSemester.Id,
                        WeeksScanned = distinctWeeks.Count,
                        Weeks = results
                    };
                }

                return new UehAllWeeksResponseDto
                {
                    Success = true,
                    Message = $"Lấy thành công {results.Count}/{distinctWeeks.Count} tuần.",
                    YearStudy = yearStudy,
                    TermId = termId,
                    SemesterMetadataId = currentSemester.Id,
                    WeeksScanned = distinctWeeks.Count,
                    Weeks = results
                };
            }
        }

        private async Task<(List<UehWeekDto> weeks, string error)> GetWeekListAsync(UehSession session, int yearStudy, string termId)
        {
            // '$' là ký tự phân cách thật trong route của portal, không phải escape.
            var url = string.Format(WeekListUrlFormat, yearStudy, Uri.EscapeDataString(termId));
            var response = await session.Client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return (null, $"Gọi API danh sách tuần thất bại. Status: {(int)response.StatusCode}");
            }

            var json = await response.Content.ReadAsStringAsync();

            try
            {
                var weeks = JsonSerializer.Deserialize<List<UehWeekDto>>(json, WeekListJsonOptions);
                if (weeks == null || weeks.Count == 0)
                {
                    return (null, $"Danh sách tuần rỗng cho học kỳ {termId} năm {yearStudy}.");
                }

                return (weeks, null);
            }
            catch (JsonException ex)
            {
                // Portal trả HTML trang login thay vì JSON khi session hết hạn.
                return (null, $"Không parse được danh sách tuần (session UEH có thể đã hết hạn): {ex.Message}");
            }
        }

        private async Task<(string html, string error)> GetWeekHtmlAsync(UehSession session, int yearStudy, string termId, int week)
        {
            var url = string.Format(WeekScheduleUrlFormat, yearStudy, Uri.EscapeDataString(termId), week);
            var response = await session.Client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return (null, $"Gọi API lịch học tuần {week} thất bại. Status: {(int)response.StatusCode}");
            }

            var html = await response.Content.ReadAsStringAsync();

            // Cố ý KHÔNG chuẩn hoá Unicode ở đây. Portal mã hoá một phần dấu tiếng Việt bằng HTML entity,
            // nên lúc này chúng vẫn là chuỗi ASCII "&#...;" — Normalize không nhìn xuyên qua được, và
            // DeEntitize ở lớp parse sẽ giải mã ra dạng tổ hợp trở lại. Việc chuẩn hoá vì vậy phải nằm
            // ở nơi biến markup thành text (CourseScheduleImportService.GetNodeText / ParseWeekHtml).
            return (html, null);
        }
    }
}
