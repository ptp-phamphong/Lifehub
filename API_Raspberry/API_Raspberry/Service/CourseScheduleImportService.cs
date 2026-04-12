using System.Globalization;
using System.Text.RegularExpressions;
using API_Raspberry.Dto;
using API_Raspberry.Repository;
using ClosedXML.Excel;
using HtmlAgilityPack;

namespace API_Raspberry.Service
{
    public interface ICourseScheduleImportService
    {
        List<CourseScheduleCreateDto> ImportFromExcel(Stream fileStream, int? semesterMetadataId);
        List<CourseScheduleCreateDto> ImportFromHtml(string scheduleHtml, int? semesterMetadataId);
    }

    public class CourseScheduleImportService : ICourseScheduleImportService
    {
        private readonly ICourseScheduleRepository _courseScheduleRepository;

        public CourseScheduleImportService(ICourseScheduleRepository courseScheduleRepository)
        {
            _courseScheduleRepository = courseScheduleRepository;
        }

        public List<CourseScheduleCreateDto> ImportFromExcel(Stream fileStream, int? semesterMetadataId)
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
                    SemesterMetadataId = semesterMetadataId,
                    Address = address,
                };

                results.Add(dto);
            }

            _courseScheduleRepository.AddRange(results);

            return results;
        }

        public List<CourseScheduleCreateDto> ImportFromHtml(string scheduleHtml, int? semesterMetadataId)
        {
            var results = new List<CourseScheduleCreateDto>();
            if (string.IsNullOrWhiteSpace(scheduleHtml))
            {
                return results;
            }

            var doc = new HtmlDocument();
            doc.LoadHtml(scheduleHtml);

            var rows = doc.DocumentNode.SelectNodes("//table//tbody//tr");
            if (rows == null || rows.Count == 0)
            {
                return results;
            }

            string currentCourseName = null;
            string currentCourseCode = null;

            foreach (var row in rows)
            {
                var cells = row.SelectNodes("./td");
                if (cells == null || cells.Count == 0)
                {
                    continue;
                }

                // Full row: [STT][CourseInfo][SoTC][MaLop][Thu][Tiet][Phong][Tuan][CoSo][DiaChi]
                if (cells.Count >= 10)
                {
                    var courseInfoCell = cells[1];
                    ParseCourseInfo(courseInfoCell, out currentCourseCode, out currentCourseName);

                    var dto = ParseScheduleRow(
                        currentCourseCode,
                        currentCourseName,
                        cells[4],
                        cells[5],
                        cells[6],
                        cells[7],
                        cells[9],
                        semesterMetadataId,
                        isHtml: true);

                    if (dto != null)
                    {
                        results.Add(dto);
                    }

                    continue;
                }

                // Continuation row (rowspan): [Thu][Tiet][Phong][Tuan][CoSo][DiaChi]
                if (cells.Count >= 6 && !string.IsNullOrWhiteSpace(currentCourseCode) && !string.IsNullOrWhiteSpace(currentCourseName))
                {
                    var dto = ParseScheduleRow(
                        currentCourseCode,
                        currentCourseName,
                        cells[0],
                        cells[1],
                        cells[2],
                        cells[3],
                        cells[5],
                        semesterMetadataId,
                        isHtml: true);

                    if (dto != null)
                    {
                        results.Add(dto);
                    }
                }
            }

            if (results.Count > 0)
            {
                _courseScheduleRepository.AddRange(results);
            }

            return results;
        }

        private CourseScheduleCreateDto ParseScheduleRow(
            string courseCode,
            string courseName,
            HtmlNode dayCell,
            HtmlNode timeCell,
            HtmlNode roomCell,
            HtmlNode weekCell,
            HtmlNode addressCell,
            int? semesterMetadataId,
            bool isHtml = false)
        {
            if (string.IsNullOrWhiteSpace(courseCode) || string.IsNullOrWhiteSpace(courseName))
            {
                return null;
            }

            var dayText = GetNodeText(dayCell);
            var timeText = GetNodeText(timeCell);
            var roomText = GetNodeText(roomCell);
            var weekText = GetNodeText(weekCell);
            var addressText = GetNodeText(addressCell);

            var dayOfWeek = ParseDayOfWeek(dayText, isHtml);
            var (startTime, endTime) = ParseTimeRange(timeText);
            var (startDate, endDate) = ParseDateRange(weekText);

            return new CourseScheduleCreateDto
            {
                CourseName = courseName,
                CourseCode = courseCode,
                DayOfWeek = dayOfWeek,
                StartTime = startTime,
                EndTime = endTime,
                StartDate = startDate,
                EndDate = endDate,
                Room = roomText,
                SemesterMetadataId = semesterMetadataId,
                Address = addressText
            };
        }

        private static string GetNodeText(HtmlNode node)
        {
            if (node == null)
            {
                return null;
            }

            var raw = node.InnerText ?? string.Empty;
            var decoded = HtmlEntity.DeEntitize(raw);
            return Regex.Replace(decoded, @"\s+", " ").Trim();
        }

        private static void ParseCourseInfo(HtmlNode courseInfoCell, out string courseCode, out string courseName)
        {
            courseCode = null;
            courseName = null;

            var html = HtmlEntity.DeEntitize(courseInfoCell?.InnerHtml ?? string.Empty);
            if (string.IsNullOrWhiteSpace(html))
            {
                return;
            }

            // Parse from inner HTML to stop at tag boundary (<br/>, </span>, ...),
            // avoiding greedy capture of the whole descriptive block.
            var codeMatch = Regex.Match(html, @"Mã\s*LHP\s*:\s*([^<]+)", RegexOptions.IgnoreCase);
            if (codeMatch.Success)
            {
                courseCode = codeMatch.Groups[1].Value.Trim();
            }

            var nameMatch = Regex.Match(html, @"Tên\s*HP\s*:\s*([^<]+)", RegexOptions.IgnoreCase);
            if (nameMatch.Success)
            {
                courseName = nameMatch.Groups[1].Value.Trim();
            }

            // Fallback when HTML format changes and labels are flattened to plain text.
            if (string.IsNullOrWhiteSpace(courseCode) || string.IsNullOrWhiteSpace(courseName))
            {
                var text = GetNodeText(courseInfoCell);
                if (!string.IsNullOrWhiteSpace(text))
                {
                    if (string.IsNullOrWhiteSpace(courseCode))
                    {
                        var codeFallback = Regex.Match(text, @"Mã\s*LHP\s*:\s*(\S+)", RegexOptions.IgnoreCase);
                        if (codeFallback.Success)
                        {
                            courseCode = codeFallback.Groups[1].Value.Trim();
                        }
                    }

                    if (string.IsNullOrWhiteSpace(courseName))
                    {
                        var nameFallback = Regex.Match(text, @"Tên\s*HP\s*:\s*(.+?)(Giảng\s*viên\s*:|Ngôn\s*ngữ\s*:|$)", RegexOptions.IgnoreCase);
                        if (nameFallback.Success)
                        {
                            courseName = nameFallback.Groups[1].Value.Trim();
                        }
                    }
                }
            }

            courseName = NormalizeCourseName(courseName);
        }

        private static string NormalizeCourseName(string courseName)
        {
            if (string.IsNullOrWhiteSpace(courseName))
            {
                return courseName;
            }

            // Remove trailing parenthetical code: "Phân tích dữ liệu (DAT609002)" -> "Phân tích dữ liệu"
            return Regex.Replace(courseName.Trim(), @"\s*\([^)]*\)\s*$", string.Empty).Trim();
        }

        /// <summary>
        /// "Thứ Hai" → 2, "Thứ Ba" → 3, ..., "Thứ Bảy" → 7, "Chủ Nhật" → 8
        /// isHtml=true: also maps "Bảy" → 7 because UEH HTML renders Thứ Bảy as " Bảy" in td cells.
        /// </summary>
        private int? ParseDayOfWeek(string input, bool isHtml = false)
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

            // UEH HTML sometimes omits "Thứ" prefix — td may contain only " Hai", " Ba", " Bảy", etc.
            if (isHtml)
            {
                map["Hai"]  = 2;
                map["Ba"]   = 3;
                map["Tư"]   = 4;
                map["Năm"]  = 5;
                map["Sáu"]  = 6;
                map["Bảy"]  = 7;
            }

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
