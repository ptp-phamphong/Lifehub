using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Service;
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

        [HttpPost]
        [Route("ExpenseNote")]
        public bool ExpenseNote([FromBody] ExpenseRecordCreateDto note)
        {
            _expenseService.AddExpense(note);
            return true;
        }

        [HttpPost]
        [Route("GetAllExpenseNote")]
        public List<ExpenseRecordDto> GetAllExpenseNote([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.GetAllExpenses(paramFilter);
        }

        [HttpGet]
        [Route("SumAll")]
        public int SumAll()
        {
            return _expenseService.SumAll();
        }

        [HttpPost]
        [Route("SumAllWithFilter")]
        public int SumAllWithFilter([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumAllWithFilter(paramFilter);
        }

        [HttpGet]
        [Route("GetExpenseById/{id}")]
        public ExpenseRecordDto GetExpenseById(int id)
        {
            return _expenseService.GetExpenseById(id);
        }

        [HttpPut]
        [Route("UpdateById/{id}")]
        public bool UpdateById(int id, [FromBody] ExpenseRecordUpdateDto note)
        {
            _expenseService.UpdateExpense(id, note);
            return true;
        }

        [HttpDelete]
        [Route("DeleteById/{id}")]
        public bool DeleteById(int id)
        {
            _expenseService.DeleteExpense(id);
            return true;
        }

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

        [HttpPost]
        [Route("SumByCurrentMonth")]
        public int SumByCurrentMonth([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumByCurrentMonth(paramFilter);
        }

        [HttpPost]
        [Route("SumByCurrentWeek")]
        public int SumByCurrentWeek([FromBody] ParamFilter paramFilter)
        {
            return _expenseService.SumByCurrentWeek(paramFilter);
        }
    }
}
