using API_Raspberry.Model;
using API_Raspberry.Repository;
using System.Data.SQLite;

namespace API_Raspberry.Service
{
    public class ExpenseService
    {

        public void AddExpense(ExpenseRecord expense)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.AddExpense(expense);
        }

        public List<Model.ExpenseRecord> GetAllExpenses(ParamFilter paramFilter)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            var result = expenseRepository.GetAllExpenses(paramFilter);

            ReasonTypeRepository reasonTypeRepository = new ReasonTypeRepository();
            List<ReasonType> reasonTypes = reasonTypeRepository.GetAllReasonType();
            foreach (var expense in result)
            {
                if (expense.ReasonTypeId.HasValue)
                {
                    expense.ReasonType = reasonTypes.FirstOrDefault(rt => rt.Id == expense.ReasonTypeId.Value);
                }
            }

            // LINQ sorting
            if (!string.IsNullOrEmpty(paramFilter.SortColumn))
            {
                bool isDesc = string.Equals(paramFilter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

                result = paramFilter.SortColumn.ToLower() switch
                {
                    "id" => isDesc
                        ? result.OrderByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.Id).ToList(),
                    "createddate" => isDesc
                        ? result.OrderByDescending(e => e.CreatedDate).ToList()
                        : result.OrderBy(e => e.CreatedDate).ToList(),
                    "reason" => isDesc
                        ? result.OrderByDescending(e => e.Reason).ToList()
                        : result.OrderBy(e => e.Reason).ToList(),
                    "reasontype" => isDesc
                        ? result.OrderByDescending(e => e.ReasonType?.ReasonName ?? "").ToList()
                        : result.OrderBy(e => e.ReasonType?.ReasonName ?? "").ToList(),
                    "amount" => isDesc
                        ? result.OrderByDescending(e => e.Amount).ToList()
                        : result.OrderBy(e => e.Amount).ToList(),
                    _ => result
                };
            }

            return result;
        }

        public Model.ExpenseRecord GetExpenseById(int id)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.GetExpenseById(id);
        }

        public void UpdateExpense(int id, ExpenseRecord expense)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.UpdateExpense(id, expense);
        }

        public void DeleteExpense(int id)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.DeleteById(id);
        }

        public int SumAll()
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.SumAll();
        }

        public int SumAllWithFilter(ParamFilter paramFilter)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.SumAllWithFilter(paramFilter);
        }

        public List<Model.ExpenseRecord> GetExpensesByMonth(int month, int year)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.GetExpensesByMonth(month, year);
        }

        public int SumByMonth(int month, int year)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.SumByMonth(new ParamFilter(), month, year);
        }

        public int SumByCurrentMonth(ParamFilter paramFilter)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            var now = DateTime.Now;
            return expenseRepository.SumByMonth(paramFilter, now.Month, now.Year);
        }

        public int SumByCurrentWeek(ParamFilter paramFilter)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            var today = DateTime.Today;
            // Calculate Monday of the current week
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = today.AddDays(-diff).Date;
            var endOfWeek = startOfWeek.AddDays(7).Date; // Next Monday (exclusive)
            return expenseRepository.SumByWeek(paramFilter, startOfWeek, endOfWeek);
        }
    }
}
