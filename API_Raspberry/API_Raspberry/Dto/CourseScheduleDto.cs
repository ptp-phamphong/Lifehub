namespace API_Raspberry.Dto
{
    public class CourseScheduleDto
    {
        public int Id { get; set; }
        public string CourseName { get; set; }
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

    public class CourseScheduleCreateDto
    {
        public string CourseName { get; set; }
        public string CourseCode { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public string Room { get; set; }
        public string Address { get; set; }
        public string Semester { get; set; }
        public int? DayOfWeek { get; set; }
    }

    public class CourseScheduleUpdateDto
    {
        public string CourseName { get; set; }
        public string CourseCode { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public string Room { get; set; }
        public string Semester { get; set; }
        public string Address { get; set; }
        public int? DayOfWeek { get; set; }
    }
}
