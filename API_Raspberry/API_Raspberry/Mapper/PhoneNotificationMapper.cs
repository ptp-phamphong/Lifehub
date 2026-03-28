using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IPhoneNotificationMapper
    {
        PhoneNotificationDto ToDto(PhoneNotification entity);
        List<PhoneNotificationDto> ToDtoList(List<PhoneNotification> entities);
        PhoneNotification ToEntity(PhoneNotificationCreateDto dto);
    }

    public class PhoneNotificationMapper : IPhoneNotificationMapper
    {
        public PhoneNotificationDto ToDto(PhoneNotification entity)
        {
            if (entity == null) return null;

            return new PhoneNotificationDto
            {
                Id = entity.Id,
                App = entity.App,
                Title = entity.Title,
                Text = entity.Text,
                Time = entity.Time,
                CreatedDate = entity.CreatedDate,
            };
        }

        public List<PhoneNotificationDto> ToDtoList(List<PhoneNotification> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public PhoneNotification ToEntity(PhoneNotificationCreateDto dto)
        {
            return new PhoneNotification
            {
                App = dto.App,
                Title = dto.Title,
                Text = dto.Text,
                Time = dto.Time,
                CreatedDate = DateTime.Now,
            };
        }
    }
}
