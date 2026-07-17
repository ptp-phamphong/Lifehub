using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("users")]
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string Name { get; set; }

        // Email nhận mã OTP khi quên mật khẩu. Mỗi user có email riêng, có thể sửa
        // trong màn hình quản lý user. Admin mặc định được seed ptp.phamphong@gmail.com.
        public string Email { get; set; }

        public bool Active { get; set; } = true;
    }
}
