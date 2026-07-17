using System.Net;
using System.Text;
using API_Raspberry.Data;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;
using API_Raspberry.Service;
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
                "https://ptp-phamphong-pi.duckdns.org",  // Web production
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
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// ButtonListener cần GPIO nên chỉ chạy được trên Pi. Mặc định: bật khi Linux, tắt khi dev Windows.
// Ghi đè bằng "ButtonListener:Enabled" trong appsettings nếu cần tắt/bật thủ công.
var buttonListenerEnabled = builder.Configuration.GetValue<bool?>("ButtonListener:Enabled") ?? OperatingSystem.IsLinux();
if (buttonListenerEnabled)
{
    builder.Services.AddHostedService<ButtonListener>();
}

builder.Services.AddHostedService<ScheduleImportBackgroundService>();
builder.Services.AddHostedService<VisitorLogMaintenanceService>();

var app = builder.Build();

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

// 🔥 Thêm dòng này để bật CORS (quan trọng)
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ----------------------------
// 7️⃣ Lắng nghe cổng nội bộ cố định cho Caddy reverse proxy
// ----------------------------
//app.Run("http://127.0.0.1:5000");
    app.Run();

