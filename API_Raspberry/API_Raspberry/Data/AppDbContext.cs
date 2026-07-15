using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<ExpenseRecord> ExpenseRecords { get; set; }
        public DbSet<IncomeRecord> IncomeRecords { get; set; }
        public DbSet<ReasonType> ReasonTypes { get; set; }
        public DbSet<SemesterMetadata> SemesterMetadatas { get; set; }
        public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
        public DbSet<CourseSchedule> CourseSchedules { get; set; }
        public DbSet<PhoneNotification> PhoneNotifications { get; set; }
        public DbSet<NotificationFilter> NotificationFilters { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<VisitEvent> VisitEvents { get; set; }
        public DbSet<VisitorKnownIp> VisitorKnownIps { get; set; }
        public DbSet<VisitorDailyStat> VisitorDailyStats { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ExpenseRecord
            modelBuilder.Entity<ExpenseRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Reason).IsRequired();
                entity.Property(e => e.Amount).IsRequired();

                entity.HasOne(e => e.ReasonType)
                      .WithMany()
                      .HasForeignKey(e => e.ReasonTypeId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // IncomeRecord
            modelBuilder.Entity<IncomeRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Reason).IsRequired();
                entity.Property(e => e.Amount).IsRequired();
            });

            // ReasonType
            modelBuilder.Entity<ReasonType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ReasonName).IsRequired();
                entity.Property(e => e.DefaultFilterType).HasDefaultValue(1);
            });

            // SemesterMetadata
            modelBuilder.Entity<SemesterMetadata>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SemesterName).IsRequired();
                entity.Property(e => e.CodeSemester).IsRequired();
                entity.Property(e => e.Year).IsRequired();
            });

            // SystemConfiguration
            modelBuilder.Entity<SystemConfiguration>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.KeyConfig).IsRequired();
                entity.Property(e => e.ValueConfig).IsRequired();
            });

            // CourseSchedule
            modelBuilder.Entity<CourseSchedule>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CourseName).IsRequired();
                entity.Property(e => e.CourseCode).IsRequired();

                entity.HasOne(e => e.SemesterMetadata)
                      .WithMany()
                      .HasForeignKey(e => e.SemesterMetadataId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // PhoneNotification
            modelBuilder.Entity<PhoneNotification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.App).IsRequired();
                // NotificationKey là định danh chuẩn từ Android cho cùng notification.
                // entity.HasIndex(e => e.NotificationKey)
                //     .IsUnique()
                //     .HasFilter("`NotificationKey` IS NOT NULL");
                // Unique index trên (App, AndroidTime) để chặn duplicate khi mở chat bubble.
                // MySQL cho phép nhiều NULL trong UNIQUE index nên record cũ (không có AndroidTime) không bị ảnh hưởng.
                entity.HasIndex(e => new { e.App, e.AndroidTime })
                    //   .IsUnique()
                      .HasFilter("`AndroidTime` IS NOT NULL");
            });

            // NotificationFilter
            modelBuilder.Entity<NotificationFilter>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FilterType).IsRequired();
                entity.Property(e => e.FilterValue).IsRequired();
            });

            // User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired();
                entity.Property(e => e.Password).IsRequired();
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.Active).HasDefaultValue(true);
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // VisitEvent - bảng dữ liệu thô, sẽ lớn nhất trong DB nên index rất quan trọng.
            modelBuilder.Entity<VisitEvent>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Path).IsRequired();

                // Query mặc định của bảng: lọc theo khoảng ngày + khu vực, sắp xếp theo thời gian giảm dần.
                entity.HasIndex(e => new { e.VisitedAt, e.Area });

                // Màn hình "khách quay lại": gộp theo VisitorId.
                entity.HasIndex(e => new { e.VisitorId, e.VisitedAt });

                // Lọc / loại trừ theo IP.
                entity.HasIndex(e => e.IpAddress);
            });

            // VisitorKnownIp - đánh dấu traffic của chính mình.
            modelBuilder.Entity<VisitorKnownIp>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.IsSelf).HasDefaultValue(true);
                entity.HasIndex(e => e.IpAddress);
                entity.HasIndex(e => e.VisitorId);
            });

            // VisitorDailyStat - số liệu tổng hợp theo ngày.
            modelBuilder.Entity<VisitorDailyStat>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Path).IsRequired();
                entity.Property(e => e.CountryCode).IsRequired();

                // Mỗi (ngày, khu vực, trang, quốc gia) chỉ có đúng một dòng.
                entity.HasIndex(e => new { e.Date, e.Area, e.Path, e.CountryCode }).IsUnique();
            });
        }
    }
}
