using System.Net;
using System.Text;
using API_Raspberry.Data;
using API_Raspberry.Filters;
using API_Raspberry.Mapper;
using API_Raspberry.Middleware;
using API_Raspberry.Repository;
using API_Raspberry.Service;
using API_Raspberry.Service.Jobs;
using API_Raspberry.Service.Zalo;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.MySql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

// ----------------------------
// Instance demo (demo.ptp-phamphong.com, mật khẩu công khai trên portfolio)
// ----------------------------
// An toàn khi lỗi: DemoMode=true HOẶC ASPNETCORE_ENVIRONMENT=Demo đều tính là demo. Dùng để tắt mọi
// thứ có tác dụng phụ thật (sync UEH, Zalo, GPIO, mail), bật cổng allowlist DemoGateMiddleware và
// job seed data giả. Xem document/plans/plan-security-lifehub-demo.md (repo pi-infra).
var isDemo = DemoModeService.Detect(builder.Configuration, builder.Environment);
if (isDemo)
{
    // Demo không được cầm secret thật nào: còn dính là từ chối khởi động luôn (chỉ in tên, không in giá trị).
    var demoProblems = DemoStartupGuard.FindProblems(builder.Configuration, Environment.GetEnvironmentVariables());
    if (demoProblems.Count > 0)
    {
        foreach (var problem in demoProblems)
            Console.Error.WriteLine($"❌ [DemoStartupGuard] {problem}");
        throw new InvalidOperationException(
            $"Instance demo từ chối khởi động: {demoProblems.Count} vấn đề cấu hình (xem log phía trên).");
    }

    // Không endpoint nào được mở trên demo cần body lớn (import Excel, ghi âm AI đều bị chặn).
    builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 256 * 1024);
}

// ----------------------------
// 0️⃣ Forwarded headers (BẮT BUỘC cho visitor log)
// ----------------------------
// Caddy reverse-proxy tới 127.0.0.1:5000, nên nếu không có middleware này thì
// HttpContext.Connection.RemoteIpAddress luôn là 127.0.0.1 và toàn bộ khách truy cập
// sẽ bị ghi nhận là "localhost". Caddy tự set X-Forwarded-For và không có CDN/Cloudflare
// đứng trước, nên phần tử đầu tiên của header chính là IP thật của khách.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;                      // chỉ có duy nhất Caddy đứng trước
    options.KnownProxies.Clear();
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Add(IPAddress.Loopback);  // Caddy chạy trên chính máy Pi
    options.KnownProxies.Add(IPAddress.IPv6Loopback);
});

// ----------------------------
// 1️⃣ Thêm cấu hình CORS
// ----------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .WithOrigins(
                "https://ptp-phamphong.com",                     // Portfolio production
                "https://www.ptp-phamphong.com",                 // www (redirected to apex)
                "https://app.ptp-phamphong.com",                 // Angular expense app
                "https://demo.ptp-phamphong.com",                // Angular demo build
                "http://localhost:4200",                          // Angular dev
                "http://localhost:8081",                         //  Mobile dev
                "http://localhost:3000"                          // Portfolio (Next.js) dev
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();  // Cần thiết cho cookie/auth header
    });
});
// ----------------------------
// 2️⃣ Database - Entity Framework + MySQL
// ----------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36))));

// ----------------------------
// 2.5️⃣ Hangfire - chạy job định kỳ + lưu lịch sử chạy
// ----------------------------
// Dùng chung MariaDB với app: Hangfire tự tạo bảng tiền tố "Hangfire_" ngay lần chạy đầu
// (không qua EF migration), nên lịch sử job cũng nằm trong bản backup DB sẵn có.
// Connection string phải có "Allow User Variables=True" thì script schema của storage mới chạy được.
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseStorage(new MySqlStorage(connectionString, new MySqlStorageOptions
    {
        TablesPrefix = "Hangfire_",
        PrepareSchemaIfNecessary = true,
        // Mặc định 15s: bấm "Chạy ngay" xong phải đợi tới 15 giây job mới nhúc nhích, tưởng hỏng.
        // 5s cho cảm giác tức thì mà mỗi phút cũng chỉ thêm vài query nhẹ vào MariaDB.
        QueuePollInterval = TimeSpan.FromSeconds(5)
    })));

