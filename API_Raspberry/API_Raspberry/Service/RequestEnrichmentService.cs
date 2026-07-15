using System.Text.RegularExpressions;
using UAParser;

namespace API_Raspberry.Service
{
    public class UserAgentInfo
    {
        public string Browser { get; set; }
        public string Os { get; set; }
        public string DeviceType { get; set; }
        public bool IsBot { get; set; }
    }

    public interface IRequestEnrichmentService
    {
        string GetClientIp(HttpContext httpContext);
        UserAgentInfo ParseUserAgent(string userAgent);
        string ExtractReferrerDomain(string referrer);
        string NormalizePath(string rawPath);
        Dictionary<string, string> ExtractUtm(string rawPath);
        string DetectLocale(string normalizedPath, string fallback);
        string Truncate(string value, int maxLength);
    }

    public class RequestEnrichmentService : IRequestEnrichmentService
    {
        private static readonly Parser UaParser = Parser.GetDefault();

        // Crawler thường không chạy JS nên phần lớn đã bị loại từ trước (tracking là beacon phía client).
        // Regex này bắt phần còn lại: bot có headless browser, công cụ CLI, preview link của mạng xã hội.
        private static readonly Regex BotRegex = new Regex(
            @"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|curl|wget|python-requests|java/|okhttp|" +
            @"facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|embedly|" +
            @"preview|monitor|uptime|pingdom|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly string[] KnownLocales = { "en", "vi" };

        /// <summary>
        /// Lấy IP thật của khách. Caddy reverse-proxy nên RemoteIpAddress sẽ là 127.0.0.1
        /// nếu không có UseForwardedHeaders. Program.cs đã bật middleware đó, nhưng ở đây
        /// vẫn đọc trực tiếp X-Forwarded-For làm lớp dự phòng (an toàn hơn là im lặng ghi sai IP).
        /// </summary>
        public string GetClientIp(HttpContext httpContext)
        {
            if (httpContext == null) return null;

            var forwarded = httpContext.Request.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(forwarded))
            {
                // Định dạng: "client, proxy1, proxy2" - phần tử đầu là client thật.
                var first = forwarded.Split(',')[0].Trim();

                // Có thể kèm port ("1.2.3.4:5678") hoặc là IPv6 trong ngoặc ("[::1]:443").
                if (!string.IsNullOrWhiteSpace(first))
                {
                    if (System.Net.IPAddress.TryParse(first, out var direct))
                        return direct.ToString();

                    if (System.Net.IPEndPoint.TryParse(first, out var endpoint))
                        return endpoint.Address.ToString();
                }
            }

            var remote = httpContext.Connection?.RemoteIpAddress;
            if (remote == null) return null;

            // ::ffff:1.2.3.4 -> 1.2.3.4
            if (remote.IsIPv4MappedToIPv6)
                remote = remote.MapToIPv4();

            return remote.ToString();
        }

        public UserAgentInfo ParseUserAgent(string userAgent)
        {
            var result = new UserAgentInfo
            {
                DeviceType = "unknown",
                IsBot = false
            };

            if (string.IsNullOrWhiteSpace(userAgent))
            {
                // Không có UA là dấu hiệu của script/bot.
                result.IsBot = true;
                result.DeviceType = "bot";
                return result;
            }

            if (BotRegex.IsMatch(userAgent))
            {
                result.IsBot = true;
                result.DeviceType = "bot";
            }

            try
            {
                var info = UaParser.Parse(userAgent);

                var browser = info.UA?.Family;
                if (!string.IsNullOrWhiteSpace(browser) && browser != "Other")
                {
                    var version = info.UA.Major;
                    result.Browser = string.IsNullOrWhiteSpace(version) ? browser : $"{browser} {version}";
                }

                var os = info.OS?.Family;
                if (!string.IsNullOrWhiteSpace(os) && os != "Other")
                    result.Os = os;

                if (!result.IsBot)
                {
                    var deviceFamily = info.Device?.Family ?? string.Empty;

                    if (info.Device != null && info.Device.IsSpider)
                    {
                        result.IsBot = true;
                        result.DeviceType = "bot";
                    }
                    else if (deviceFamily.Contains("iPad", StringComparison.OrdinalIgnoreCase)
                          || deviceFamily.Contains("Tablet", StringComparison.OrdinalIgnoreCase)
                          || userAgent.Contains("Tablet", StringComparison.OrdinalIgnoreCase))
                    {
                        result.DeviceType = "tablet";
                    }
                    else if (userAgent.Contains("Mobi", StringComparison.OrdinalIgnoreCase)
                          || userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase)
                          || userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase))
                    {
                        result.DeviceType = "mobile";
                    }
                    else
                    {
                        result.DeviceType = "desktop";
                    }
                }
            }
            catch
            {
                // UA rác thì bỏ qua, giữ nguyên giá trị mặc định.
            }

            return result;
        }

        public string ExtractReferrerDomain(string referrer)
        {
            if (string.IsNullOrWhiteSpace(referrer))
                return "(direct)";

            try
            {
                var uri = new Uri(referrer);
                var host = uri.Host;
                return string.IsNullOrWhiteSpace(host) ? "(direct)" : host;
            }
            catch
            {
                return "(direct)";
            }
        }

        /// <summary>
        /// Chuẩn hóa path: bỏ query, bỏ dấu / ở cuối (portfolio bật trailingSlash),
        /// đảm bảo bắt đầu bằng /. "/en/about/?utm_source=x" -> "/en/about"
        /// </summary>
        public string NormalizePath(string rawPath)
        {
            if (string.IsNullOrWhiteSpace(rawPath))
                return "/";

            var path = rawPath.Trim();

            var queryIndex = path.IndexOf('?');
            if (queryIndex >= 0)
                path = path.Substring(0, queryIndex);

            var hashIndex = path.IndexOf('#');
            if (hashIndex >= 0)
                path = path.Substring(0, hashIndex);

            if (!path.StartsWith("/"))
                path = "/" + path;

            // "/en/about/" -> "/en/about", nhưng giữ "/" cho trang gốc.
            if (path.Length > 1)
                path = path.TrimEnd('/');

            if (string.IsNullOrEmpty(path))
                path = "/";

            return Truncate(path, 512);
        }

        /// <summary>Client gửi path kèm query (location.pathname + location.search) nên UTM đọc được từ đây.</summary>
        public Dictionary<string, string> ExtractUtm(string rawPath)
        {
            var result = new Dictionary<string, string>();

            if (string.IsNullOrWhiteSpace(rawPath))
                return result;

            var queryIndex = rawPath.IndexOf('?');
            if (queryIndex < 0 || queryIndex == rawPath.Length - 1)
                return result;

            var query = rawPath.Substring(queryIndex + 1);

            foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2);
                if (parts.Length != 2) continue;

                var key = Uri.UnescapeDataString(parts[0]).ToLowerInvariant();
                var value = Uri.UnescapeDataString(parts[1]);

                if (key == "utm_source" || key == "utm_medium" || key == "utm_campaign")
                    result[key] = Truncate(value, 128);
            }

            return result;
        }

        public string DetectLocale(string normalizedPath, string fallback)
        {
            if (!string.IsNullOrWhiteSpace(normalizedPath))
            {
                var segments = normalizedPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
                if (segments.Length > 0)
                {
                    var first = segments[0].ToLowerInvariant();
                    if (KnownLocales.Contains(first))
                        return first;
                }
            }

            return Truncate(fallback, 8);
        }

        public string Truncate(string value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return value;
            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
        }
    }
}
