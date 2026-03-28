using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class PhoneNotificationController : ControllerBase
    {
        private readonly IPhoneNotificationService _phoneNotificationService;

        public PhoneNotificationController(IPhoneNotificationService phoneNotificationService)
        {
            _phoneNotificationService = phoneNotificationService;
        }

        [HttpPost]
        [Route("AddPhoneNotification")]
        public int Add([FromBody] PhoneNotificationCreateDto dto)
        {
            return _phoneNotificationService.Add(dto);
        }

        [HttpGet]
        [Route("GetAllPhoneNotifications")]
        public List<PhoneNotificationDto> GetAll([FromQuery] string sortBy = "createddate", [FromQuery] string sortDirection = "desc")
        {
            return _phoneNotificationService.GetAll(sortBy, sortDirection);
        }

        [HttpDelete]
        [Route("DeletePhoneNotification/{id}")]
        public bool DeleteById(int id)
        {
            _phoneNotificationService.DeleteById(id);
            return true;
        }

        [HttpDelete]
        [Route("DeleteAllPhoneNotifications")]
        public bool DeleteAll()
        {
            _phoneNotificationService.DeleteAll();
            return true;
        }
    }
}