// Mặc định Hangfire mở 20 worker thread. Pi chỉ có vài nhân và cả app này chỉ có mấy job chạy
// thưa, nên 2 worker là đủ mà đỡ tốn RAM/CPU.
builder.Services.AddHangfireServer(options => options.WorkerCount = 2);

// ----------------------------
// 3️⃣ Dependency Injection - Mappers
// ----------------------------
builder.Services.AddScoped<IReasonTypeMapper, ReasonTypeMapper>();
builder.Services.AddScoped<ISemesterMetadataMapper, SemesterMetadataMapper>();
builder.Services.AddScoped<ISystemConfigurationMapper, SystemConfigurationMapper>();
builder.Services.AddScoped<IExpenseRecordMapper, ExpenseRecordMapper>();
builder.Services.AddScoped<IIncomeRecordMapper, IncomeRecordMapper>();
builder.Services.AddScoped<ICourseScheduleMapper, CourseScheduleMapper>();
builder.Services.AddScoped<IPhoneNotificationMapper, PhoneNotificationMapper>();
builder.Services.AddScoped<INotificationFilterMapper, NotificationFilterMapper>();
builder.Services.AddScoped<ISystemInfoMapper, SystemInfoMapper>();
builder.Services.AddScoped<IVisitEventMapper, VisitEventMapper>();
builder.Services.AddScoped<IJobRunMapper, JobRunMapper>();
builder.Services.AddScoped<IVisitorKnownIpMapper, VisitorKnownIpMapper>();

// ----------------------------
// 4️⃣ Dependency Injection - Repositories
// ----------------------------
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<IIncomeRepository, IncomeRepository>();
builder.Services.AddScoped<IReasonTypeRepository, ReasonTypeRepository>();
builder.Services.AddScoped<ISemesterMetadataRepository, SemesterMetadataRepository>();
builder.Services.AddScoped<ISystemConfigurationRepository, SystemConfigurationRepository>();
builder.Services.AddScoped<ICourseScheduleRepository, CourseScheduleRepository>();
builder.Services.AddScoped<IPhoneNotificationRepository, PhoneNotificationRepository>();
builder.Services.AddScoped<INotificationFilterRepository, NotificationFilterRepository>();
builder.Services.AddScoped<IVisitEventRepository, VisitEventRepository>();
builder.Services.AddScoped<IVisitorKnownIpRepository, VisitorKnownIpRepository>();
builder.Services.AddScoped<IVisitorDailyStatRepository, VisitorDailyStatRepository>();

// ----------------------------
// 5️⃣ Dependency Injection - Services
// ----------------------------
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IIncomeService, IncomeService>();
builder.Services.AddScoped<IReasonTypeService, ReasonTypeService>();
builder.Services.AddScoped<ISemesterMetadataService, SemesterMetadataService>();
builder.Services.AddScoped<ISystemConfigurationService, SystemConfigurationService>();
builder.Services.AddScoped<ICourseScheduleService, CourseScheduleService>();
builder.Services.AddScoped<ICourseScheduleImportService, CourseScheduleImportService>();
builder.Services.AddScoped<ICourseScheduleUehSyncService, CourseScheduleUehSyncService>();
builder.Services.AddScoped<IPhoneNotificationService, PhoneNotificationService>();
builder.Services.AddScoped<INotificationFilterService, NotificationFilterService>();
builder.Services.AddScoped<ICurrentInfoService, CurrentInfoService>();
builder.Services.AddScoped<ISpeechToTextService, SpeechToTextService>();
builder.Services.AddScoped<IUehStudentScheduleService, UehStudentScheduleService>();
builder.Services.AddScoped<IThemeSettingService, ThemeSettingService>();
builder.Services.AddScoped<IRequestEnrichmentService, RequestEnrichmentService>();
builder.Services.AddScoped<IVisitorLogSettingsService, VisitorLogSettingsService>();
builder.Services.AddScoped<IVisitEventService, VisitEventService>();
builder.Services.AddScoped<IVisitorAnalyticsService, VisitorAnalyticsService>();

// Job chạy nền (Hangfire tự resolve trong scope riêng mỗi lần chạy)
builder.Services.AddScoped<IScheduleImportJob, ScheduleImportJob>();
builder.Services.AddScoped<IVisitorLogMaintenanceJob, VisitorLogMaintenanceJob>();
builder.Services.AddScoped<IDemoReseedJob, DemoReseedJob>();
builder.Services.AddScoped<IJobsService, JobsService>();

