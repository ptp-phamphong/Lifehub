using API_Raspberry.Dto;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class VisitorLogSettings
    {
        public bool Enabled { get; set; } = true;
        public int RetentionDays { get; set; } = 180;
        public bool ExcludeSelfByDefault { get; set; } = true;
        public bool ExcludeBotsByDefault { get; set; } = true;
    }

    public interface IVisitorLogSettingsService
    {
        VisitorLogSettings Get();
        void SeedDefaults();
    }

    /// <summary>
    /// Cấu hình visitor log dùng lại bảng systemConfiguration có sẵn (key-value),
    /// nên có thể sửa ngay trong tab "Cấu hình đặc biệt" mà không cần deploy lại.
    /// </summary>
    public class VisitorLogSettingsService : IVisitorLogSettingsService
    {
        public const string KeyEnabled = "VisitorLog.Enabled";
        public const string KeyRetentionDays = "VisitorLog.RetentionDays";
        public const string KeyExcludeSelf = "VisitorLog.ExcludeSelfByDefault";
        public const string KeyExcludeBots = "VisitorLog.ExcludeBotsByDefault";

        private readonly ISystemConfigurationRepository _systemConfigurationRepository;

        public VisitorLogSettingsService(ISystemConfigurationRepository systemConfigurationRepository)
        {
            _systemConfigurationRepository = systemConfigurationRepository;
        }

        public VisitorLogSettings Get()
        {
            var settings = new VisitorLogSettings();

            var all = _systemConfigurationRepository.GetAll();

            settings.Enabled = ReadBool(all, KeyEnabled, true);
            settings.RetentionDays = ReadInt(all, KeyRetentionDays, 180);
            settings.ExcludeSelfByDefault = ReadBool(all, KeyExcludeSelf, true);
            settings.ExcludeBotsByDefault = ReadBool(all, KeyExcludeBots, true);

            // 0 hoặc âm nghĩa là "giữ mãi mãi" -> dùng giá trị đủ lớn để không bao giờ xóa.
            if (settings.RetentionDays <= 0)
                settings.RetentionDays = int.MaxValue;

            return settings;
        }

        public void SeedDefaults()
        {
            var all = _systemConfigurationRepository.GetAll();

            AddIfMissing(all, KeyEnabled, "true");
            AddIfMissing(all, KeyRetentionDays, "180");
            AddIfMissing(all, KeyExcludeSelf, "true");
            AddIfMissing(all, KeyExcludeBots, "true");
        }

        private void AddIfMissing(List<Model.SystemConfiguration> all, string key, string value)
        {
            if (all.Any(c => string.Equals(c.KeyConfig, key, StringComparison.OrdinalIgnoreCase)))
                return;

            _systemConfigurationRepository.Add(new SystemConfigurationCreateDto
            {
                KeyConfig = key,
                ValueConfig = value
            });
        }

        private static string ReadValue(List<Model.SystemConfiguration> all, string key)
        {
            return all.FirstOrDefault(c => string.Equals(c.KeyConfig, key, StringComparison.OrdinalIgnoreCase))?.ValueConfig;
        }

        private static bool ReadBool(List<Model.SystemConfiguration> all, string key, bool fallback)
        {
            var raw = ReadValue(all, key);
            if (string.IsNullOrWhiteSpace(raw)) return fallback;

            raw = raw.Trim();
            if (bool.TryParse(raw, out var parsed)) return parsed;

            // Chấp nhận cả "1"/"0" cho tiện gõ tay trong UI cấu hình.
            if (raw == "1") return true;
            if (raw == "0") return false;

            return fallback;
        }

        private static int ReadInt(List<Model.SystemConfiguration> all, string key, int fallback)
        {
            var raw = ReadValue(all, key);
            if (string.IsNullOrWhiteSpace(raw)) return fallback;
            return int.TryParse(raw.Trim(), out var parsed) ? parsed : fallback;
        }
    }
}
