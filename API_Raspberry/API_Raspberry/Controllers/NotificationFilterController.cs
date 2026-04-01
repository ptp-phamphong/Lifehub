using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class NotificationFilterController : ControllerBase
    {
        private readonly INotificationFilterService _service;

        public NotificationFilterController(INotificationFilterService service)
        {
            _service = service;
        }

        [HttpGet]
        [Route("GetAllNotificationFilters")]
        public List<NotificationFilterDto> GetAll()
        {
            return _service.GetAll();
        }

        [HttpGet]
        [Route("GetActiveNotificationFilters")]
        public List<NotificationFilterDto> GetActiveFilters()
        {
            return _service.GetActiveFilters();
        }

        [HttpGet]
        [Route("GetNotificationFilter/{id}")]
        public NotificationFilterDto GetById(int id)
        {
            return _service.GetById(id);
        }

        [HttpPost]
        [Route("AddNotificationFilter")]
        public int Add([FromBody] NotificationFilterCreateDto dto)
        {
            return _service.Add(dto);
        }

        [HttpPut]
        [Route("UpdateNotificationFilter/{id}")]
        public bool Update(int id, [FromBody] NotificationFilterUpdateDto dto)
        {
            _service.Update(id, dto);
            return true;
        }

        [HttpDelete]
        [Route("DeleteNotificationFilter/{id}")]
        public bool Delete(int id)
        {
            _service.DeleteById(id);
            return true;
        }

        [HttpPost]
        [Route("SeedNotificationFilters")]
        public bool SeedDefaults()
        {
            _service.SeedDefaults();
            return true;
        }
    }
}
