using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IVisitEventMapper
    {
        VisitEventDto ToDto(VisitEvent entity);
        List<VisitEventDto> ToDtoList(List<VisitEvent> entities);
    }

    public class VisitEventMapper : IVisitEventMapper
    {
        // VisitedAt được ghi bằng DateTime.UtcNow, nhưng MySQL không lưu DateTimeKind nên đọc lên là
        // Unspecified -> JSON thiếu "Z" -> trình duyệt hiểu là giờ máy và hiển thị giờ UTC (lệch 7 tiếng).
        public VisitEventDto ToDto(VisitEvent entity)
        {
            if (entity == null) return null;

            return new VisitEventDto
            {
                Id = entity.Id,
                EventType = entity.EventType,
                Area = entity.Area,
                VisitedAt = DateTime.SpecifyKind(entity.VisitedAt, DateTimeKind.Utc),
                VisitorId = entity.VisitorId,
                SessionId = entity.SessionId,
                IpAddress = entity.IpAddress,
                Path = entity.Path,
                Locale = entity.Locale,
                PageTitle = entity.PageTitle,
                Referrer = entity.Referrer,
                ReferrerDomain = entity.ReferrerDomain,
                UtmSource = entity.UtmSource,
                UtmMedium = entity.UtmMedium,
                UtmCampaign = entity.UtmCampaign,
                UserAgent = entity.UserAgent,
                Browser = entity.Browser,
                Os = entity.Os,
                DeviceType = entity.DeviceType,
                IsBot = entity.IsBot,
                CountryCode = entity.CountryCode,
                CountryName = entity.CountryName,
                City = entity.City,
                Language = entity.Language,
                ScreenWidth = entity.ScreenWidth,
                ScreenHeight = entity.ScreenHeight,
                DurationMs = entity.DurationMs,
                Detail = entity.Detail
                // IsSelf / KnownLabel được gán ở repository sau khi so với visitorKnownIp.
            };
        }

        public List<VisitEventDto> ToDtoList(List<VisitEvent> entities)
        {
            if (entities == null) return new List<VisitEventDto>();
            return entities.Select(ToDto).ToList();
        }
    }
}
