using System.Globalization;
using System.Text;
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

        // Khác ImportFromExcel/ImportFromHtml: hàm này KHÔNG ghi DB, chỉ trả về dữ liệu đã parse.
        // Caller gom đủ mọi tuần rồi mới xoá + insert một lần, để portal lỗi giữa chừng không làm mất TKB.
        List<CourseScheduleCreateDto> ParseWeekHtml(string weekHtml, int? semesterMetadataId, int week);
    }

    public class CourseScheduleImportService : ICourseScheduleImportService
    {
        private readonly ICourseScheduleRepository _courseScheduleRepository;
        private readonly ILogger<CourseScheduleImportService> _logger;

        public CourseScheduleImportService(
            ICourseScheduleRepository courseScheduleRepository,
            ILogger<CourseScheduleImportService> logger)
        {
            _courseScheduleRepository = courseScheduleRepository;
            _logger = logger;
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

        public List<CourseScheduleCreateDto> ParseWeekHtml(string weekHtml, int? semesterMetadataId, int week)
        {
            var results = new List<CourseScheduleCreateDto>();
            if (string.IsNullOrWhiteSpace(weekHtml))
            {
                return results;
            }

            var doc = new HtmlDocument();
            doc.LoadHtml(weekHtml);

            // Chuẩn hoá sau DeEntitize — xem NormalizeVietnamese để biết vì sao thứ tự này bắt buộc.
            var pageText = NormalizeVietnamese(HtmlEntity.DeEntitize(doc.DocumentNode.InnerText ?? string.Empty));
            var caption = Regex.Match(
                pageText,
                @"Tuần\s*(\d+)\s*:\s*từ\s*ngày\s*(\d{2}/\d{2}/\d{4})\s*đến\s*ngày\s*(\d{2}/\d{2}/\d{4})");

            // Không có caption = tuần nằm ngoài danh sách của học kỳ này. Bình thường, không phải lỗi.
            if (!caption.Success)
            {
                return results;
            }

            var displayWeek = int.Parse(caption.Groups[1].Value, CultureInfo.InvariantCulture);
            if (!DateTime.TryParseExact(caption.Groups[2].Value, "dd/MM/yyyy",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var weekStart))
            {
                _logger.LogWarning("Tuần {Week}: không parse được ngày bắt đầu '{Raw}'.", week, caption.Groups[2].Value);
                return results;
            }

            var rows = doc.DocumentNode.SelectNodes("//table//tr");
            if (rows == null || rows.Count == 0)
            {
                return results;
            }

            // Giải rowspan/colspan bằng lưới chiếm chỗ. Không dùng được chỉ số cell thô: một ô rowspan
            // ở cột trước sẽ đẩy lệch chỉ số của các ô ở những dòng nó phủ qua.
            var occupied = new HashSet<(int Row, int Col)>();

            for (var ri = 0; ri < rows.Count; ri++)
            {
                var cells = rows[ri].SelectNodes("./td|./th");
                if (cells == null)
                {
                    continue;
                }

                var col = 0;
                foreach (var cell in cells)
                {
                    while (occupied.Contains((ri, col)))
                    {
                        col++;
                    }

                    var rowSpan = Math.Max(cell.GetAttributeValue("rowspan", 1), 1);
                    var colSpan = Math.Max(cell.GetAttributeValue("colspan", 1), 1);

                    for (var r = ri; r < ri + rowSpan; r++)
                    {
                        for (var c = col; c < col + colSpan; c++)
                        {
                            occupied.Add((r, c));
                        }
                    }

                    var dto = ParseWeekCell(cell, col, weekStart, displayWeek, week, semesterMetadataId);
                    if (dto != null)
                    {
                        results.Add(dto);
                    }

                    col += colSpan;
                }
            }

            return results
                .GroupBy(x => (x.SessionDate, x.StartPeriod, x.CourseCode))
                .Select(g => g.First())
                .ToList();
        }

        /// <summary>
        /// Cột 0 = "Tiết", cột 1..7 = Thứ hai..Chủ nhật → DayOfWeek 2..8 (đúng convention sẵn có).
        /// </summary>
        private CourseScheduleCreateDto ParseWeekCell(
            HtmlNode cell,
            int col,
            DateTime weekStart,
            int displayWeek,
            int week,
            int? semesterMetadataId)
        {
            if (col < 1 || col > 7)
            {
                return null;
            }

            var content = cell.SelectSingleNode(".//div[contains(@class,'Content')]");
            if (content == null)
            {
                return null;
            }

            var spans = content.SelectNodes(".//span");
            if (spans == null || spans.Count == 0)
            {
                return null;
            }

            string room = null, nameAndCode = null, classCode = null;
            string periodText = null, timeText = null;
            string lecturer = null, lecturerEmail = null, learningMode = null, language = null;

            foreach (var span in spans)
            {
                var text = GetNodeText(span);
                if (string.IsNullOrWhiteSpace(text))
                {
                    continue;
                }

                // Khớp theo danh sách nhãn cố định thay vì bắt mọi "x: y" — tên học phần có thể chứa dấu hai chấm.
                if (TryGetLabelled(text, "LHP", out var value)) classCode = value;
                else if (TryGetLabelled(text, "Số tiết", out _)) { /* suy được từ "Tiết: a-b", bỏ qua */ }
                else if (TryGetLabelled(text, "Tiết", out value)) periodText = value;
                else if (TryGetLabelled(text, "Giờ học", out value)) timeText = value;
                else if (TryGetLabelled(text, "GV", out value)) lecturer = value;
                else if (TryGetLabelled(text, "Email", out value)) lecturerEmail = value;
                else if (TryGetLabelled(text, "Hình thức học", out value)) learningMode = value;
                else if (TryGetLabelled(text, "Ngôn ngữ", out value)) language = value;
                // Hai span đầu không có nhãn: phòng, rồi "Tên học phần (Mã)". Nhưng buổi LMS/ONLINE/NGHỈ
                // không có phòng nên span phòng vắng hẳn — nhận diện theo cấu trúc (đuôi "(Mã)"),
                // không theo vị trí, nếu không tên học phần sẽ bị nuốt vào Room.
                else if (nameAndCode == null && HasTrailingCode(text)) nameAndCode = text;
                else if (room == null) room = text;
                else if (nameAndCode == null) nameAndCode = text;
            }

            var (courseName, courseCode) = SplitNameAndCode(nameAndCode);
            if (string.IsNullOrWhiteSpace(courseCode))
            {
                courseCode = classCode;
            }

            // CourseName/CourseCode là [Required] — thiếu thì insert sẽ nổ ở SaveChanges.
            // Bỏ ô và log để layout đổi không biến thành lỗi câm.
            if (string.IsNullOrWhiteSpace(courseName) || string.IsNullOrWhiteSpace(courseCode))
            {
                _logger.LogWarning(
                    "Tuần {Week}, cột {Col}: bỏ qua ô không đọc được tên/mã học phần. Nội dung: {Text}",
                    week, col, GetNodeText(content));
                return null;
            }

            var (startPeriod, endPeriod) = ParsePeriodRange(periodText);
            var (startTime, endTime) = ParseTimeRange(timeText);
            var sessionDate = weekStart.AddDays(col - 1);

            return new CourseScheduleCreateDto
            {
                CourseName = courseName,
                CourseCode = courseCode,
                DayOfWeek = col + 1,
                SessionDate = sessionDate,
                // Giữ StartDate = EndDate = SessionDate để query theo khoảng ngày và bộ lọc
                // sẵn có của web/mobile khớp đúng một ngày duy nhất.
                StartDate = sessionDate,
                EndDate = sessionDate,
                WeekOfYear = week,
                DisplayWeek = displayWeek,
                StartPeriod = startPeriod,
                EndPeriod = endPeriod,
                StartTime = startTime,
                EndTime = endTime,
                Room = room,
                ClassCode = classCode,
                Lecturer = lecturer,
                LecturerEmail = lecturerEmail,
                LearningMode = learningMode,
                Language = language,
                SemesterMetadataId = semesterMetadataId,
                // View tuần không trả cơ sở/địa chỉ (chỉ view Perior mới có).
                Address = null
            };
        }

        private static bool TryGetLabelled(string text, string label, out string value)
        {
            value = null;

            var match = Regex.Match(text, "^" + Regex.Escape(label) + @"\s*:\s*(.*)$", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                return false;
            }

            // Nhãn khớp là đủ để nhận: trả false khi giá trị rỗng sẽ khiến span "Email:" rỗng
            // rơi xuống nhánh không-nhãn và bị gán nhầm vào Room.
            var raw = match.Groups[1].Value.Trim();
            value = string.IsNullOrEmpty(raw) ? null : raw;
            return true;
        }

        private static bool HasTrailingCode(string input)
        {
            return !string.IsNullOrWhiteSpace(input) && Regex.IsMatch(input.Trim(), @"\([^)]+\)$");
        }

        /// <summary>
        /// "Thiết kế thông tin và chiến lược nội dung (INF609001)" → ("Thiết kế thông tin và chiến lược nội dung", "INF609001")
        /// </summary>
        private static (string name, string code) SplitNameAndCode(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return (null, null);
            }

            var match = Regex.Match(input.Trim(), @"^(.*?)\s*\(([^)]+)\)\s*$");
            if (!match.Success)
            {
                return (input.Trim(), null);
            }

            return (match.Groups[1].Value.Trim(), match.Groups[2].Value.Trim());
        }

        /// <summary>
        /// "2-5" → (2, 5). "3" → (3, 3).
        /// </summary>
        private static (int? startPeriod, int? endPeriod) ParsePeriodRange(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return (null, null);
            }

            var range = Regex.Match(input, @"^\s*(\d+)\s*-\s*(\d+)\s*$");
            if (range.Success)
            {
                return (
                    int.Parse(range.Groups[1].Value, CultureInfo.InvariantCulture),
                    int.Parse(range.Groups[2].Value, CultureInfo.InvariantCulture));
            }

            var single = Regex.Match(input, @"^\s*(\d+)\s*$");
            if (single.Success)
            {
                var value = int.Parse(single.Groups[1].Value, CultureInfo.InvariantCulture);
                return (value, value);
            }

            return (null, null);
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
            var decoded = HtmlEntity.DeEntitize(raw) ?? string.Empty;
            return Regex.Replace(NormalizeVietnamese(decoded), @"\s+", " ").Trim();
        }

        /// <summary>
        /// Portal UEH trả tiếng Việt ở dạng Unicode tổ hợp: "ầ" là U+00E2 + U+0300 (2 code point)
        /// chứ không phải U+1EA7 dựng sẵn. Trình duyệt render vẫn đúng nên nhìn bằng mắt không phát hiện,
        /// nhưng mọi so khớp chuỗi có dấu ("Tuần", "Tiết:", "Giờ học:", "Thứ Hai") đều trượt trong im lặng.
        ///
        /// Phải chuẩn hoá SAU khi DeEntitize: một phần dấu được mã hoá bằng HTML entity, nên chuẩn hoá
        /// trên HTML thô sẽ bỏ sót và dạng tổ hợp quay lại ngay khi entity được giải mã.
        /// FormC là idempotent nên gọi trên text vốn đã dựng sẵn cũng vô hại.
        /// </summary>
        private static string NormalizeVietnamese(string input)
        {
            return string.IsNullOrEmpty(input) ? input : input.Normalize(NormalizationForm.FormC);
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
        /// "8->11 (12g45->16g15)" → ("12:45", "16:15")   (view Perior / Excel)
        /// "2->5 (07g10->10g40)"  → ("07:10", "10:40")
        /// "07g10->10g40"         → ("07:10", "10:40")   (view tuần, không có ngoặc)
        /// </summary>
        private (string startTime, string endTime) ParseTimeRange(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return (null, null);

            // Ngoặc là tuỳ chọn: view tuần trả "07g10->10g40" trần. Vẫn bắt buộc dạng HgMM->HgMM
            // nên phần "8->11" (số tiết) ở đầu chuỗi view Perior không thể khớp nhầm.
            var match = Regex.Match(input, @"\(?(\d{1,2})g(\d{2})\s*->\s*(\d{1,2})g(\d{2})\)?");
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
