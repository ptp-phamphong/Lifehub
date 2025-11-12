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
    }
}
