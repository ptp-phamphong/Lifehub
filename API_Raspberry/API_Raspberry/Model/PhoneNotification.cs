using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("PhoneNotification")]
    public class PhoneNotification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string App { get; set; }

        public string AppName { get; set; }

        public string Title { get; set; }

        public string Text { get; set; }

        public string Time { get; set; }

        /// <summary>
        /// Thời gian post notification từ Android (sbn.getPostTime() - milliseconds as string).
        /// Dùng để phát hiện duplicate khi user mở chat bubble:
        /// Android re-post cùng notification với cùng postTime → cùng AndroidTime → duplicate.
        /// </summary>
        public string AndroidTime { get; set; }

        /// <summary>
        /// Notification key từ Android (StatusBarNotification.getKey()).
        /// Đây là định danh ổn định cho cùng một notification khi bị update/re-post.
        /// Dùng làm dedup key chính xác hơn AndroidTime.
        /// </summary>
        public string NotificationKey { get; set; }

        /// <summary>
        /// Notification id từ Android (StatusBarNotification.getId()).
        /// Lưu để debug/đối soát khi cần.
        /// </summary>
        public string NotificationId { get; set; }

        /// <summary>
        /// Notification tag từ Android (StatusBarNotification.getTag()).
        /// Lưu để debug/đối soát khi cần.
        /// </summary>
        public string NotificationTag { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
