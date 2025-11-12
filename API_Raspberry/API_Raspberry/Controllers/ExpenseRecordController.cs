using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ExpenseRecordController : ControllerBase
    {

        public ExpenseRecordController()
        {
        }

        [HttpPost]
        [Route("ExpenseNote")]
        public bool ExpenseNote([FromBody] ExpenseRecord note)
        {
            
            ExpenseService expenseService = new ExpenseService();
            expenseService.AddExpense(note.Reason, note.Amount);
            return true;
        }

        [HttpGet]
        [Route("GetAllExpenseNote")]
        public List<Model.ExpenseRecord> GetAllExpenseNote()
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.GetAllExpenses();
        }

        [HttpGet]
        [Route("GetExpenseById/{id}")]
        public ExpenseRecord GetExpenseById(int id)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.GetExpenseById(id);
        }

        [HttpPut]
        [Route("UpdateById/{id}")]
        public bool UpdateById(int id, [FromBody] ExpenseRecord note)
        {
            ExpenseService expenseService = new ExpenseService();
            expenseService.UpdateExpense(id, note);
            return true;
        }

        [HttpDelete]
        [Route("DeleteById/{id}")]
        public bool DeleteById(int id)
        {
            ExpenseService expenseService = new ExpenseService();
            expenseService.DeleteExpense(id);
            return true;
        }
    }
}
