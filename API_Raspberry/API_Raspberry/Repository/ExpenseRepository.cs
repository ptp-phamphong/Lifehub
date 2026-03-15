using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using Microsoft.EntityFrameworkCore;

namespace API_Raspberry.Repository
{
    public interface IExpenseRepository
    {
        int AddExpense(ExpenseRecord expense);
        List<ExpenseRecord> GetAllExpenses(ParamFilter paramFilter);
        ExpenseRecord GetExpenseById(int id);
        void UpdateExpense(int id, ExpenseRecordUpdateDto dto);
        void DeleteById(int id);
        int SumAll();
        int SumAllWithFilter(ParamFilter paramFilter);
        List<ExpenseRecord> GetExpensesByMonth(int month, int year);
        int SumByMonth(ParamFilter paramFilter, int month, int year);
        int SumByWeek(ParamFilter paramFilter, DateTime startOfWeek, DateTime endOfWeek);
    }

    public class ExpenseRepository : IExpenseRepository
    {
        private readonly AppDbContext _context;
        private readonly IExpenseRecordMapper _expenseRecordMapper;

        public ExpenseRepository(AppDbContext context, IExpenseRecordMapper expenseRecordMapper)
        {
            _context = context;
            _expenseRecordMapper = expenseRecordMapper;
        }

        public int AddExpense(ExpenseRecord expense)
        {
            _context.ExpenseRecords.Add(expense);
            _context.SaveChanges();
            return expense.Id;
        }

        public List<ExpenseRecord> GetAllExpenses(ParamFilter paramFilter)
        {
            IQueryable<ExpenseRecord> query = _context.ExpenseRecords.AsQueryable();

            // 1. Filter tháng
            if (paramFilter.Month.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Month == paramFilter.Month.Value);
            }

            // 2. Filter năm
            if (paramFilter.Year.HasValue)
            {
                query = query.Where(e => e.CreatedDate.HasValue && e.CreatedDate.Value.Year == paramFilter.Year.Value);
            }

            // 3. Filter ReasonTypeIds IN
            if (paramFilter.ReasonTypeIdsFilterIn != null && paramFilter.ReasonTypeIdsFilterIn.Any())
            {
                query = query.Where(e => e.ReasonTypeId.HasValue && paramFilter.ReasonTypeIdsFilterIn.Contains(e.ReasonTypeId.Value));
            }

            // 4. Filter ReasonTypeIds NOT IN
            if (paramFilter.ReasonTypeIdsFilterOut != null && paramFilter.ReasonTypeIdsFilterOut.Any())
            {
                query = query.Where(e => !e.ReasonTypeId.HasValue || !paramFilter.ReasonTypeIdsFilterOut.Contains(e.ReasonTypeId.Value));
            }

            return query.OrderByDescending(e => e.CreatedDate).ToList();
        }

        public ExpenseRecord GetExpenseById(int id)
        {
            return _context.ExpenseRecords.FirstOrDefault(e => e.Id == id);
        }

        public void UpdateExpense(int id, ExpenseRecordUpdateDto dto)
        {
            var existing = _context.ExpenseRecords.Find(id);
            if (existing != null)
            {
                _expenseRecordMapper.UpdateEntity(existing, dto);
                _context.SaveChanges();
            }
        }

        public void DeleteById(int id)
        {
            var existing = _context.ExpenseRecords.Find(id);
            if (existing != null)
            {
                _context.ExpenseRecords.Remove(existing);
                _context.SaveChanges();
            }
        }

        public int SumAll()
        {
            return _context.ExpenseRecords.Sum(e => e.Amount);
        }

        public int SumAllWithFilter(ParamFilter paramFilter)
        {
            IQueryable<ExpenseRecord> query = _context.ExpenseRecords.AsQueryable();

            if (paramFilter.ReasonTypeIdsFilterIn != null && paramFilter.ReasonTypeIdsFilterIn.Any())
            {
                query = query.Where(e => e.ReasonTypeId.HasValue && paramFilter.ReasonTypeIdsFilterIn.Contains(e.ReasonTypeId.Value));
            }

            if (paramFilter.ReasonTypeIdsFilterOut != null && paramFilter.ReasonTypeIdsFilterOut.Any())
            {
                query = query.Where(e => !e.ReasonTypeId.HasValue || !paramFilter.ReasonTypeIdsFilterOut.Contains(e.ReasonTypeId.Value));
            }

            return query.Sum(e => e.Amount);
        }

        public List<ExpenseRecord> GetExpensesByMonth(int month, int year)
        {
            return _context.ExpenseRecords
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

            IQueryable<ExpenseRecord> query = _context.ExpenseRecords
                .Where(e => e.CreatedDate.HasValue
                         && e.CreatedDate.Value.Month == finalMonth
                         && e.CreatedDate.Value.Year == finalYear);

            if (paramFilter.ReasonTypeIdsFilterIn != null && paramFilter.ReasonTypeIdsFilterIn.Any())
            {
                query = query.Where(e => e.ReasonTypeId.HasValue && paramFilter.ReasonTypeIdsFilterIn.Contains(e.ReasonTypeId.Value));
            }

            if (paramFilter.ReasonTypeIdsFilterOut != null && paramFilter.ReasonTypeIdsFilterOut.Any())
            {
                query = query.Where(e => !e.ReasonTypeId.HasValue || !paramFilter.ReasonTypeIdsFilterOut.Contains(e.ReasonTypeId.Value));
            }

            return query.Sum(e => e.Amount);
        }

        public int SumByWeek(ParamFilter paramFilter, DateTime startOfWeek, DateTime endOfWeek)
        {
            IQueryable<ExpenseRecord> query = _context.ExpenseRecords
                .Where(e => e.CreatedDate.HasValue
                         && e.CreatedDate.Value >= startOfWeek
                         && e.CreatedDate.Value < endOfWeek);

            if (paramFilter.ReasonTypeIdsFilterIn != null && paramFilter.ReasonTypeIdsFilterIn.Any())
            {
                query = query.Where(e => e.ReasonTypeId.HasValue && paramFilter.ReasonTypeIdsFilterIn.Contains(e.ReasonTypeId.Value));
            }

            if (paramFilter.ReasonTypeIdsFilterOut != null && paramFilter.ReasonTypeIdsFilterOut.Any())
            {
                query = query.Where(e => !e.ReasonTypeId.HasValue || !paramFilter.ReasonTypeIdsFilterOut.Contains(e.ReasonTypeId.Value));
            }

            return query.Sum(e => e.Amount);
        }
    }
}
