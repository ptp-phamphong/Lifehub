using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    /// <summary>
    /// Phiên đăng nhập cổng sinh viên UEH, do extension Chrome gửi về (xem Extension_Raspberry/).
    /// Từ 04/11/2026 UEH bắt reCAPTCHA nên backend không tự đăng nhập bằng mật khẩu được nữa;
    /// thay vào đó dùng lại cookie phiên mà chính chủ đã tạo trong trình duyệt.
    ///
    /// Bảng chỉ có đúng 1 dòng (Id = 1): cả hệ thống dùng chung một phiên UEH.
    /// CookieHeader KHÔNG được trả ra qua API và KHÔNG được ghi vào log.
    /// </summary>
    [Table("uehPortalSession")]
    public class UehPortalSession
    {
        public const int SingletonId = 1;

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; }

        /// <summary>Chuỗi header Cookie dạng "name=value; name2=value2".</summary>
        [Required]
        public string CookieHeader { get; set; }

        /// <summary>
        /// Lúc phiên này (giá trị ASP.NET_SessionId) được lưu lần đầu (UTC). Gửi lại cùng phiên không đổi
        /// cột này, để UehKeepAliveJob đo được phiên UEH sống bao lâu.
        /// </summary>
        public DateTime SavedAt { get; set; }

        /// <summary>Lần cuối gọi UEH thấy phiên còn sống (UTC).</summary>
        public DateTime LastValidatedAt { get; set; }

        /// <summary>Thời điểm phát hiện phiên đã chết (UTC). Null khi phiên còn sống.</summary>
        public DateTime? ExpiredAt { get; set; }

        public bool IsValid { get; set; }

        public DateTime? LastSyncAt { get; set; }
        public bool? LastSyncSuccess { get; set; }
        public string LastSyncMessage { get; set; }
        public int LastSyncCount { get; set; }
    }
}
