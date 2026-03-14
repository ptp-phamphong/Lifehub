using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IReasonTypeService
    {
        List<ReasonTypeDto> GetAllReasonType();
        void AddReasonType(ReasonTypeCreateDto dto);
        ReasonTypeDto GetReasonTypeById(int id);
        void UpdateReasonType(int id, ReasonTypeUpdateDto dto);
    }

    public class ReasonTypeService : IReasonTypeService
    {
        private readonly IReasonTypeRepository _reasonTypeRepository;
        private readonly IReasonTypeMapper _reasonTypeMapper;

        public ReasonTypeService(IReasonTypeRepository reasonTypeRepository, IReasonTypeMapper reasonTypeMapper)
        {
            _reasonTypeRepository = reasonTypeRepository;
            _reasonTypeMapper = reasonTypeMapper;
        }

        public List<ReasonTypeDto> GetAllReasonType()
        {
            var entities = _reasonTypeRepository.GetAllReasonType();
            return _reasonTypeMapper.ToDtoList(entities);
        }

        public void AddReasonType(ReasonTypeCreateDto dto)
        {
            _reasonTypeRepository.AddReasonType(dto);
        }

        public ReasonTypeDto GetReasonTypeById(int id)
        {
            var entity = _reasonTypeRepository.GetReasonTypeById(id);
            return _reasonTypeMapper.ToDto(entity);
        }

        public void UpdateReasonType(int id, ReasonTypeUpdateDto dto)
        {
            _reasonTypeRepository.UpdateReasonType(id, dto);
        }
    }
}
