using API_Raspberry.Model;
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
            SystemInfo result = new SystemInfo();
            result.CpuTemperature = "0";
            result.RamAvailable = "0";
            result.MemoryAvailabel = "0";
            return result;
            //return new CurrentInfoService().GetSystemStatus();
        }
    }
}
