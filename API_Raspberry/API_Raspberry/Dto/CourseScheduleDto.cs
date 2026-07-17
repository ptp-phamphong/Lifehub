namespace API_Raspberry.Dto
{
    public class CourseScheduleUehSyncResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int Count { get; set; }
        public int SemesterMetadataId { get; set; }
        public int? YearStudy { get; set; }
        public string TermId { get; set; }

        // Số tuần đã gọi lên portal (đã loại trùng Week).
        public int WeeksScanned { get; set; }

        // Số tuần thực sự có buổi học; phần còn lại là tuần rỗng, bình thường.
        public int WeeksWithData { get; set; }

        public List<CourseScheduleCreateDto> Data { get; set; }
    }

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
        public int? SemesterMetadataId { get; set; }
        public string SemesterName { get; set; }
        public int? SemesterYear { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime? SessionDate { get; set; }
        public int? WeekOfYear { get; set; }
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
        public int? SemesterMetadataId { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime? SessionDate { get; set; }
        public int? WeekOfYear { get; set; }
        public int? DisplayWeek { get; set; }
        public int? StartPeriod { get; set; }
        public int? EndPeriod { get; set; }
        public string ClassCode { get; set; }
        public string Lecturer { get; set; }
        public string LecturerEmail { get; set; }
        public string LearningMode { get; set; }
        public string Language { get; set; }
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
        public int? SemesterMetadataId { get; set; }
        public string Address { get; set; }
        public int? DayOfWeek { get; set; }
        public DateTime? SessionDate { get; set; }
        public int? WeekOfYear { get; set; }
        public int? DisplayWeek { get; set; }
        public int? StartPeriod { get; set; }
        public int? EndPeriod { get; set; }
        public string ClassCode { get; set; }
        public string Lecturer { get; set; }
        public string LecturerEmail { get; set; }
        public string LearningMode { get; set; }
        public string Language { get; set; }
    }
}
