using API_Raspberry.Data;
using API_Raspberry.Model;
using Bogus;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Xóa sạch ExpenseRecord/IncomeRecord/CourseSchedule/SemesterMetadata rồi sinh lại data giả
    /// tiếng Anh, cuốn theo DateTime.Today tại thời điểm chạy (chạy cron 3h sáng mỗi ngày, hoặc
    /// trigger tay qua POST Jobs/Trigger/demo-reseed). Xem document/plans/clever-scribbling-coral.md.
    /// </summary>
    public class DemoReseedJob : IDemoReseedJob
    {
        private static readonly string[] ExpenseCategories =
        {
            "Groceries", "Transport", "Dining Out", "Utilities", "Rent",
            "Entertainment", "Healthcare", "Shopping", "Education"
        };

        private static readonly string[] IncomeReasons =
        {
            "Salary", "Freelance Income", "Investment Returns", "Bonus", "Gift"
        };

        private static readonly (string Name, string Code, DayOfWeek Day)[] Courses =
        {
            ("Software Engineering", "SE101", DayOfWeek.Monday),
            ("Database Systems", "DB201", DayOfWeek.Tuesday),
            ("Data Structures & Algorithms", "DSA150", DayOfWeek.Wednesday),
            ("Web Development", "WEB220", DayOfWeek.Thursday),
            ("Operating Systems", "OS210", DayOfWeek.Friday),
            ("English Communication", "ENG101", DayOfWeek.Monday),
        };

        private readonly AppDbContext _db;
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;
        private readonly INotificationFilterService _notificationFilterService;
        private readonly IVisitorLogSettingsService _visitorLogSettingsService;
        private readonly ILogger<DemoReseedJob> _logger;

        public DemoReseedJob(
            AppDbContext db,
            IConfiguration configuration,
            IHostEnvironment environment,
            INotificationFilterService notificationFilterService,
            IVisitorLogSettingsService visitorLogSettingsService,
            ILogger<DemoReseedJob> logger)
        {
            _db = db;
            _configuration = configuration;
            _environment = environment;
            _notificationFilterService = notificationFilterService;
            _visitorLogSettingsService = visitorLogSettingsService;
            _logger = logger;
        }

        public async Task RunAsync()
        {
            // Chốt an toàn thứ hai (chốt thứ nhất là Program.cs chỉ đăng ký recurring job này khi
            // isDemo) - job này xóa data thật nếu lỡ chạy nhầm trên instance thật.
            // Ngược với IDemoModeService (chỉ cần MỘT dấu hiệu là coi như demo, để chặn cho chắc):
            // việc XÓA data đòi đủ CẢ HAI dấu hiệu, để chắc chắn không bao giờ chạy trên bản thật.
            var isDemo = _configuration.GetValue<bool>("DemoMode")
                && _environment.IsEnvironment(DemoModeService.EnvironmentName);
            if (!isDemo)
            {
                _logger.LogWarning("DemoReseedJob: không phải instance demo (cần DemoMode=true và môi trường Demo), bỏ qua.");
                return;
            }

            var today = DateTime.Today;
            var faker = new Faker("en");

            // Một transaction cho cả xóa lẫn seed: lỗi giữa chừng thì demo giữ nguyên data cũ,
            // không bị bỏ lại trong trạng thái nửa trống.
            await using var transaction = await _db.Database.BeginTransactionAsync();

            await SelfHealDemoUserAsync();

            // Reset mọi thứ người xem demo sửa được, kể cả danh mục, cấu hình (theme nằm trong
            // SystemConfigurations: THEME_WEB_DARK/THEME_MOBILE_DARK) và dấu vết visitor/notification.
            // Thứ tự: ExpenseRecords trước ReasonTypes (khóa ngoại SetNull, AppDbContext.cs); không
            // bảng nào trỏ tới Users.
            _logger.LogInformation("DemoReseedJob: Xóa data demo cũ...");
            await _db.ExpenseRecords.ExecuteDeleteAsync();
            await _db.IncomeRecords.ExecuteDeleteAsync();
            await _db.CourseSchedules.ExecuteDeleteAsync();
            await _db.SemesterMetadatas.ExecuteDeleteAsync();
            await _db.ReasonTypes.ExecuteDeleteAsync();
            await _db.SystemConfigurations.ExecuteDeleteAsync();
            await _db.PhoneNotifications.ExecuteDeleteAsync();
            await _db.NotificationFilters.ExecuteDeleteAsync();
            await _db.VisitEvents.ExecuteDeleteAsync();
            await _db.VisitorKnownIps.ExecuteDeleteAsync();
            await _db.VisitorDailyStats.ExecuteDeleteAsync();

            // Cấu hình mặc định như lúc app khởi động lần đầu (Program.cs).
            _notificationFilterService.SeedDefaults();
            _visitorLogSettingsService.SeedDefaults();

            var reasonTypes = await SeedReasonTypesAsync();
            var semester = SeedSemester(today);
            _db.SemesterMetadatas.Add(semester);
            await _db.SaveChangesAsync();

            SeedCourseSchedule(faker, semester, today);
            SeedExpenseRecords(faker, reasonTypes, today);
            SeedIncomeRecords(faker, today);

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("DemoReseedJob: Hoàn tất sinh lại data demo tính đến {Today}.", today);
        }

        /// <summary>
        /// Đảm bảo tài khoản demo (Auth:Username/PasswordHash) là tài khoản DUY NHẤT, tồn tại và đúng
        /// mật khẩu/tên/email - phòng khi ai đó lách được guard ở UserService. Xóa mọi user khác:
        /// trước khi có DemoGateMiddleware, người lạ tạo được user tùy ý trên demo.
        /// Không bảng nào có khóa ngoại tới Users nên xóa thẳng là an toàn.
        /// </summary>
        private async Task SelfHealDemoUserAsync()
        {
            var demoUsername = _configuration["Auth:Username"];
            var demoPasswordHash = _configuration["Auth:PasswordHash"];
            if (string.IsNullOrEmpty(demoUsername) || string.IsNullOrEmpty(demoPasswordHash))
            {
                return;
            }

            var removed = await _db.Users.Where(u => u.Username != demoUsername).ExecuteDeleteAsync();
            if (removed > 0)
            {
                _logger.LogWarning("DemoReseedJob: đã xóa {Count} user lạ khỏi DB demo.", removed);
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == demoUsername);
            if (user == null)
            {
                _db.Users.Add(new User
                {
                    Username = demoUsername,
                    Password = demoPasswordHash,
                    Name = demoUsername,
                    Email = _configuration["Auth:AdminEmail"],
                    Active = true
                });
            }
            else
            {
                user.Password = demoPasswordHash;
                user.Name = demoUsername;
                user.Email = _configuration["Auth:AdminEmail"];
                user.Active = true;
            }

            await _db.SaveChangesAsync();
        }

        private async Task<List<ReasonType>> SeedReasonTypesAsync()
        {
            var reasonTypes = ExpenseCategories.Select((name, i) => new ReasonType
            {
                ReasonName = name,
                Active = true,
                SortOrder = i,
                DefaultFilterType = 1
            }).ToList();

            _db.ReasonTypes.AddRange(reasonTypes);
            await _db.SaveChangesAsync();
            return reasonTypes;
        }

        private static SemesterMetadata SeedSemester(DateTime today)
        {
            return new SemesterMetadata
            {
                SemesterName = $"Demo Semester {today.Year}",
                CodeSemester = $"DEMO-{today.Year}",
                Year = today.Year,
                IsCurrentSemester = true
            };
        }

        /// <summary>
        /// Một buổi/tuần cho mỗi môn, trải từ today-30d tới today+60d. WeekOfYear/DisplayWeek chỉ
        /// mang tính hiển thị (không phục vụ import UEH nào ở đây) nên tính đơn giản bằng ISOWeek,
        /// không cần khớp đúng cách portal UEH đánh số như CourseScheduleImportService.
        /// </summary>
        private void SeedCourseSchedule(Faker faker, SemesterMetadata semester, DateTime today)
        {
            var rangeStart = today.AddDays(-30);
            var rangeEnd = today.AddDays(60);

            foreach (var course in Courses)
            {
                var sessionDate = FirstOnOrAfter(rangeStart, course.Day);
                while (sessionDate <= rangeEnd)
                {
                    _db.CourseSchedules.Add(new CourseSchedule
                    {
                        CourseName = course.Name,
                        CourseCode = course.Code,
                        StartDate = sessionDate,
                        EndDate = sessionDate,
                        SessionDate = sessionDate,
                        StartTime = "07:30",
                        EndTime = "09:45",
                        Room = $"B{faker.Random.Int(1, 4)}-{faker.Random.Int(100, 405)}",
                        SemesterMetadataId = semester.Id,
                        DayOfWeek = (int)sessionDate.DayOfWeek,
                        WeekOfYear = System.Globalization.ISOWeek.GetWeekOfYear(sessionDate),
                        DisplayWeek = (sessionDate - rangeStart).Days / 7 + 1,
                        StartPeriod = 1,
                        EndPeriod = 3,
                        ClassCode = $"{course.Code}-01",
                        Lecturer = faker.Name.FullName(),
                        LecturerEmail = faker.Internet.Email(),
                        LearningMode = "Offline",
                        Language = "English",
                        CreatedDate = DateTime.Now
                    });

                    sessionDate = sessionDate.AddDays(7);
                }
            }
        }

        private static DateTime FirstOnOrAfter(DateTime from, DayOfWeek day)
        {
            var diff = ((int)day - (int)from.DayOfWeek + 7) % 7;
            return from.AddDays(diff);
        }

        /// <summary>Cửa sổ 90 ngày cuốn tới hôm nay, ~1-3 giao dịch/ngày.</summary>
        private void SeedExpenseRecords(Faker faker, List<ReasonType> reasonTypes, DateTime today)
        {
            for (var day = today.AddDays(-90); day <= today; day = day.AddDays(1))
            {
                var count = faker.Random.Int(0, 3);
                for (var i = 0; i < count; i++)
                {
                    var reasonType = faker.PickRandom(reasonTypes);
                    _db.ExpenseRecords.Add(new ExpenseRecord
                    {
                        Reason = $"{reasonType.ReasonName} - {faker.Commerce.ProductName()}",
                        Amount = faker.Random.Int(20_000, 1_500_000),
                        CreatedDate = day.AddHours(faker.Random.Int(7, 21)),
                        ReasonTypeId = reasonType.Id
                    });
                }
            }
        }

        private void SeedIncomeRecords(Faker faker, DateTime today)
        {
            // Lương cố định đầu mỗi tháng trong cửa sổ 90 ngày.
            var windowStart = today.AddDays(-90);
            var monthStart = new DateTime(windowStart.Year, windowStart.Month, 1);
            if (monthStart < windowStart) monthStart = monthStart.AddMonths(1);
            for (; monthStart <= today; monthStart = monthStart.AddMonths(1))
            {
                _db.IncomeRecords.Add(new IncomeRecord
                {
                    Reason = "Salary",
                    Amount = faker.Random.Int(8_000_000, 15_000_000),
                    CreatedDate = monthStart
                });
            }

            // Vài khoản thu nhập phụ rải rác.
            var extraCount = faker.Random.Int(6, 12);
            for (var i = 0; i < extraCount; i++)
            {
                var day = today.AddDays(-faker.Random.Int(0, 90));
                _db.IncomeRecords.Add(new IncomeRecord
                {
                    Reason = faker.PickRandom(IncomeReasons),
                    Amount = faker.Random.Int(200_000, 5_000_000),
                    CreatedDate = day
                });
            }
        }
    }
}
