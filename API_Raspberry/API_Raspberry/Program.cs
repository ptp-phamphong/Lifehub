using System.Text;
using API_Raspberry.Data;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
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
                "https://ptp-phamphong-pi.duckdns.org:3443",  // Web production
                "http://localhost:4200",                          // Angular dev
                "http://localhost:8081"                          //  Mobile dev
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
builder.Services.AddScoped<IPhoneNotificationService, PhoneNotificationService>();
builder.Services.AddScoped<INotificationFilterService, NotificationFilterService>();
builder.Services.AddScoped<ICurrentInfoService, CurrentInfoService>();
builder.Services.AddScoped<ISpeechToTextService, SpeechToTextService>();
builder.Services.AddScoped<IUehStudentScheduleService, UehStudentScheduleService>();
builder.Services.AddScoped<IThemeSettingService, ThemeSettingService>();
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
builder.Services.AddHostedService<ButtonListener>();
builder.Services.AddHostedService<ScheduleImportBackgroundService>();

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
            Active = true
        });
        db.SaveChanges();
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

