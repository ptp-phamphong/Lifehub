using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class ReasonTypeService
    {
        private readonly ReasonTypeRepository _reasonTypeRepository;

        public ReasonTypeService()
        {
            _reasonTypeRepository = new ReasonTypeRepository();
        }

        // Wrapper methods delegating to repository
        public List<ReasonType> GetAllReasonType()
        {
            return _reasonTypeRepository.GetAllReasonType();
        }

        public void AddReasonType(string reasonName)
        {
            _reasonTypeRepository.AddReasonType(reasonName);
        }

        public ReasonType GetReasonTypeById(int id)
        {
            return _reasonTypeRepository.GetReasonTypeById(id);
        }

        public void UpdateReasonType(int id, ReasonType reasonType)
        {
            _reasonTypeRepository.UpdateReasonType(id, reasonType);
        }
    }
}
