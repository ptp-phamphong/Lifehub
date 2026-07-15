using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    /// <summary>
    /// Bảng tổng hợp theo ngày. Giữ lại số liệu dài hạn sau khi visitEvent thô bị xóa
    /// theo VisitorLog.RetentionDays.
    /// </summary>
    [Table("visitorDailyStat")]
    public class VisitorDailyStat
    {
        [Key]
        public int Id { get; set; }

        [Column(TypeName = "date")]
        public DateTime Date { get; set; }

        public int Area { get; set; }

        /// <summary>
        /// Giới hạn 191 ký tự (không phải 512 như visitEvent.Path): cột này nằm trong UNIQUE index,
        /// mà InnoDB giới hạn 767 byte cho mỗi cột index ở row format cũ. utf8mb4 tốn 4 byte/ký tự
        /// nên 191 * 4 = 764 byte - vừa đủ an toàn ở mọi cấu hình MySQL/MariaDB.
        /// Path của portfolio ngắn (/en/about) nên không ảnh hưởng gì.
        /// </summary>
        [MaxLength(191)]
        public string Path { get; set; }

        [MaxLength(2)]
        public string CountryCode { get; set; }

        public int Views { get; set; }

        public int UniqueVisitors { get; set; }

        public int Sessions { get; set; }
    }
}
