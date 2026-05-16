using API_Raspberry.Dto;

namespace API_Raspberry.Service
{
    public interface IAuthService
    {
        LoginResponseDto Authenticate(LoginDto login);
    }
}
