using API_Raspberry.Model;
using System.Diagnostics;

namespace API_Raspberry.Service
{
    public interface ICurrentInfoService
    {
        SystemInfo GetSystemStatus();
    }

    public class CurrentInfoService : ICurrentInfoService
    {
        private readonly IDemoModeService _demoMode;

        public CurrentInfoService(IDemoModeService demoMode)
        {
            _demoMode = demoMode;
        }


        public SystemInfo GetSystemStatus()
        {
            // vcgencmd/free/df chạy qua /usr/bin/bash nên chỉ có trên Pi.
            // Khi dev trên Windows, trả số liệu giả để UI vẫn render được thay vì lỗi 500.
            // Trên instance demo cũng trả số liệu giả (dù chạy trên chính con Pi thật), vì bản demo
            // dùng data giả nên số liệu phần cứng thật trộn vào sẽ không nhất quán.
            if (!OperatingSystem.IsLinux() || _demoMode.IsDemo)
            {
                return new SystemInfo
                {
                    CpuTemperature = "42.0",
                    RamAvailable = "1.5GiB available (demo)",
                    MemoryAvailable = "12GB free (demo)"
                };
            }

            try
            {
                string cpu = RunCommand("/usr/bin/vcgencmd measure_temp | cut -d'=' -f2 | tr -d \"'C\"");
                string ram = RunCommand("free -h | grep Mem | awk '{print $7\"B available\"}'");
                string disk = RunCommand("df -h / | awk 'NR==2 {print $4\"B free\"}'");

                return new SystemInfo
                {
                    CpuTemperature = cpu,
                    RamAvailable = ram,
                    MemoryAvailable = disk
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Error retrieving system status: " + ex.Message);
            }
        }

        private string RunCommand(string cmd)
        {
            var psi = new ProcessStartInfo
            {
                FileName = "/usr/bin/bash",
                Arguments = $"-c \"{cmd.Replace("\"", "\\\"")}\"", // escape an toàn
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            string output = process.StandardOutput.ReadToEnd().Trim();
            string error = process.StandardError.ReadToEnd().Trim();
            process.WaitForExit();

            if (!string.IsNullOrEmpty(error))
                return $"ERR:{error}";

            return output;
        }

    }
}
