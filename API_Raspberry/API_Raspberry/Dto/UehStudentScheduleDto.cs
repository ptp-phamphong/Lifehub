namespace API_Raspberry.Dto
{
    public class UehStudentScheduleRequestDto
    {
        public bool SaveLogin { get; set; } = true;
    }

    public class UehStudentScheduleResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? YearStudy { get; set; }
        public string TermId { get; set; }
        public string LoginPageToken { get; set; }
        public string ScheduleHtml { get; set; }
    }
}
