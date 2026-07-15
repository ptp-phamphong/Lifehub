using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    /// <summary>
    /// Đánh dấu IP / VisitorId là "của mình" để lọc khỏi thống kê.
    /// Việc so khớp được thực hiện lúc query (không denormalize vào visitEvent),
    /// nên khi đánh dấu một IP mới thì toàn bộ lượt truy cập cũ của IP đó cũng bị ẩn theo.
    /// </summary>
    [Table("visitorKnownIp")]
    public class VisitorKnownIp
    {
        [Key]
        public int Id { get; set; }

        [MaxLength(45)]
        public string IpAddress { get; set; }

        /// <summary>Cho phép đánh dấu theo trình duyệt thay vì theo IP (IP nhà hay đổi).</summary>
        [MaxLength(64)]
        public string VisitorId { get; set; }

        [MaxLength(255)]
        public string Label { get; set; }

        /// <summary>true = traffic của mình (ẩn mặc định). false = chỉ ghi chú tên cho IP người khác.</summary>
        public bool IsSelf { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