builder.Services.AddSingleton<IDemoModeService, DemoModeService>();

// Cầu nối để /app điều khiển job demo-reseed như hai job kia: instance thật mở thêm một kho
// Hangfire trỏ vào raspberry_demo (chỉ đẩy việc + đọc lịch sử, không chạy). Bật khi có
// DemoControl:ConnectionString; instance demo đặt chuỗi này rỗng nên Storage = null (không tự nối
// vào chính nó). Xem DemoJobStorageAccessor.
var demoControlConn = builder.Configuration["DemoControl:ConnectionString"];
builder.Services.AddSingleton(_ =>
{
    if (string.IsNullOrEmpty(demoControlConn))
        return new DemoJobStorageAccessor(null);

    var demoStorage = new MySqlStorage(demoControlConn, new MySqlStorageOptions
    {
        TablesPrefix = "Hangfire_",
        // Instance demo tự tạo schema Hangfire trong raspberry_demo; ở đây chỉ đọc/đẩy việc.
        PrepareSchemaIfNecessary = false,
        QueuePollInterval = TimeSpan.FromSeconds(5)
    });
    return new DemoJobStorageAccessor(demoStorage);
});

// GeoIp là Singleton: file .mmdb chỉ mở một lần, DatabaseReader vốn thread-safe.
builder.Services.AddSingleton<IGeoIpService, GeoIpService>();
// AI Provider: đọc từ config để chọn Gemini hoặc Ollama
var aiProvider = builder.Configuration.GetValue<string>("AiProvider") ?? "Gemini";
if (string.Equals(aiProvider, "Ollama", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IAiExpenseService, OllamaExpenseService>();
}
else
{
    builder.Services.AddScoped<IAiExpenseService, GeminiExpenseService>();
}

// ----------------------------
// 6️⃣ HttpClientFactory (cho Ollama/Gemini)
// ----------------------------
builder.Services.AddHttpClient();

// ----------------------------
// 6.5 Dependency Injection - User & Auth
// ----------------------------
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Quên mật khẩu bằng OTP: OtpStore giữ mã trong RAM (Singleton), service xử lý luồng (Scoped).
builder.Services.AddSingleton<IOtpStore, OtpStore>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();

// ----------------------------
// 6.6 JWT Authentication
// ----------------------------
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// ----------------------------
// 7️⃣ Các service mặc định
// ----------------------------
builder.Services.AddControllers();
// Rate limit theo IP: Auth/* trên cả hai instance, cộng trần cho request ghi trên demo.
builder.Services.AddLifeHubRateLimiting(isDemo);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// ButtonListener cần GPIO nên chỉ chạy được trên Pi. Mặc định: bật khi Linux, tắt khi dev Windows.
// Ghi đè bằng "ButtonListener:Enabled" trong appsettings nếu cần tắt/bật thủ công.
var buttonListenerEnabled = builder.Configuration.GetValue<bool?>("ButtonListener:Enabled") ?? OperatingSystem.IsLinux();
if (buttonListenerEnabled)
{
    builder.Services.AddHostedService<ButtonListener>();
}

// ----------------------------
// Zalo: gửi tin nhắn qua Playwright (Chromium hệ thống trên Pi).
// ----------------------------
// Singleton vì Zalo Web chỉ cho một phiên web/tài khoản: manager tự nối tiếp mọi thao tác browser
// và đóng sạch sau mỗi lần dùng cho nhẹ RAM. Tự tắt khi không phải Linux (xem ZaloSessionManager).
builder.Services.Configure<ZaloOptions>(builder.Configuration.GetSection("Zalo"));
builder.Services.AddSingleton<IZaloSessionManager, ZaloSessionManager>();

var app = builder.Build();

// ----------------------------
// Đăng ký job định kỳ cho Hangfire
// ----------------------------
// Cron thay cho IntervalMinutes cũ.
// Phải lấy IRecurringJobManager từ DI chứ không dùng API tĩnh RecurringJob.AddOrUpdate:
// JobStorage.Current chỉ được gán khi Hangfire server khởi động (tức là sau app.Run()),
// nên gọi API tĩnh ở đây sẽ ném "Current JobStorage instance has not been initialized yet".
try
{
    using var jobScope = app.Services.CreateScope();
    var recurringJobManager = jobScope.ServiceProvider.GetRequiredService<IRecurringJobManager>();

    // Sync UEH thật và dọn visitor log thật: không đăng ký trên instance demo, vì nó dùng
    // UehLogin thật (kéo lịch học thật vào raspberry_demo) và không có gì để dọn cả.
    if (!isDemo)
    {
        var scheduleImportCron = builder.Configuration["HangfireJobs:ScheduleImportCron"] ?? Cron.Hourly();

        // Cho phép override qua System Configuration (key "ScheduleImportCron") mà không cần sửa
        // appsettings/redeploy - chỉ áp dụng lúc khởi động app, không reload runtime.
        var dbContext = jobScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var scheduleImportCronOverride = dbContext.SystemConfigurations
            .FirstOrDefault(c => c.KeyConfig == "ScheduleImportCron")?.ValueConfig;

        var startupLogger = jobScope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        if (!string.IsNullOrWhiteSpace(scheduleImportCronOverride))
        {
            // Cronos (bundled trong Hangfire.Core) là internal nên không gọi thẳng để validate được -
            // validate bằng cách thử AddOrUpdate với giá trị override trước; nếu cú pháp sai, Hangfire
            // tự ném exception ở đây và ta fallback về appsettings/mặc định thay vì để sập cả app.
            try
            {
                recurringJobManager.AddOrUpdate<IScheduleImportJob>(
                    JobDefinitions.ScheduleImportRecurringId,
                    job => job.RunAsync(),
                    scheduleImportCronOverride);
                scheduleImportCron = scheduleImportCronOverride;
            }
            catch (Exception ex)
            {
                startupLogger.LogWarning(ex,
                    "ScheduleImportCron trong System Configuration không hợp lệ ('{Value}'), dùng lại giá trị appsettings/mặc định.",
                    scheduleImportCronOverride);

                recurringJobManager.AddOrUpdate<IScheduleImportJob>(
                    JobDefinitions.ScheduleImportRecurringId,
                    job => job.RunAsync(),
                    scheduleImportCron);
            }
        }
        else
        {
            recurringJobManager.AddOrUpdate<IScheduleImportJob>(
                JobDefinitions.ScheduleImportRecurringId,
                job => job.RunAsync(),
                scheduleImportCron);
        }

        var visitorLogMaintenanceCron = builder.Configuration["HangfireJobs:VisitorLogMaintenanceCron"] ?? "0 */6 * * *";
        recurringJobManager.AddOrUpdate<IVisitorLogMaintenanceJob>(
            JobDefinitions.VisitorLogMaintenanceRecurringId,
            job => job.RunAsync(),
            visitorLogMaintenanceCron);
    }

    // Ngược lại: job seed data giả chỉ đăng ký trên instance demo. Đây cũng là chốt an toàn thứ
    // hai (ngoài guard DemoMode trong chính job) chống việc nó lỡ chạy xóa data thật.
    if (isDemo)
    {
        // Hangfire không tự xóa recurring job đã đăng ký từ lần chạy trước. Gỡ hẳn hai job của bản
        // thật khỏi kho demo, phòng khi chúng từng được đăng ký ở đây (sync UEH thật, dọn log thật).
        recurringJobManager.RemoveIfExists(JobDefinitions.ScheduleImportRecurringId);
        recurringJobManager.RemoveIfExists(JobDefinitions.VisitorLogMaintenanceRecurringId);

        var demoReseedCron = builder.Configuration["HangfireJobs:DemoReseedCron"] ?? "0 3 * * *";
        recurringJobManager.AddOrUpdate<IDemoReseedJob>(
            JobDefinitions.DemoReseedRecurringId,
            job => job.RunAsync(),
            demoReseedCron,
            new RecurringJobOptions { TimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time") });
    }
}
catch (Exception ex)
{
    // Cùng thái độ với khối migration ở trên: job hỏng thì API vẫn phải phục vụ được.
    Console.WriteLine($"⚠️ Hangfire recurring job registration failed: {ex.Message}");
}

// ----------------------------
// Auto-apply EF Core migrations khi khởi động
// ----------------------------
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Seed default notification filters
    var filterService = scope.ServiceProvider.GetRequiredService<INotificationFilterService>();
    filterService.SeedDefaults();

    // Seed cấu hình mặc định cho visitor log (lưu trong bảng systemConfiguration)
    var visitorLogSettingsService = scope.ServiceProvider.GetRequiredService<IVisitorLogSettingsService>();
    visitorLogSettingsService.SeedDefaults();

    // Email admin mặc định nhận OTP (có thể cấu hình qua Auth:AdminEmail hoặc sửa trong quản lý user).
    var adminEmail = builder.Configuration["Auth:AdminEmail"] ?? "ptp.phamphong@gmail.com";

    // Seed default user if no users exist
    if (!db.Users.Any())
    {
        var defaultPasswordHash = builder.Configuration["Auth:PasswordHash"];
        var defaultUsername = builder.Configuration["Auth:Username"] ?? "admin";
        db.Users.Add(new API_Raspberry.Model.User
        {
            Username = defaultUsername,
            Password = defaultPasswordHash,
            Name = defaultUsername,
            Email = adminEmail,
            Active = true
        });
        db.SaveChanges();
    }
    else
    {
        // DB cũ đã có user nhưng cột Email vừa được thêm (null): điền email admin mặc định
        // cho các tài khoản chưa có email, nếu không thì luồng quên mật khẩu không gửi được OTP.
        var usersWithoutEmail = db.Users.Where(u => u.Email == null || u.Email == "").ToList();
        if (usersWithoutEmail.Count > 0)
        {
            foreach (var u in usersWithoutEmail)
                u.Email = adminEmail;
            db.SaveChanges();
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"⚠️ Migration failed: {ex.Message}");
}

// ----------------------------
// 6️⃣ Middleware
// ----------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Caddy xử lý HTTPS, API chỉ cần HTTP nội bộ

// Phải đứng ĐẦU pipeline: middleware sau đó (và mọi controller) mới thấy được IP thật
// của khách thay vì 127.0.0.1 của Caddy.
app.UseForwardedHeaders();

// Routing tường minh: CORS, cổng demo và rate limiter phía sau đều cần biết endpoint đã khớp.
app.UseRouting();

// 🔥 Thêm dòng này để bật CORS (quan trọng)
app.UseCors("AllowAll");

// Cổng allowlist của demo: sau CORS (preflight vẫn 204, response 404 vẫn có header CORS), trước
// Authentication (trả 404 chứ không phải 401). Bản thật không đăng ký middleware này.
if (isDemo)
{
    app.UseMiddleware<DemoGateMiddleware>();
}

// Sau UseForwardedHeaders nên phân theo IP thật của khách.
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ----------------------------
// Dashboard Hangfire: KHÔNG mở ra ngoài internet, chỉ vào qua SSH tunnel.
// ----------------------------
// AllowAnonymous là BẮT BUỘC chứ không phải nới lỏng bảo mật: dashboard là endpoint nên bị
// FallbackPolicy JWT của app áp vào, mà app chỉ nhận bearer token — trình duyệt mở URL không
// đính token được nên sẽ luôn 401, kể cả khi đã tunnel vào. Bỏ JWT ra rồi để LocalRequestsOnly
// làm cổng gác:
//   - Vào qua SSH tunnel (ssh -L 5000:127.0.0.1:5000): Kestrel thấy IP loopback thật -> cho vào.
//   - Vào qua Caddy từ internet: UseForwardedHeaders đã thay RemoteIpAddress bằng IP thật của
//     khách nên khác loopback -> chặn.
// Caddyfile chặn sẵn /api/hangfire* thêm một lớp nữa, phòng khi Caddy ngừng gửi X-Forwarded-For
// thì mọi request lại trông như loopback. Xem Information_AI/22_feature-hangfire-jobs.md.
app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new LocalRequestsOnlyAuthorizationFilter() }
}).AllowAnonymous();

// ----------------------------
// 7️⃣ Lắng nghe cổng nội bộ cố định cho Caddy reverse proxy
// ----------------------------
if (isDemo)
{
    // Ghi ra log đúng danh sách route đang mở trên demo, để soát nhanh sau mỗi lần deploy.
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        var allowed = app.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<AllowInDemoAttribute>() != null)
            .Select(e => $"{string.Join(",", e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? Array.Empty<string>())} /{e.RoutePattern.RawText}")
            .OrderBy(r => r)
            .ToList();
        app.Logger.LogInformation("Demo allowlist: {Count} route được mở:\n  {Routes}", allowed.Count, string.Join("\n  ", allowed));
    });
}

//app.Run("http://127.0.0.1:5000");
    app.Run();

