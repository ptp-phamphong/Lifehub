using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IVisitorKnownIpMapper
    {
        VisitorKnownIpDto ToDto(VisitorKnownIp entity);
        List<VisitorKnownIpDto> ToDtoList(List<VisitorKnownIp> entities);
        VisitorKnownIp ToEntity(VisitorKnownIpCreateDto dto);
        void UpdateEntity(VisitorKnownIp entity, VisitorKnownIpUpdateDto dto);
    }

    public class VisitorKnownIpMapper : IVisitorKnownIpMapper
    {
        public VisitorKnownIpDto ToDto(VisitorKnownIp entity)
        {
            if (entity == null) return null;

            return new VisitorKnownIpDto
            {
                Id = entity.Id,
                IpAddress = entity.IpAddress,
                VisitorId = entity.VisitorId,
                Label = entity.Label,
                IsSelf = entity.IsSelf,
                CreatedDate = entity.CreatedDate
            };
        }

        public List<VisitorKnownIpDto> ToDtoList(List<VisitorKnownIp> entities)
        {
            if (entities == null) return new List<VisitorKnownIpDto>();
            return entities.Select(ToDto).ToList();
        }

        public VisitorKnownIp ToEntity(VisitorKnownIpCreateDto dto)
        {
            return new VisitorKnownIp
            {
                IpAddress = dto.IpAddress,
                VisitorId = dto.VisitorId,
                Label = dto.Label,
                IsSelf = dto.IsSelf,
                CreatedDate = DateTime.UtcNow
            };
        }

        public void UpdateEntity(VisitorKnownIp entity, VisitorKnownIpUpdateDto dto)
        {
            entity.Label = dto.Label;
            entity.IsSelf = dto.IsSelf;
        }
    }
}
