using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class AiExpenseController : ControllerBase
    {
        private readonly IAiExpenseService _aiExpenseService;
        private readonly IReasonTypeService _reasonTypeService;

        public AiExpenseController(IAiExpenseService aiExpenseService, IReasonTypeService reasonTypeService)
        {
            _aiExpenseService = aiExpenseService;
            _reasonTypeService = reasonTypeService;
        }

        [HttpPost]
        [Route("AiExpense")]
        public async Task<AiExpenseResponseDto> AiExpense([FromBody] AiExpenseRequestDto request)
        {
            var reasonTypes = _reasonTypeService.GetAllReasonType();
            var reasonTypeEntities = reasonTypes.Select(r => new Model.ReasonType
            {
                Id = r.Id,
                ReasonName = r.ReasonName
            }).ToList();

            return await _aiExpenseService.ParseExpenseFromText(request.Prompt, reasonTypeEntities);
        }
    }
}
