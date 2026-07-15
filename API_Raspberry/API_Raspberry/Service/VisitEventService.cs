using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IVisitEventService
    {
        int Record(VisitEventCreateDto dto, HttpContext httpContext);
        void RecordLeave(VisitLeaveDto dto);
        void RecordLoginAttempt(bool success, string username, HttpContext httpContext);
    }

    public class VisitEventService : IVisitEventService
    {
        /// <summary>Trên 6 tiếng thì gần như chắc chắn là tab bị bỏ quên, không phải người đang đọc.</summary>
        private const int MaxDurationMs = 6 * 60 * 60 * 1000;

        private readonly IVisitEventRepository _visitEventRepository;
        private readonly IVisitorKnownIpRepository _visitorKnownIpRepository;
        private readonly IRequestEnrichmentService _requestEnrichmentService;
        private readonly IGeoIpService _geoIpService;
        private readonly IVisitorLogSettingsService _visitorLogSettingsService;

        public VisitEventService(
            IVisitEventRepository visitEventRepository,
            IVisitorKnownIpRepository visitorKnownIpRepository,
            IRequestEnrichmentService requestEnrichmentService,
            IGeoIpService geoIpService,
            IVisitorLogSettingsService visitorLogSettingsService)
        {
            _visitEventRepository = visitEventRepository;
            _visitorKnownIpRepository = visitorKnownIpRepository;
            _requestEnrichmentService = requestEnrichmentService;
            _geoIpService = geoIpService;
            _visitorLogSettingsService = visitorLogSettingsService;
        }

        public int Record(VisitEventCreateDto dto, HttpContext httpContext)
        {
            if (dto == null) return 0;

            if (!_visitorLogSettingsService.Get().Enabled)
                return 0;

            var area = ParseArea(dto.Area);
            var entity = BuildEntity(VisitEventType.PageView, area, httpContext);

            var rawPath = dto.Path;
            entity.Path = _requestEnrichmentService.NormalizePath(rawPath);
            entity.Locale = _requestEnrichmentService.DetectLocale(entity.Path, dto.Locale);
            entity.PageTitle = _requestEnrichmentService.Truncate(dto.Title, 255);

            entity.Referrer = _requestEnrichmentService.Truncate(dto.Referrer, 512);
            entity.ReferrerDomain = _requestEnrichmentService.Truncate(
                _requestEnrichmentService.ExtractReferrerDomain(dto.Referrer), 255);

            var utm = _requestEnrichmentService.ExtractUtm(rawPath);
            entity.UtmSource = utm.TryGetValue("utm_source", out var source) ? source : null;
            entity.UtmMedium = utm.TryGetValue("utm_medium", out var medium) ? medium : null;
            entity.UtmCampaign = utm.TryGetValue("utm_campaign", out var campaign) ? campaign : null;

            entity.VisitorId = _requestEnrichmentService.Truncate(dto.VisitorId, 64);
            entity.SessionId = _requestEnrichmentService.Truncate(dto.SessionId, 64);
            entity.Language = _requestEnrichmentService.Truncate(dto.Language, 16);
            entity.ScreenWidth = Sanitize(dto.ScreenWidth);
            entity.ScreenHeight = Sanitize(dto.ScreenHeight);

            return _visitEventRepository.Add(entity);
        }

        public void RecordLeave(VisitLeaveDto dto)
        {
            if (dto == null || dto.Id <= 0) return;
            if (dto.DurationMs <= 0) return;

            var duration = dto.DurationMs > MaxDurationMs ? MaxDurationMs : dto.DurationMs;
            _visitEventRepository.UpdateDuration(dto.Id, duration);
        }

        public void RecordLoginAttempt(bool success, string username, HttpContext httpContext)
        {
            if (!_visitorLogSettingsService.Get().Enabled)
                return;

            var eventType = success ? VisitEventType.LoginSuccess : VisitEventType.LoginFailed;
            var entity = BuildEntity(eventType, VisitArea.AppLogin, httpContext);

            entity.Path = "/app/login";
            entity.Detail = _requestEnrichmentService.Truncate(username, 255);

            _visitEventRepository.Add(entity);

            // Đăng nhập thành công = bằng chứng chắc chắn nhất rằng IP này là của chủ site.
            // Nhờ vậy IP nhà đổi động vẫn tự được đánh dấu lại, không cần sửa tay.
            if (success && !string.IsNullOrWhiteSpace(entity.IpAddress))
            {
                var label = $"auto: login {username} {DateTime.UtcNow:yyyy-MM-dd}";
                _visitorKnownIpRepository.UpsertSelfIp(entity.IpAddress, label);
            }
        }

        private VisitEvent BuildEntity(VisitEventType eventType, VisitArea area, HttpContext httpContext)
        {
            var ip = _requestEnrichmentService.GetClientIp(httpContext);
            var userAgent = httpContext?.Request.Headers["User-Agent"].ToString();
            var uaInfo = _requestEnrichmentService.ParseUserAgent(userAgent);
            var geo = _geoIpService.Lookup(ip);

            return new VisitEvent
            {
                EventType = (int)eventType,
                Area = (int)area,
                VisitedAt = DateTime.UtcNow,
                IpAddress = _requestEnrichmentService.Truncate(ip, 45),
                UserAgent = _requestEnrichmentService.Truncate(userAgent, 512),
                Browser = _requestEnrichmentService.Truncate(uaInfo.Browser, 64),
                Os = _requestEnrichmentService.Truncate(uaInfo.Os, 64),
                DeviceType = _requestEnrichmentService.Truncate(uaInfo.DeviceType, 32),
                IsBot = uaInfo.IsBot,
                CountryCode = _requestEnrichmentService.Truncate(geo?.CountryCode, 2),
                CountryName = _requestEnrichmentService.Truncate(geo?.CountryName, 128),
                City = _requestEnrichmentService.Truncate(geo?.City, 128)
            };
        }

        private static VisitArea ParseArea(string area)
        {
            if (string.Equals(area, "AppLogin", StringComparison.OrdinalIgnoreCase))
                return VisitArea.AppLogin;

            return VisitArea.Portfolio;
        }

        /// <summary>Chặn số vô lý từ client (âm hoặc quá lớn) trước khi ghi DB.</summary>
        private static int? Sanitize(int? value)
        {
            if (!value.HasValue) return null;
            if (value.Value <= 0 || value.Value > 20000) return null;
            return value.Value;
        }
    }
}
