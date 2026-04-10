using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IIncomeRepository
    {
        int AddIncome(IncomeRecord income);
        List<IncomeRecord> GetAllIncomes(ParamFilter paramFilter);
        IncomeRecord GetIncomeById(int id);
        void UpdateIncome(int id, IncomeRecordUpdateDto dto);
        void DeleteById(int id);
        int SumAll();
        int SumAllWithFilter(ParamFilter paramFilter);
        List<IncomeRecord> GetIncomesByMonth(int month, int year);
        int SumByMonth(ParamFilter paramFilter, int month, int year);
        int SumByWeek(ParamFilter paramFilter, DateTime startOfWeek, DateTime endOfWeek);
    }

    public class IncomeRepository : IIncomeRepository
    {
        private readonly AppDbContext _context;

        public IncomeRepository(AppDbContext context)
        {
            _context = context;
        }

        public int AddIncome(IncomeRecord income)
        {
            _context.IncomeRecords.Add(income);
            _context.SaveChanges();
            return income.Id;
        }

        public List<IncomeRecord> GetAllIncomes(ParamFilter paramFilter)
        {
            IQueryable<IncomeRecord> query = _context.IncomeRecords.AsQueryable();

            if (paramFilter.Month.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Month == paramFilter.Month.Value);
            }

            if (paramFilter.Year.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Year == paramFilter.Year.Value);
            }

            return query.OrderByDescending(e => e.CreatedDate).ToList();
        }

        public IncomeRecord GetIncomeById(int id)
        {
            return _context.IncomeRecords.FirstOrDefault(e => e.Id == id);
        }

        public void UpdateIncome(int id, IncomeRecordUpdateDto dto)
        {
            var existing = _context.IncomeRecords.Find(id);
            if (existing != null)
            {
                existing.Reason = dto.Reason;
                existing.Amount = dto.Amount;
                existing.CreatedDate = dto.CreatedDate ?? existing.CreatedDate;
                _context.SaveChanges();
            }
        }

        public void DeleteById(int id)
        {
            var existing = _context.IncomeRecords.Find(id);
            if (existing != null)
            {
                _context.IncomeRecords.Remove(existing);
                _context.SaveChanges();
            }
        }

        public int SumAll()
        {
            return _context.IncomeRecords.Sum(e => e.Amount);
        }

        public int SumAllWithFilter(ParamFilter paramFilter)
        {
            IQueryable<IncomeRecord> query = _context.IncomeRecords.AsQueryable();

            if (paramFilter.Month.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Month == paramFilter.Month.Value);
            }

            if (paramFilter.Year.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Year == paramFilter.Year.Value);
            }

            return query.Sum(e => e.Amount);
        }

        public List<IncomeRecord> GetIncomesByMonth(int month, int year)
        {
            return _context.IncomeRecords
                .Where(e => e.CreatedDate.HasValue
                         && e.CreatedDate.Value.Month == month
                         && e.CreatedDate.Value.Year == year)
                .OrderByDescending(e => e.CreatedDate)
                .ToList();
        }

        public int SumByMonth(ParamFilter paramFilter, int month, int year)
        {
            int finalMonth = paramFilter.Month ?? month;
            int finalYear = paramFilter.Year ?? year;

            IQueryable<IncomeRecord> query = _context.IncomeRecords
                .Where(e => e.CreatedDate.HasValue
                         && e.CreatedDate.Value.Month == finalMonth
                         && e.CreatedDate.Value.Year == finalYear);

            return query.Sum(e => e.Amount);
        }

        public int SumByWeek(ParamFilter paramFilter, DateTime startOfWeek, DateTime endOfWeek)
        {
            IQueryable<IncomeRecord> query = _context.IncomeRecords
                .Where(e => e.CreatedDate.HasValue
                         && e.CreatedDate.Value >= startOfWeek
                         && e.CreatedDate.Value < endOfWeek);

            return query.Sum(e => e.Amount);
        }
    }
}
