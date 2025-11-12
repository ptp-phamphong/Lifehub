using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ExpenseRecordController : ControllerBase
    {
        private readonly ILogger<ExpenseRecordController> _logger;

        public ExpenseRecordController(ILogger<ExpenseRecordController> logger)
        {
            _logger = logger;
        }

        [HttpPost]
        [Route("ExpenseNote")]
        public bool ExpenseNote([FromBody] ExpenseRecord note)
        {
            try
            {
                ExpenseService expenseService = new ExpenseService();
                expenseService.AddExpense(note.Reason, note.Amount);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while adding expense note");
                return false;
            }
        }

        [HttpGet]
        [Route("GetAllExpenseNote")]
        public List<Model.ExpenseRecord> GetAllExpenseNote()
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.GetAllExpenses();
        }
    }
}
