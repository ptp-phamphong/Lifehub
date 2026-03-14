using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ReasonTypeController : ControllerBase
    {
        private readonly IReasonTypeService _reasonTypeService;

        public ReasonTypeController(IReasonTypeService reasonTypeService)
        {
            _reasonTypeService = reasonTypeService;
        }

        [HttpPost]
        [Route("ReasonType")]
        public bool AddReasonType([FromBody] ReasonTypeCreateDto reasonType)
        {
            _reasonTypeService.AddReasonType(reasonType);
            return true;
        }

        [HttpGet]
        [Route("GetAllReasonType")]
        public List<ReasonTypeDto> GetAllReasonType()
        {
            return _reasonTypeService.GetAllReasonType();
        }

        [HttpGet]
        [Route("GetReasonTypeById/{id}")]
        public ReasonTypeDto GetReasonTypeById(int id)
        {
            return _reasonTypeService.GetReasonTypeById(id);
        }

        [HttpPut]
        [Route("UpdateReasonTypeById/{id}")]
        public bool UpdateReasonTypeById(int id, [FromBody] ReasonTypeUpdateDto reasonType)
        {
            _reasonTypeService.UpdateReasonType(id, reasonType);
            return true;
        }
    }
}
