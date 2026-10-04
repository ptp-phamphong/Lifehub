using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API_Raspberry.Dto;
using API_Raspberry.Repository;
using Microsoft.IdentityModel.Tokens;

namespace API_Raspberry.Service
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly IUserRepository _userRepository;

        public AuthService(IConfiguration configuration, IUserRepository userRepository)
        {
            _configuration = configuration;
            _userRepository = userRepository;
        }

        public LoginResponseDto Authenticate(LoginDto login)
        {
            // Body thiếu username/password: trả "sai thông tin" (401) thay vì để EF ném
            // NullReferenceException khi so sánh với null (trước đây thành 500).
            if (login == null || string.IsNullOrWhiteSpace(login.Username) || string.IsNullOrEmpty(login.Password))
                return null;

            var user = _userRepository.GetByUsername(login.Username);

            if (user == null || !user.Active)
                return null;

            if (!BCrypt.Net.BCrypt.Verify(login.Password, user.Password))
                return null;

            var jwtSettings = _configuration.GetSection("Jwt");
            var secretKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expireMinutes = int.Parse(jwtSettings["ExpireMinutes"] ?? "1440");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var expiration = DateTime.UtcNow.AddMinutes(expireMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expiration,
                signingCredentials: credentials
            );

            return new LoginResponseDto
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                Expiration = expiration
            };
        }
    }
}
