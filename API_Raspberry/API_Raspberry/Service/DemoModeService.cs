namespace API_Raspberry.Service
{
    public interface IDemoModeService
    {
        /// <summary>True khi đây là instance demo công khai (demo.ptp-phamphong.com).</summary>
        bool IsDemo { get; }
    }

    /// <summary>
    /// Một chỗ duy nhất quyết định "đây có phải instance demo không", thay cho việc đọc
    /// DemoMode rải rác. Cố ý an toàn khi lỗi: chỉ cần MỘT trong hai dấu hiệu (DemoMode=true
    /// hoặc ASPNETCORE_ENVIRONMENT=Demo) là coi như demo. Lỡ quên một trong hai thì instance vẫn
    /// bị khóa như demo, chứ không mở toàn bộ API cho tài khoản demo công khai.
    /// Xem document/plans/plan-security-lifehub-demo.md (repo pi-infra).
    /// </summary>
    public class DemoModeService : IDemoModeService
    {
        public const string EnvironmentName = "Demo";

        public DemoModeService(IConfiguration configuration, IHostEnvironment environment)
        {
            IsDemo = Detect(configuration, environment);
        }

        public bool IsDemo { get; }

        /// <summary>Dùng được cả trong Program.cs, trước khi có DI container.</summary>
        public static bool Detect(IConfiguration configuration, IHostEnvironment environment)
            => configuration.GetValue<bool>("DemoMode") || environment.IsEnvironment(EnvironmentName);
    }
}
