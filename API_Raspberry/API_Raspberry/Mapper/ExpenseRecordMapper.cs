using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface IExpenseRecordMapper
    {
        ExpenseRecordDto ToDto(ExpenseRecord entity);
        List<ExpenseRecordDto> ToDtoList(List<ExpenseRecord> entities);
        ExpenseRecord ToEntity(ExpenseRecordCreateDto dto);
        void UpdateEntity(ExpenseRecord entity, ExpenseRecordUpdateDto dto);
    }

    public class ExpenseRecordMapper : IExpenseRecordMapper
    {
        private readonly IReasonTypeMapper _reasonTypeMapper;

        public ExpenseRecordMapper(IReasonTypeMapper reasonTypeMapper)
        {
            _reasonTypeMapper = reasonTypeMapper;
        }

        public ExpenseRecordDto ToDto(ExpenseRecord entity)
        {
            if (entity == null) return null;

            return new ExpenseRecordDto
            {
                Id = entity.Id,
                Reason = entity.Reason,
                Amount = entity.Amount,
                CreatedDate = entity.CreatedDate,
                ReasonTypeId = entity.ReasonTypeId,
                ReasonType = entity.ReasonType != null ? _reasonTypeMapper.ToDto(entity.ReasonType) : null,
            };
        }

        public List<ExpenseRecordDto> ToDtoList(List<ExpenseRecord> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public ExpenseRecord ToEntity(ExpenseRecordCreateDto dto)
        {
            return new ExpenseRecord
            {
                Reason = dto.Reason,
                Amount = dto.Amount,
                CreatedDate = dto.CreatedDate ?? DateTime.Now,
                ReasonTypeId = dto.ReasonTypeId,
            };
        }

        public void UpdateEntity(ExpenseRecord entity, ExpenseRecordUpdateDto dto)
        {
            entity.Reason = dto.Reason;
            entity.Amount = dto.Amount;
            entity.CreatedDate = dto.CreatedDate ?? entity.CreatedDate;
            entity.ReasonTypeId = dto.ReasonTypeId;
        }
    }
}
