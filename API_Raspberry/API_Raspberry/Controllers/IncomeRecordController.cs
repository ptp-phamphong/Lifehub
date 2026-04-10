using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class IncomeRecordController : ControllerBase
    {
        private readonly IIncomeService _incomeService;

        public IncomeRecordController(IIncomeService incomeService)
        {
            _incomeService = incomeService;
        }

        [HttpPost]
        [Route("IncomeNote")]
        public int IncomeNote([FromBody] IncomeRecordCreateDto note)
        {
            return _incomeService.AddIncome(note);
        }

        [HttpPost]
        [Route("GetAllIncomeNote")]
        public List<IncomeRecordDto> GetAllIncomeNote([FromBody] ParamFilter paramFilter)
        {
            return _incomeService.GetAllIncomes(paramFilter);
        }

        [HttpGet]
        [Route("SumAllIncome")]
        public int SumAllIncome()
        {
            return _incomeService.SumAll();
        }

        [HttpPost]
        [Route("SumAllIncomeWithFilter")]
        public int SumAllIncomeWithFilter([FromBody] ParamFilter paramFilter)
        {
            return _incomeService.SumAllWithFilter(paramFilter);
        }

        [HttpGet]
        [Route("GetIncomeById/{id}")]
        public IncomeRecordDto GetIncomeById(int id)
        {
            return _incomeService.GetIncomeById(id);
        }

        [HttpPut]
        [Route("UpdateIncomeById/{id}")]
        public bool UpdateIncomeById(int id, [FromBody] IncomeRecordUpdateDto note)
        {
            _incomeService.UpdateIncome(id, note);
            return true;
        }

        [HttpDelete]
        [Route("DeleteIncomeById/{id}")]
        public bool DeleteIncomeById(int id)
        {
            _incomeService.DeleteIncome(id);
            return true;
        }

        [HttpGet]
        [Route("GetIncomesByMonth/{month}/{year}")]
        public List<IncomeRecordDto> GetIncomesByMonth(int month, int year)
        {
            return _incomeService.GetIncomesByMonth(month, year);
        }

        [HttpGet]
        [Route("SumIncomeByMonth/{month}/{year}")]
        public int SumIncomeByMonth(int month, int year)
        {
            return _incomeService.SumByMonth(month, year);
        }

        [HttpPost]
        [Route("SumIncomeByCurrentMonth")]
        public int SumIncomeByCurrentMonth([FromBody] ParamFilter paramFilter)
        {
            return _incomeService.SumByCurrentMonth(paramFilter);
        }

        [HttpPost]
        [Route("SumIncomeByCurrentWeek")]
        public int SumIncomeByCurrentWeek([FromBody] ParamFilter paramFilter)
        {
            return _incomeService.SumByCurrentWeek(paramFilter);
        }
    }
}
