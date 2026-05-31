using API_Raspberry.Dto;

namespace API_Raspberry.Service
{
    public interface IUserService
    {
        List<UserDto> GetAll();
        UserDto GetById(int id);
        int Create(UserCreateDto dto);
        void Update(int id, UserUpdateDto dto);
        void ChangePassword(int id, UserChangePasswordDto dto);
        void Delete(int id);
    }
}
