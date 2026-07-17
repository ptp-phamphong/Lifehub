using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public List<UserDto> GetAll()
        {
            return _userRepository.GetAll().Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Name = u.Name,
                Email = u.Email,
                Active = u.Active
            }).ToList();
        }

        public UserDto GetById(int id)
        {
            var user = _userRepository.GetById(id);
            if (user == null) return null;

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Name = user.Name,
                Email = user.Email,
                Active = user.Active
            };
        }

        public int Create(UserCreateDto dto)
        {
            var user = new User
            {
                Username = dto.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Name = dto.Name,
                Email = dto.Email,
                Active = true
            };

            return _userRepository.Add(user);
        }

        public void Update(int id, UserUpdateDto dto)
        {
            var user = _userRepository.GetById(id);
            if (user == null) return;

            user.Name = dto.Name;
            user.Email = dto.Email;
            user.Active = dto.Active;
            _userRepository.Update(user);
        }

        public void ChangePassword(int id, UserChangePasswordDto dto)
        {
            var user = _userRepository.GetById(id);
            if (user == null) return;

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            _userRepository.Update(user);
        }

        public void Delete(int id)
        {
            _userRepository.Delete(id);
        }
    }
}
