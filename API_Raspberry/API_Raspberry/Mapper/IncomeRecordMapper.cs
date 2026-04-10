using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IIncomeRecordMapper
    {
        IncomeRecordDto ToDto(IncomeRecord entity);
        List<IncomeRecordDto> ToDtoList(List<IncomeRecord> entities);
        IncomeRecord ToEntity(IncomeRecordCreateDto dto);
        void UpdateEntity(IncomeRecord entity, IncomeRecordUpdateDto dto);
    }

    public class IncomeRecordMapper : IIncomeRecordMapper
    {
        public IncomeRecordDto ToDto(IncomeRecord entity)
        {
            if (entity == null) return null;

            return new IncomeRecordDto
            {
                Id = entity.Id,
                Reason = entity.Reason,
                Amount = entity.Amount,
                CreatedDate = entity.CreatedDate,
            };
        }

        public List<IncomeRecordDto> ToDtoList(List<IncomeRecord> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public IncomeRecord ToEntity(IncomeRecordCreateDto dto)
        {
            return new IncomeRecord
            {
                Reason = dto.Reason,
                Amount = dto.Amount,
                CreatedDate = dto.CreatedDate ?? DateTime.Now,
            };
        }

        public void UpdateEntity(IncomeRecord entity, IncomeRecordUpdateDto dto)
        {
            entity.Reason = dto.Reason;
            entity.Amount = dto.Amount;
            entity.CreatedDate = dto.CreatedDate ?? entity.CreatedDate;
        }
    }
}
