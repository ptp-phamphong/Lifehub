using System.Collections;

namespace API_Raspberry.Service
{
    /// <summary>
    /// Kiểm tra lúc khởi động instance demo: nếu môi trường còn dính secret hoặc cấu hình của bản
    /// thật thì từ chối khởi động. Lớp chặn này không phụ thuộc vào việc allowlist hay guard trong
    /// service có còn đúng không - demo không cầm secret thật thì không thể dùng nó.
    ///
    /// Chỉ báo TÊN biến/khóa vi phạm, không bao giờ in giá trị.
    /// </summary>
    public static class DemoStartupGuard
    {
        public const string DemoIssuer = "LifeHubDemo";
        public const string DemoAudience = "LifeHubDemoClients";

        // Biến môi trường mà code đọc thẳng bằng Environment.GetEnvironmentVariable (mail, UEH,
        // Azure Whisper). Demo không được có bất kỳ biến nào bắt đầu bằng các tiền tố này.
        private static readonly string[] ForbiddenEnvPrefixes = { "EMAIL_", "UEH_LOGIN_", "AZURE_" };

        // Khóa cấu hình (appsettings hoặc biến môi trường dạng A__B) phải rỗng trên demo.
        // UehLogin:* có mặt ở đây vì UehStudentScheduleService lấy nó làm giá trị dự phòng khi
        // không có UEH_LOGIN_* - bản deploy demo cũ từng mang tài khoản UEH thật theo đường này.
        private static readonly string[] MustBeEmptyKeys =
        {
            "Gemini:ApiKey",
            "DemoControl:ConnectionString",
            "UehLogin:TaiKhoan",
            "UehLogin:MatKhau",
            // Không code nào đọc khóa này nữa, nhưng bản thật vẫn còn đặt AzureAI__APIKey - chặn cho chắc.
            "AzureAI:APIKey",
        };

        /// <summary>Trả về danh sách vấn đề (rỗng = an toàn để khởi động).</summary>
        public static List<string> FindProblems(IConfiguration configuration, IDictionary environmentVariables)
        {
            var problems = new List<string>();

            foreach (DictionaryEntry entry in environmentVariables)
            {
                var name = entry.Key as string;
                if (name == null) continue;
                if (ForbiddenEnvPrefixes.Any(p => name.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
                {
                    problems.Add($"Biến môi trường {name} không được có trên demo.");
                }
            }

            foreach (var key in MustBeEmptyKeys)
            {
                if (!string.IsNullOrEmpty(configuration[key]))
                {
                    problems.Add($"Cấu hình {key} phải rỗng trên demo.");
                }
            }

            // Issuer/Audience riêng: token demo không bao giờ được bản thật chấp nhận, kể cả khi
            // hai bên lỡ dùng chung secret key.
            if (configuration["Jwt:Issuer"] != DemoIssuer)
            {
                problems.Add($"Jwt:Issuer phải là '{DemoIssuer}' trên demo.");
            }
            if (configuration["Jwt:Audience"] != DemoAudience)
            {
                problems.Add($"Jwt:Audience phải là '{DemoAudience}' trên demo.");
            }

            return problems;
        }
    }
}
