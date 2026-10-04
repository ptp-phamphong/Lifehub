using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Service;
using API_Raspberry.Filters;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ExpenseRecordController : ControllerBase
    {
        private readonly IExpenseService _expenseService;

        public ExpenseRecordController(IExpenseService expenseService)
        {
            _expenseService = expenseService;
        }

        [AllowInDemo]
        [HttpPost]
        [Route("ExpenseNote")]
        public int ExpenseNote([FromBody] ExpenseRecordCreateDto note)
        {
            return _expenseService.AddExpense(note);
        }

        [AllowInDemo]
        [HttpPost]
        [Route("GetAllExpenseNote")]
        public List<ExpenseRecordDto> GetAllExpenseNote([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.GetAllExpenses(paramFilter);
        }

        [AllowInDemo]
        [HttpGet]
        [Route("SumAll")]
        public int SumAll()
        {
            return _expenseService.SumAll();
        }

        [AllowInDemo]
        [HttpPost]
        [Route("SumAllWithFilter")]
        public int SumAllWithFilter([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumAllWithFilter(paramFilter);
        }

        [AllowInDemo]
        [HttpGet]
        [Route("GetExpenseById/{id}")]
        public ExpenseRecordDto GetExpenseById(int id)
        {
            return _expenseService.GetExpenseById(id);
        }

        [AllowInDemo]
        [HttpPut]
        [Route("UpdateById/{id}")]
        public bool UpdateById(int id, [FromBody] ExpenseRecordUpdateDto note)
        {
            _expenseService.UpdateExpense(id, note);
            return true;
        }

        [AllowInDemo]
        [HttpDelete]
        [Route("DeleteById/{id}")]
        public bool DeleteById(int id)
        {
            _expenseService.DeleteExpense(id);
            return true;
        }

        [AllowInDemo]
        [HttpGet]
        [Route("GetExpensesByMonth/{month}/{year}")]
        public List<ExpenseRecordDto> GetExpensesByMonth(int month, int year)
        {
            return _expenseService.GetExpensesByMonth(month, year);
        }

        [HttpGet]
        [Route("SumByMonth/{month}/{year}")]
        public int SumByMonth(int month, int year)
        {
            return _expenseService.SumByMonth(month, year);
        }

        [AllowInDemo]
        [HttpPost]
        [Route("SumByCurrentMonth")]
        public int SumByCurrentMonth([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumByCurrentMonth(paramFilter);
        }

        [AllowInDemo]
        [HttpPost]
        [Route("SumByCurrentWeek")]
        public int SumByCurrentWeek([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumByCurrentWeek(paramFilter);
        }
    }
}
