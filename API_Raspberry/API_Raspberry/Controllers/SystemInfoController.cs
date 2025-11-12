using API_Raspberry.Model;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SystemInfoController : ControllerBase
    {

        private readonly ILogger<SystemInfoController> _logger;

        public SystemInfoController(ILogger<SystemInfoController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        [Route("SystemInfo")]
        public SystemInfo Get()
        {
            return new CurrentInfoService().GetSystemStatus();
        }
    }
}
