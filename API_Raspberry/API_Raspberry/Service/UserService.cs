using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public UserService(IUserRepository userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        /// <summary>
        /// Trên instance demo, tài khoản đăng nhập (Auth:Username) là tài khoản duy nhất và mật khẩu
        /// được công khai chia sẻ cho người xem demo - xóa hoặc đổi mật khẩu nó sẽ khóa luôn người kế
        /// tiếp (và cả người vận hành). DemoReseedJob có tự phục hồi mỗi đêm, nhưng vẫn chặn ngay ở
        /// đây thay vì chờ tới lần chạy tiếp theo.
        /// </summary>
        private void EnsureNotDemoAccount(int userId, string action)
        {
            if (!_configuration.GetValue<bool>("DemoMode")) return;

            var demoUsername = _configuration["Auth:Username"];
            var user = _userRepository.GetById(userId);
            if (user != null && user.Username == demoUsername)
            {
                throw new InvalidOperationException($"Không thể {action} tài khoản demo mặc định.");
            }
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
            EnsureNotDemoAccount(id, "đổi mật khẩu");

            var user = _userRepository.GetById(id);
            if (user == null) return;

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            _userRepository.Update(user);
        }

        public void Delete(int id)
        {
            EnsureNotDemoAccount(id, "xóa");

            _userRepository.Delete(id);
        }
    }
}
