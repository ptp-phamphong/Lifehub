using System.Net;
using API_Raspberry.Data;
using API_Raspberry.Dto;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Service
{
    public interface IUehStudentScheduleService
    {
        Task<UehStudentScheduleResponseDto> FetchScheduleAsync(UehStudentScheduleRequestDto request);
    }

    public class UehStudentScheduleService : IUehStudentScheduleService
    {
        private const string LoginUrl = "https://loginst.ueh.edu.vn/signin";
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public UehStudentScheduleService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<UehStudentScheduleResponseDto> FetchScheduleAsync(UehStudentScheduleRequestDto request)
        {
            var taiKhoan = Environment.GetEnvironmentVariable("UEH_LOGIN_TAIKHOAN")
                ?? _configuration.GetValue<string>("UehLogin:TaiKhoan");
            var matKhau = Environment.GetEnvironmentVariable("UEH_LOGIN_MATKHAU")
                ?? _configuration.GetValue<string>("UehLogin:MatKhau");

            if (string.IsNullOrWhiteSpace(taiKhoan) || string.IsNullOrWhiteSpace(matKhau))
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = "Thiếu thông tin đăng nhập UEH. Hãy set UEH_LOGIN_TAIKHOAN/UEH_LOGIN_MATKHAU hoặc cấu hình UehLogin trong appsettings."
                };
            }

            var saveLogin = request?.SaveLogin ?? true;

            var currentSemester = await _context.SemesterMetadatas
                .AsNoTracking()
                .OrderByDescending(x => x.IsCurrentSemester)
                .ThenByDescending(x => x.Id)
                .FirstOrDefaultAsync(x => x.IsCurrentSemester);

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

            var cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer,
                UseCookies = true,
                AllowAutoRedirect = true
            };

            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");

            var loginPage = await client.GetAsync(LoginUrl);
            if (!loginPage.IsSuccessStatusCode)
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = $"Không tải được trang login. Status: {(int)loginPage.StatusCode}"
                };
            }

            var html = await loginPage.Content.ReadAsStringAsync();
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var tokenNode = doc.DocumentNode.SelectSingleNode("//input[@name='__RequestVerificationToken']");
            var token = tokenNode?.GetAttributeValue("value", string.Empty) ?? string.Empty;

            if (string.IsNullOrWhiteSpace(token))
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = "Không lấy được __RequestVerificationToken từ trang login."
                };
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
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = $"Login thất bại. Status: {(int)loginResponse.StatusCode}",
                    YearStudy = yearStudy,
                    TermId = termId,
                    LoginPageToken = token
                };
            }

            var scheduleUrl = $"https://student.ueh.edu.vn/Home/DrawingStudentSchedule_Perior?YearStudy={yearStudy}&TermID={Uri.EscapeDataString(termId)}";
            var scheduleResponse = await client.GetAsync(scheduleUrl);

            if (!scheduleResponse.IsSuccessStatusCode)
            {
                return new UehStudentScheduleResponseDto
                {
                    Success = false,
                    Message = $"Gọi API lịch học thất bại. Status: {(int)scheduleResponse.StatusCode}",
                    YearStudy = yearStudy,
                    TermId = termId,
                    LoginPageToken = token
                };
            }

            var content = await scheduleResponse.Content.ReadAsStringAsync();
            return new UehStudentScheduleResponseDto
            {
                Success = true,
                Message = "Đăng nhập và lấy lịch học thành công.",
                YearStudy = yearStudy,
                TermId = termId,
                LoginPageToken = token,
                ScheduleHtml = content
            };
        }
    }
}
