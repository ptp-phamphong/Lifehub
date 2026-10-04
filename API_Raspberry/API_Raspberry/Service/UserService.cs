using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;
        private readonly IDemoModeService _demoMode;

        public UserService(IUserRepository userRepository, IConfiguration configuration, IDemoModeService demoMode)
        {
            _userRepository = userRepository;
            _configuration = configuration;
            _demoMode = demoMode;
        }

        /// <summary>
        /// Trên instance demo, tài khoản đăng nhập (Auth:Username) là tài khoản duy nhất và mật khẩu
        /// được công khai chia sẻ cho người xem demo - xóa hoặc đổi mật khẩu nó sẽ khóa luôn người kế
        /// tiếp (và cả người vận hành). DemoReseedJob có tự phục hồi mỗi đêm, nhưng vẫn chặn ngay ở
        /// đây thay vì chờ tới lần chạy tiếp theo.
        /// </summary>
        private void EnsureNotDemoAccount(int userId, string action)
        {
            if (!_demoMode.IsDemo) return;

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
                Email = _demoMode.IsDemo ? MaskEmail(u.Email) : u.Email,
                Active = u.Active
            }).ToList();
        }

        // Demo: che email ngay ở server (che ở frontend thì ai gọi thẳng API vẫn đọc được).
        // ptp.phamphong@gmail.com -> p***@gmail.com
        private static string MaskEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return email;

            var parts = email.Split('@', 2);
            var visible = parts[0].Length <= 1 ? parts[0] : parts[0].Substring(0, 1);
            return $"{visible}***@{parts[1]}";
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
            // Lớp chặn thứ hai sau DemoGateMiddleware: user mới trên demo + quên mật khẩu từng là
            // đường gửi mail từ Gmail của chủ repo tới địa chỉ tùy ý.
            if (_demoMode.IsDemo)
                throw new InvalidOperationException("Không thể tạo tài khoản trên bản demo.");

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
            // Update đặt được Active=false, tức là khóa được tài khoản demo dùng chung.
            EnsureNotDemoAccount(id, "sửa");

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
