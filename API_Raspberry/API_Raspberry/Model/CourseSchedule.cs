namespace API_Raspberry.Model
{
    public class CourseSchedule
    {
        public int Id { get; set; }
        public string CourseName { get; set; }
        public string CourseCode { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public string Room { get; set; }
        public string Semester { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
