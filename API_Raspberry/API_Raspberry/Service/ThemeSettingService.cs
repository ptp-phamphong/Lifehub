using API_Raspberry.Data;
using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Service
{
    public interface IThemeSettingService
    {
        ThemeSettingDto GetThemeSetting();
        void UpdateThemeSetting(ThemeSettingDto dto);
    }

    public class ThemeSettingService : IThemeSettingService
    {
        private const string KEY_WEB_DARK = "THEME_WEB_DARK";
        private const string KEY_MOBILE_DARK = "THEME_MOBILE_DARK";

        private readonly AppDbContext _context;

        public ThemeSettingService(AppDbContext context)
        {
            _context = context;
        }

        public ThemeSettingDto GetThemeSetting()
        {
            var configs = _context.SystemConfigurations
                .Where(c => c.KeyConfig == KEY_WEB_DARK || c.KeyConfig == KEY_MOBILE_DARK)
                .ToList();

            var webDark = configs.FirstOrDefault(c => c.KeyConfig == KEY_WEB_DARK);
            var mobileDark = configs.FirstOrDefault(c => c.KeyConfig == KEY_MOBILE_DARK);

            return new ThemeSettingDto
            {
                WebDarkMode = webDark != null && webDark.ValueConfig == "true",
                MobileDarkMode = mobileDark != null && mobileDark.ValueConfig == "true"
            };
        }

        public void UpdateThemeSetting(ThemeSettingDto dto)
        {
            UpsertConfig(KEY_WEB_DARK, dto.WebDarkMode ? "true" : "false");
            UpsertConfig(KEY_MOBILE_DARK, dto.MobileDarkMode ? "true" : "false");
            _context.SaveChanges();
        }

        private void UpsertConfig(string key, string value)
        {
            var existing = _context.SystemConfigurations.FirstOrDefault(c => c.KeyConfig == key);
            if (existing != null)
            {
                existing.ValueConfig = value;
            }
            else
            {
                _context.SystemConfigurations.Add(new SystemConfiguration
                {
                    KeyConfig = key,
                    ValueConfig = value
                });
            }
        }
    }
}
