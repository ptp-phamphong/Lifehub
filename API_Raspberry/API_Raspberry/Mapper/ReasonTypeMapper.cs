using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IReasonTypeMapper
    {
        ReasonTypeDto ToDto(ReasonType entity);
        List<ReasonTypeDto> ToDtoList(List<ReasonType> entities);
        ReasonType ToEntity(ReasonTypeCreateDto dto);
        void UpdateEntity(ReasonType entity, ReasonTypeUpdateDto dto);
    }

    public class ReasonTypeMapper : IReasonTypeMapper
    {
        public ReasonTypeDto ToDto(ReasonType entity)
        {
            if (entity == null) return null;

            return new ReasonTypeDto
            {
                Id = entity.Id,
                ReasonName = entity.ReasonName,
                Active = entity.Active,
                SortOrder = entity.SortOrder,
                DefaultFilterType = entity.DefaultFilterType,
            };
        }

        public List<ReasonTypeDto> ToDtoList(List<ReasonType> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public ReasonType ToEntity(ReasonTypeCreateDto dto)
        {
            return new ReasonType
            {
                ReasonName = dto.ReasonName,
                SortOrder = dto.SortOrder,
                Active = true,
                DefaultFilterType = dto.DefaultFilterType,
            };
        }

        public void UpdateEntity(ReasonType entity, ReasonTypeUpdateDto dto)
        {
            entity.ReasonName = dto.ReasonName;
            entity.SortOrder = dto.SortOrder;
            entity.Active = dto.Active;
            entity.DefaultFilterType = dto.DefaultFilterType;
        }
    }
}
