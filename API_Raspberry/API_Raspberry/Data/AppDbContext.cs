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
        public DbSet<CourseSchedule> CourseSchedules { get; set; }
        public DbSet<PhoneNotification> PhoneNotifications { get; set; }
        public DbSet<NotificationFilter> NotificationFilters { get; set; }

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
            });

            // SemesterMetadata
            modelBuilder.Entity<SemesterMetadata>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SemesterName).IsRequired();
                entity.Property(e => e.CodeSemester).IsRequired();
            });

            // CourseSchedule
            modelBuilder.Entity<CourseSchedule>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CourseName).IsRequired();
                entity.Property(e => e.CourseCode).IsRequired();
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
        }
    }
}
