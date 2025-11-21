using API_Raspberry.Model;
using API_Raspberry.Repository;
using System.Data.SQLite;

namespace API_Raspberry.Service
{
    public class ExpenseService
    {

        public void AddExpense(string reason, int amount)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.AddExpense(reason, amount);
        }

        public List<Model.ExpenseRecord> GetAllExpenses()
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.GetAllExpenses();
        }

        public Model.ExpenseRecord GetExpenseById(int id)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.GetExpenseById(id);
        }

        public void UpdateExpense(int id, ExpenseRecord expense)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.UpdateExpense(id, expense.Reason, expense.Amount);
        }

        public void DeleteExpense(int id)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            expenseRepository.DeleteById(id);
        }

        public int SumByMonth(int month, int year)
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            return expenseRepository.SumByMonth(month, year);
        }

        public int SumByCurrentMonth()
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            var now = DateTime.Now;
            return expenseRepository.SumByMonth(now.Month, now.Year);
        }

        public int SumByCurrentWeek()
        {
            ExpenseRepository expenseRepository = new ExpenseRepository();
            var today = DateTime.Today;
            // Calculate Monday of the current week
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = today.AddDays(-diff).Date;
            var endOfWeek = startOfWeek.AddDays(7).Date; // Next Monday (exclusive)
            return expenseRepository.SumByWeek(startOfWeek, endOfWeek);
        }
    }
}
