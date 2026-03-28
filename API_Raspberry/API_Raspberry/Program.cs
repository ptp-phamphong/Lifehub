using API_Raspberry.Data;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;
using API_Raspberry.Service;
using Microsoft.EntityFrameworkCore;

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
            .AllowAnyOrigin()    // Cho phép tất cả domain gọi API
            .AllowAnyMethod()    // Cho phép mọi phương thức: GET, POST, PUT, DELETE, ...
            .AllowAnyHeader();   // Cho phép mọi header
    });
});

// ----------------------------
// 2️⃣ Database - Entity Framework + MySQL
// ----------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// ----------------------------
// 3️⃣ Dependency Injection - Mappers
// ----------------------------
builder.Services.AddScoped<IReasonTypeMapper, ReasonTypeMapper>();
builder.Services.AddScoped<IExpenseRecordMapper, ExpenseRecordMapper>();
builder.Services.AddScoped<ICourseScheduleMapper, CourseScheduleMapper>();
builder.Services.AddScoped<IPhoneNotificationMapper, PhoneNotificationMapper>();
builder.Services.AddScoped<ISystemInfoMapper, SystemInfoMapper>();

// ----------------------------
// 4️⃣ Dependency Injection - Repositories
// ----------------------------
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<IReasonTypeRepository, ReasonTypeRepository>();
builder.Services.AddScoped<ICourseScheduleRepository, CourseScheduleRepository>();
builder.Services.AddScoped<IPhoneNotificationRepository, PhoneNotificationRepository>();

// ----------------------------
// 5️⃣ Dependency Injection - Services
// ----------------------------
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IReasonTypeService, ReasonTypeService>();
builder.Services.AddScoped<ICourseScheduleService, CourseScheduleService>();
builder.Services.AddScoped<IPhoneNotificationService, PhoneNotificationService>();
builder.Services.AddScoped<ICurrentInfoService, CurrentInfoService>();
builder.Services.AddScoped<ISpeechToTextService, SpeechToTextService>();
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
// 7️⃣ Các service mặc định
// ----------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHostedService<ButtonListener>();

var app = builder.Build();

// ----------------------------
// Auto-apply EF Core migrations khi khởi động
// ----------------------------
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
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

app.UseHttpsRedirection();

// 🔥 Thêm dòng này để bật CORS (quan trọng)
app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

// ----------------------------
// 7️⃣ Lắng nghe trên mọi IP và port 5000
// ----------------------------
 app.Run();
//app.Run("http://127.0.0.1:5000");

