using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Service;
using API_Raspberry.Filters;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SystemInfoController : ControllerBase
    {
        private readonly ICurrentInfoService _currentInfoService;
        private readonly ISystemInfoMapper _systemInfoMapper;

        public SystemInfoController(ICurrentInfoService currentInfoService, ISystemInfoMapper systemInfoMapper)
        {
            _currentInfoService = currentInfoService;
            _systemInfoMapper = systemInfoMapper;
        }

        [AllowInDemo]
        [HttpGet]
        [Route("SystemInfo")]
        public SystemInfoDto Get()
        {
            var entity = _currentInfoService.GetSystemStatus();
            return _systemInfoMapper.ToDto(entity);
        }
    }
}
