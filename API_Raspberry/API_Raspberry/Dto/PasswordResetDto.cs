namespace API_Raspberry.Dto
{
    /// <summary>
    /// Bước 1: người dùng nhập username để yêu cầu gửi mã OTP về email của họ.
    /// </summary>
    public class ForgotPasswordRequestDto
    {
        public string Username { get; set; }
    }

    /// <summary>
    /// Phản hồi bước 1: báo đã gửi OTP kèm email đã được che bớt (vd: p***@gmail.com)
    /// để UI hiển thị cho người dùng biết mã đã gửi đi đâu.
    /// </summary>
    public class ForgotPasswordResponseDto
    {
        public string Message { get; set; }
        public string MaskedEmail { get; set; }
    }

    /// <summary>
    /// Bước 2: người dùng nhập mã OTP nhận qua email + mật khẩu mới để đặt lại.
    /// </summary>
    public class ResetPasswordDto
    {
        public string Username { get; set; }
        public string Otp { get; set; }
        public string NewPassword { get; set; }
    }
}
