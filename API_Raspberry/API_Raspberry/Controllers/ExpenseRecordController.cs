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
            expenseService.AddExpense(note);
            return true;
        }

        [HttpPost]
        [Route("GetAllExpenseNote")]
        public List<Model.ExpenseRecord> GetAllExpenseNote([FromBody] ParamFilter paramFilter)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.GetAllExpenses(paramFilter);
        }

        [HttpGet]
        [Route("SumAll")]
        public int SumAll()
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.SumAll();
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

        [HttpGet]
        [Route("GetExpensesByMonth/{month}/{year}")]
        public List<Model.ExpenseRecord> GetExpensesByMonth(int month, int year)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.GetExpensesByMonth(month, year);
        }

        [HttpGet]
        [Route("SumByMonth/{month}/{year}")]
        public int SumByMonth(int month, int year)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.SumByMonth(month, year);
        }

        [HttpPost]
        [Route("SumByCurrentMonth")]
        public int SumByCurrentMonth([FromBody] ParamFilter paramFilter)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.SumByCurrentMonth(paramFilter);
        }

        [HttpPost]
        [Route("SumByCurrentWeek")]
        public int SumByCurrentWeek([FromBody] ParamFilter paramFilter)
        {
            ExpenseService expenseService = new ExpenseService();
            return expenseService.SumByCurrentWeek(paramFilter);
        }
    }
}
