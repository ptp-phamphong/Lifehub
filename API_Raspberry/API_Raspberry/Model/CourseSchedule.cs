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

        public string Semester { get; set; }

        public int? DayOfWeek { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
