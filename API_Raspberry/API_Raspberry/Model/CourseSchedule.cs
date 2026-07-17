using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("CourseSchedule")]
    public class CourseSchedule
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string CourseName { get; set; }

        [Required]
        public string CourseCode { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string StartTime { get; set; }

        public string EndTime { get; set; }

        public string Room { get; set; }
        public string Address { get; set; }

        public int? SemesterMetadataId { get; set; }
        public SemesterMetadata SemesterMetadata { get; set; }

        public int? DayOfWeek { get; set; }

        // Ngày chính xác của buổi học. StartDate/EndDate được set bằng giá trị này
        // để query theo khoảng ngày sẵn có vẫn khớp đúng một ngày duy nhất.
        public DateTime? SessionDate { get; set; }

        // Tuần ISO trong năm dương lịch, đúng bằng param Week đã gọi lên portal UEH.
        public int? WeekOfYear { get; set; }

        // Số tuần portal hiển thị trong dropdown; không trùng WeekOfYear.
        public int? DisplayWeek { get; set; }

        public int? StartPeriod { get; set; }

        public int? EndPeriod { get; set; }

        public string ClassCode { get; set; }

        public string Lecturer { get; set; }

        public string LecturerEmail { get; set; }

        public string LearningMode { get; set; }

        public string Language { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
