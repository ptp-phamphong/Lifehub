using API_Raspberry.Data;
using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Repository
{
    public interface IVisitorDailyStatRepository
    {
        List<VisitorDailyStat> GetBetween(DateTime fromDate, DateTime toDate);
        /// <summary>Ghi đè toàn bộ số liệu của một ngày (idempotent - chạy lại bao nhiêu lần cũng ra cùng kết quả).</summary>
        void ReplaceForDate(DateTime date, List<VisitorDailyStat> rows);
    }

    public class VisitorDailyStatRepository : IVisitorDailyStatRepository
    {
        private readonly AppDbContext _context;

        public VisitorDailyStatRepository(AppDbContext context)
        {
            _context = context;
        }

        public List<VisitorDailyStat> GetBetween(DateTime fromDate, DateTime toDate)
        {
            var from = fromDate.Date;
            var to = toDate.Date;

            return _context.VisitorDailyStats
                .Where(s => s.Date >= from && s.Date <= to)
                .OrderBy(s => s.Date)
                .AsNoTracking()
                .ToList();
        }

        public void ReplaceForDate(DateTime date, List<VisitorDailyStat> rows)
        {
            var day = date.Date;

            _context.VisitorDailyStats
                .Where(s => s.Date == day)
                .ExecuteDelete();

            if (rows != null && rows.Any())
                _context.VisitorDailyStats.AddRange(rows);

            _context.SaveChanges();
        }
    }
}
