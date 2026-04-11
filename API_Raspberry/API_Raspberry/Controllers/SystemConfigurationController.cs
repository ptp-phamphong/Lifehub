using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SystemConfigurationController : ControllerBase
    {
        private readonly ISystemConfigurationService _systemConfigurationService;

        public SystemConfigurationController(ISystemConfigurationService systemConfigurationService)
        {
            _systemConfigurationService = systemConfigurationService;
        }

        [HttpPost]
        [Route("SystemConfiguration")]
        public bool Add([FromBody] SystemConfigurationCreateDto systemConfiguration)
        {
            _systemConfigurationService.Add(systemConfiguration);
            return true;
        }

        [HttpGet]
        [Route("GetAllSystemConfiguration")]
        public List<SystemConfigurationDto> GetAll()
        {
            return _systemConfigurationService.GetAll();
        }

        [HttpGet]
        [Route("GetSystemConfigurationById/{id}")]
        public SystemConfigurationDto GetById(int id)
        {
            return _systemConfigurationService.GetById(id);
        }

        [HttpPut]
        [Route("UpdateSystemConfigurationById/{id}")]
        public bool UpdateById(int id, [FromBody] SystemConfigurationUpdateDto systemConfiguration)
        {
            _systemConfigurationService.Update(id, systemConfiguration);
            return true;
        }

        [HttpDelete]
        [Route("DeleteSystemConfigurationById/{id}")]
        public bool DeleteById(int id)
        {
            _systemConfigurationService.Delete(id);
            return true;
        }
    }
}
