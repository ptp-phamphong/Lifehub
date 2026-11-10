using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace API_Raspberry.Data
{
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddJsonFile("appsettings.Development.json", optional: true)
                // appsettings chỉ có placeholder rỗng. Để `dotnet ef migrations add` chạy được trên máy dev
                // mà không cần DB thật: ConnectionStrings__DefaultConnection="Server=localhost;Database=x;User=x;Password=x"
                // (Pomelo đã ghim MySqlServerVersion nên không mở kết nối khi chỉ sinh migration).
                .AddEnvironmentVariables()
                .Build();

            var connectionString = configuration.GetConnectionString("DefaultConnection");

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)));

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
