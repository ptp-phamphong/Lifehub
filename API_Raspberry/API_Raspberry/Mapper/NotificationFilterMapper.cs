using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface INotificationFilterMapper
    {
        NotificationFilterDto ToDto(NotificationFilter entity);
        List<NotificationFilterDto> ToDtoList(List<NotificationFilter> entities);
        NotificationFilter ToEntity(NotificationFilterCreateDto dto);
        void UpdateEntity(NotificationFilter entity, NotificationFilterUpdateDto dto);
    }

    public class NotificationFilterMapper : INotificationFilterMapper
    {
        public NotificationFilterDto ToDto(NotificationFilter entity)
        {
            if (entity == null) return null;

            return new NotificationFilterDto
            {
                Id = entity.Id,
                FilterType = entity.FilterType,
                FilterValue = entity.FilterValue,
                Description = entity.Description,
                IsActive = entity.IsActive,
                CreatedDate = entity.CreatedDate,
            };
        }

        public List<NotificationFilterDto> ToDtoList(List<NotificationFilter> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public NotificationFilter ToEntity(NotificationFilterCreateDto dto)
        {
            return new NotificationFilter
            {
                FilterType = dto.FilterType,
                FilterValue = dto.FilterValue,
                Description = dto.Description,
                IsActive = true,
                CreatedDate = DateTime.Now,
            };
        }

        public void UpdateEntity(NotificationFilter entity, NotificationFilterUpdateDto dto)
        {
            entity.FilterValue = dto.FilterValue;
            entity.Description = dto.Description;
            entity.IsActive = dto.IsActive;
        }
    }
}
