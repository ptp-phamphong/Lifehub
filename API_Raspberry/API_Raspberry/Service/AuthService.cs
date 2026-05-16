using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API_Raspberry.Dto;
using Microsoft.IdentityModel.Tokens;

namespace API_Raspberry.Service
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;

        public AuthService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public LoginResponseDto Authenticate(LoginDto login)
        {
            var validUsername = _configuration["Auth:Username"] ?? "admin";
            var validPasswordHash = _configuration["Auth:PasswordHash"];

            if (!string.Equals(login.Username, validUsername, StringComparison.OrdinalIgnoreCase))
                return null;

            if (!BCrypt.Net.BCrypt.Verify(login.Password, validPasswordHash))
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
                new Claim(ClaimTypes.Name, login.Username),
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
