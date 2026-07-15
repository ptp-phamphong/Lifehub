using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    /// <summary>Loại sự kiện được ghi nhận.</summary>
    public enum VisitEventType
    {
        PageView = 1,
        LoginSuccess = 2,
        LoginFailed = 3
    }

    /// <summary>Khu vực của site. Chỉ portfolio và trang login được track.</summary>
    public enum VisitArea
    {
        Portfolio = 1,
        AppLogin = 2
    }

    [Table("visitEvent")]
    public class VisitEvent
    {
        [Key]
        public int Id { get; set; }

        public int EventType { get; set; }

        public int Area { get; set; }

        public DateTime VisitedAt { get; set; }

        /// <summary>Id bền vững sinh ở client (localStorage). Đây là khóa để đếm khách quay lại.</summary>
        [MaxLength(64)]
        public string VisitorId { get; set; }

        /// <summary>Id phiên (sessionStorage), reset khi đóng tab.</summary>
        [MaxLength(64)]
        public string SessionId { get; set; }

        /// <summary>Đủ dài cho IPv6 (45 ký tự).</summary>
        [MaxLength(45)]
        public string IpAddress { get; set; }

        [MaxLength(512)]
        public string Path { get; set; }

        [MaxLength(8)]
        public string Locale { get; set; }

        [MaxLength(255)]
        public string PageTitle { get; set; }

        [MaxLength(512)]
        public string Referrer { get; set; }

        [MaxLength(255)]
        public string ReferrerDomain { get; set; }

        [MaxLength(128)]
        public string UtmSource { get; set; }

        [MaxLength(128)]
        public string UtmMedium { get; set; }

        [MaxLength(128)]
        public string UtmCampaign { get; set; }

        [MaxLength(512)]
        public string UserAgent { get; set; }

        [MaxLength(64)]
        public string Browser { get; set; }

        [MaxLength(64)]
        public string Os { get; set; }

        /// <summary>desktop | mobile | tablet | bot | unknown</summary>
        [MaxLength(32)]
        public string DeviceType { get; set; }

        public bool IsBot { get; set; }

        [MaxLength(2)]
        public string CountryCode { get; set; }

        [MaxLength(128)]
        public string CountryName { get; set; }

        [MaxLength(128)]
        public string City { get; set; }

        [MaxLength(16)]
        public string Language { get; set; }

        public int? ScreenWidth { get; set; }

        public int? ScreenHeight { get; set; }

        /// <summary>Thời gian ở lại trang, cập nhật bởi beacon /Visit/Leave.</summary>
        public int? DurationMs { get; set; }

        /// <summary>Với sự kiện login: username đã thử đăng nhập.</summary>
        [MaxLength(255)]
        public string Detail { get; set; }
    }
}
