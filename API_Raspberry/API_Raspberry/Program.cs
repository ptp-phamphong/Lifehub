var builder = WebApplication.CreateBuilder(args);

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
// 2️⃣ Các service mặc định
// ----------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ----------------------------
// 3️⃣ Middleware
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
// 4️⃣ Lắng nghe trên mọi IP và port 5000
// ----------------------------
app.Run();
//app.Run("http://127.0.0.1:5000");

