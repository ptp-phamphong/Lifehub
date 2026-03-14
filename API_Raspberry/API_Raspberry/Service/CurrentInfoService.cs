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

        public CurrentInfoService()
        {
        }


        public SystemInfo GetSystemStatus()
        {
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
