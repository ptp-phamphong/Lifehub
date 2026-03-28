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
        public DbSet<ReasonType> ReasonTypes { get; set; }
        public DbSet<CourseSchedule> CourseSchedules { get; set; }
        public DbSet<PhoneNotification> PhoneNotifications { get; set; }

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

            // ReasonType
            modelBuilder.Entity<ReasonType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ReasonName).IsRequired();
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
            });
        }
    }
}
