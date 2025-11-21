using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ReasonTypeController : ControllerBase
    {
        public ReasonTypeController() { }

        [HttpPost]
        [Route("ReasonType")]
        public bool AddReasonType([FromBody] ReasonType reasonType)
        {
            ReasonTypeService reasonTypeService = new ReasonTypeService();
            reasonTypeService.AddReasonType(reasonType.ReasonName);
            return true;
        }

        [HttpGet]
        [Route("GetAllReasonType")]
        public List<ReasonType> GetAllReasonType()
        {
            ReasonTypeService reasonTypeService = new ReasonTypeService();
            return reasonTypeService.GetAllReasonType();
        }

        [HttpGet]
        [Route("GetReasonTypeById/{id}")]
        public ReasonType GetReasonTypeById(int id)
        {
            ReasonTypeService reasonTypeService = new ReasonTypeService();
            return reasonTypeService.GetReasonTypeById(id);
        }

        [HttpPut]
        [Route("UpdateReasonTypeById/{id}")]
        public bool UpdateReasonTypeById(int id, [FromBody] ReasonType reasonType)
        {
            ReasonTypeService reasonTypeService = new ReasonTypeService();
            reasonTypeService.UpdateReasonType(id, reasonType);
            return true;
        }
    }
}
