using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class ThemeSettingController : ControllerBase
    {
        private readonly IThemeSettingService _themeSettingService;

        public ThemeSettingController(IThemeSettingService themeSettingService)
        {
            _themeSettingService = themeSettingService;
        }

        [HttpGet]
        [Route("GetThemeSetting")]
        public ThemeSettingDto GetThemeSetting()
        {
            return _themeSettingService.GetThemeSetting();
        }

        [HttpPut]
        [Route("UpdateThemeSetting")]
        public bool UpdateThemeSetting([FromBody] ThemeSettingDto dto)
        {
            _themeSettingService.UpdateThemeSetting(dto);
            return true;
        }
    }
}
