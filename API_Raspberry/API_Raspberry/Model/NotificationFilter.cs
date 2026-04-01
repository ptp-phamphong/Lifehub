using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("NotificationFilter")]
    public class NotificationFilter
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// "package" | "keyword" | "flag"
        /// </summary>
        [Required]
        public string FilterType { get; set; }

        /// <summary>
        /// Package: "com.android.systemui"
        /// Keyword: "đang chạy trong nền"
        /// Flag: "ongoing" | "foreground_service" | "no_clear" | "group_summary"
        /// </summary>
        [Required]
        public string FilterValue { get; set; }

        public string Description { get; set; }

        public bool IsActive { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
