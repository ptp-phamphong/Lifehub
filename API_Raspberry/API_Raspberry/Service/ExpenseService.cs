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
    }
}
