using System.Globalization;
using System.Text.RegularExpressions;
using API_Raspberry.Dto;
using API_Raspberry.Repository;
using ClosedXML.Excel;

namespace API_Raspberry.Service
{
    public interface ICourseScheduleImportService
    {
        List<CourseScheduleCreateDto> ImportFromExcel(Stream fileStream, string semester);
    }

    public class CourseScheduleImportService : ICourseScheduleImportService
    {
        private readonly ICourseScheduleRepository _courseScheduleRepository;

        public CourseScheduleImportService(ICourseScheduleRepository courseScheduleRepository)
        {
            _courseScheduleRepository = courseScheduleRepository;
        }

        public List<CourseScheduleCreateDto> ImportFromExcel(Stream fileStream, string semester)
        {
            var results = new List<CourseScheduleCreateDto>();

            using var workbook = new XLWorkbook(fileStream);
            var worksheet = workbook.Worksheets.First();

            // Row 1 = header, data starts from row 2
            int lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 0;

            for (int row = 2; row <= lastRow; row++)
            {
                var courseName = worksheet.Cell(row, 2).GetString().Trim();
                var courseCode = worksheet.Cell(row, 1).GetString().Trim();

                if (string.IsNullOrEmpty(courseName) || string.IsNullOrEmpty(courseCode))
                    continue;

                var dayOfWeekStr = worksheet.Cell(row, 5).GetString().Trim();
                var timeStr = worksheet.Cell(row, 6).GetString().Trim();
                var room = worksheet.Cell(row, 7).GetString().Trim();
                var weekStr = worksheet.Cell(row, 9).GetString().Trim();
                var address = worksheet.Cell(row, 11).GetString().Trim();

                var dayOfWeek = ParseDayOfWeek(dayOfWeekStr);
                var (startTime, endTime) = ParseTimeRange(timeStr);
                var (startDate, endDate) = ParseDateRange(weekStr);

                var dto = new CourseScheduleCreateDto
                {
                    CourseName = courseName,
                    CourseCode = courseCode,
                    DayOfWeek = dayOfWeek,
                    StartTime = startTime,
                    EndTime = endTime,
                    StartDate = startDate,
                    EndDate = endDate,
                    Room = room,
                    Semester = semester,
                    Address = address,
                };

                results.Add(dto);
            }

            _courseScheduleRepository.AddRange(results);

            return results;
        }

        /// <summary>
        /// "Thứ Hai" → 2, "Thứ Ba" → 3, ..., "Thứ Bảy" → 7, "Chủ Nhật" → 8
        /// </summary>
        private int? ParseDayOfWeek(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "Thứ Hai", 2 },
                { "Thứ Ba", 3 },
                { "Thứ Tư", 4 },
                { "Thứ Năm", 5 },
                { "Thứ Sáu", 6 },
                { "Thứ Bảy", 7 },
                { "Chủ Nhật", 8 }
            };

            foreach (var kv in map)
            {
                if (input.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                    return kv.Value;
            }

            return null;
        }

        /// <summary>
        /// "8->11 (12g45->16g15)" → ("12:45", "16:15")
        /// "2->5 (07g10->10g40)"  → ("07:10", "10:40")
        /// </summary>
        private (string startTime, string endTime) ParseTimeRange(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return (null, null);

            // Match the actual time in parentheses: (HHgMM->HHgMM)
            var match = Regex.Match(input, @"\((\d{1,2})g(\d{2})\s*->\s*(\d{1,2})g(\d{2})\)");
            if (match.Success)
            {
                var startH = match.Groups[1].Value.PadLeft(2, '0');
                var startM = match.Groups[2].Value;
                var endH = match.Groups[3].Value.PadLeft(2, '0');
                var endM = match.Groups[4].Value;
                return ($"{startH}:{startM}", $"{endH}:{endM}");
            }

            return (null, null);
        }

        /// <summary>
        /// "04/07/2026->26/09/2026)" → (2026-07-04, 2026-09-26)
        /// "15/03/2026->07/06/2026)" → (2026-03-15, 2026-06-07)
        /// </summary>
        private (DateTime? startDate, DateTime? endDate) ParseDateRange(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return (null, null);

            // Clean up: remove stray parentheses
            input = input.Replace("(", "").Replace(")", "").Trim();

            var match = Regex.Match(input, @"(\d{2}/\d{2}/\d{4})\s*->\s*(\d{2}/\d{2}/\d{4})");
            if (match.Success)
            {
                var format = "dd/MM/yyyy";
                DateTime.TryParseExact(match.Groups[1].Value, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var start);
                DateTime.TryParseExact(match.Groups[2].Value, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var end);

                return (
                    start == default ? null : start,
                    end == default ? null : end
                );
            }

            return (null, null);
        }
    }
}
