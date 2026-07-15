using System.Net;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Responses;

namespace API_Raspberry.Service
{
    public class GeoIpResult
    {
        public string CountryCode { get; set; }
        public string CountryName { get; set; }
        public string City { get; set; }
    }

    public interface IGeoIpService
    {
        GeoIpResult Lookup(string ipAddress);
    }

    /// <summary>
    /// Tra cứu vị trí từ file .mmdb offline (DB-IP City Lite) - không gọi API bên ngoài,
    /// nên IP của khách không bị gửi đi đâu cả.
    ///
    /// Nếu không có file (ví dụ khi dev trên Windows) thì service trả về null
    /// và KHÔNG bao giờ ném exception - tracking không được phép làm hỏng request.
    /// Đường dẫn file: appsettings.json -> GeoIp:DatabasePath
    /// </summary>
    public class GeoIpService : IGeoIpService, IDisposable
    {
        private readonly ILogger<GeoIpService> _logger;
        private readonly DatabaseReader _reader;

        public GeoIpService(IConfiguration configuration, ILogger<GeoIpService> logger)
        {
            _logger = logger;

            var path = configuration.GetValue<string>("GeoIp:DatabasePath");

            if (string.IsNullOrWhiteSpace(path))
            {
                _logger.LogInformation("GeoIp: chưa cấu hình GeoIp:DatabasePath - bỏ qua tra cứu vị trí.");
                return;
            }

            if (!File.Exists(path))
            {
                _logger.LogWarning("GeoIp: không tìm thấy file {Path} - cột quốc gia/thành phố sẽ để trống.", path);
                return;
            }

            try
            {
                // DatabaseReader là thread-safe, mở một lần và dùng lại (đăng ký Singleton).
                _reader = new DatabaseReader(path);
                _logger.LogInformation("GeoIp: đã nạp database {Path}.", path);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GeoIp: không mở được database {Path}.", path);
            }
        }

        public GeoIpResult Lookup(string ipAddress)
        {
            if (_reader == null || string.IsNullOrWhiteSpace(ipAddress))
                return null;

            if (!IPAddress.TryParse(ipAddress, out var parsed))
                return null;

            // IP nội bộ (127.x, 10.x, 192.168.x, Tailscale 100.x) không có trong DB geo.
            if (IsPrivate(parsed))
                return null;

            try
            {
                if (!_reader.TryCity(parsed, out CityResponse city) || city == null)
                    return null;

                return new GeoIpResult
                {
                    CountryCode = city.Country?.IsoCode,
                    CountryName = city.Country?.Name,
                    City = city.City?.Name
                };
            }
            catch (Exception ex)
            {
                // Không log ở mức Error: IP không có trong DB là chuyện bình thường.
                _logger.LogDebug(ex, "GeoIp: tra cứu {Ip} thất bại.", ipAddress);
                return null;
            }
        }

        private static bool IsPrivate(IPAddress ip)
        {
            if (IPAddress.IsLoopback(ip)) return true;

            var bytes = ip.GetAddressBytes();

            // IPv4 private ranges + CGNAT (Tailscale dùng 100.64.0.0/10).
            if (bytes.Length == 4)
            {
                if (bytes[0] == 10) return true;
                if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                if (bytes[0] == 192 && bytes[1] == 168) return true;
                if (bytes[0] == 169 && bytes[1] == 254) return true;
                if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;
                return false;
            }

            // IPv6 link-local (fe80::/10) và unique local (fc00::/7).
            if (ip.IsIPv6LinkLocal) return true;
            if (bytes.Length == 16 && (bytes[0] & 0xFE) == 0xFC) return true;

            return false;
        }

        public void Dispose()
        {
            _reader?.Dispose();
        }
    }
}
