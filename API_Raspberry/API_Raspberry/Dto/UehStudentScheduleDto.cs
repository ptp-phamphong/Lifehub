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

    // Một phần tử trong danh sách tuần trả về từ /Home/GetWeek/{year}${term}.
    public class UehWeekDto
    {
        // Tuần ISO trong năm dương lịch; đây là giá trị truyền vào param Week của DrawingSchedules.
        // KHÔNG unique: một học kỳ vắt qua giao thừa sẽ có Week lặp lại (xem plan 20, §3.1).
        public int Week { get; set; }

        // Số tuần portal hiển thị trong dropdown.
        public int DisPlayWeek { get; set; }

        // Tuần ISO hiện tại; portal dùng để chọn mặc định. Không dùng cho import.
        public int WeekOfYear { get; set; }
    }

    public class UehWeekListResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? YearStudy { get; set; }
        public string TermId { get; set; }
        public List<UehWeekDto> Weeks { get; set; }
    }

    public class UehWeekScheduleResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? YearStudy { get; set; }
        public string TermId { get; set; }
        public int Week { get; set; }
        public string ScheduleHtml { get; set; }
    }

    public class UehWeekHtmlDto
    {
        public int Week { get; set; }
        public string Html { get; set; }
    }

    public class UehAllWeeksResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? YearStudy { get; set; }
        public string TermId { get; set; }
        public int SemesterMetadataId { get; set; }
        public int WeeksScanned { get; set; }
        public List<UehWeekHtmlDto> Weeks { get; set; }
    }
}
