using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IPhoneNotificationService
    {
        int Add(PhoneNotificationCreateDto dto);
        List<PhoneNotificationDto> GetAll(string sortBy, string sortDirection);
        void DeleteById(int id);
        void DeleteAll();
    }

    public class PhoneNotificationService : IPhoneNotificationService
    {
        private readonly IPhoneNotificationRepository _repository;
        private readonly IPhoneNotificationMapper _mapper;

        public PhoneNotificationService(IPhoneNotificationRepository repository, IPhoneNotificationMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public int Add(PhoneNotificationCreateDto dto)
        {
            var entity = _mapper.ToEntity(dto);
            return _repository.Add(entity);
        }

        public List<PhoneNotificationDto> GetAll(string sortBy, string sortDirection)
        {
            var entities = _repository.GetAll(sortBy, sortDirection);
            return _mapper.ToDtoList(entities);
        }

        public void DeleteById(int id)
        {
            _repository.DeleteById(id);
        }

        public void DeleteAll()
        {
            _repository.DeleteAll();
        }
    }
}
