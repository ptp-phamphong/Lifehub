using API_Raspberry.Model;
using Microsoft.Data.Sqlite;

namespace API_Raspberry.Repository
{
    public class CourseScheduleRepository
    {
        private readonly string _dbPath;
        private readonly string _connectionString;

        public CourseScheduleRepository()
        {
            string baseDir = AppContext.BaseDirectory;
            string dbDir = Path.Combine(baseDir, "../Database");
            _dbPath = Path.GetFullPath(Path.Combine(dbDir, "raspberry.db"));

            Directory.CreateDirectory(Path.GetDirectoryName(_dbPath)!);

            _connectionString = $"Data Source={_dbPath};";
        }

        public List<CourseSchedule> GetAll()
        {
            var list = new List<CourseSchedule>();

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = @"
                SELECT Id, CourseName, CourseCode, StartDate, EndDate, StartTime, EndTime, Room, Semester, DayOfWeek, CreatedDate
                FROM CourseSchedule
                ORDER BY Id DESC;";

            using var command = new SqliteCommand(selectSql, connection);
            using var reader = command.ExecuteReader();

            while (reader.Read())
            {
                list.Add(MapFromReader(reader));
            }

            return list;
        }

        public CourseSchedule GetById(int id)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = @"
                SELECT Id, CourseName, CourseCode, StartDate, EndDate, StartTime, EndTime, Room, Semester, DayOfWeek, CreatedDate
                FROM CourseSchedule
                WHERE Id = @id;";

            using var command = new SqliteCommand(selectSql, connection);
            command.Parameters.AddWithValue("@id", id);
            using var reader = command.ExecuteReader();

            if (reader.Read())
            {
                return MapFromReader(reader);
            }

            return null;
        }

        public void Add(CourseSchedule course)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                INSERT INTO CourseSchedule (CourseName, CourseCode, StartDate, EndDate, StartTime, EndTime, Room, Semester, DayOfWeek, CreatedDate)
                VALUES (@courseName, @courseCode, @startDate, @endDate, @startTime, @endTime, @room, @semester, @dayOfWeek, @createdDate);";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@courseName", course.CourseName);
            command.Parameters.AddWithValue("@courseCode", course.CourseCode);
            command.Parameters.AddWithValue("@startDate", (object)course.StartDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@endDate", (object)course.EndDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@startTime", (object)course.StartTime ?? DBNull.Value);
            command.Parameters.AddWithValue("@endTime", (object)course.EndTime ?? DBNull.Value);
            command.Parameters.AddWithValue("@room", (object)course.Room ?? DBNull.Value);
            command.Parameters.AddWithValue("@semester", (object)course.Semester ?? DBNull.Value);
            command.Parameters.AddWithValue("@dayOfWeek", (object)course.DayOfWeek ?? DBNull.Value);
            command.Parameters.AddWithValue("@createdDate", DateTime.Now);
            command.ExecuteNonQuery();
        }

        public void Update(int id, CourseSchedule course)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string updateSql = @"
                UPDATE CourseSchedule
                SET CourseName = @courseName,
                    CourseCode = @courseCode,
                    StartDate = @startDate,
                    EndDate = @endDate,
                    StartTime = @startTime,
                    EndTime = @endTime,
                    Room = @room,
                    Semester = @semester,
                    DayOfWeek = @dayOfWeek
                WHERE Id = @id;";

            using var command = new SqliteCommand(updateSql, connection);
            command.Parameters.AddWithValue("@id", id);
            command.Parameters.AddWithValue("@courseName", course.CourseName);
            command.Parameters.AddWithValue("@courseCode", course.CourseCode);
            command.Parameters.AddWithValue("@startDate", (object)course.StartDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@endDate", (object)course.EndDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@startTime", (object)course.StartTime ?? DBNull.Value);
            command.Parameters.AddWithValue("@endTime", (object)course.EndTime ?? DBNull.Value);
            command.Parameters.AddWithValue("@room", (object)course.Room ?? DBNull.Value);
            command.Parameters.AddWithValue("@semester", (object)course.Semester ?? DBNull.Value);
            command.Parameters.AddWithValue("@dayOfWeek", (object)course.DayOfWeek ?? DBNull.Value);
            command.ExecuteNonQuery();
        }

        public List<CourseSchedule> GetByMonth(int month, int year)
        {
            var list = new List<CourseSchedule>();

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            // Lấy các môn có khoảng [StartDate, EndDate] giao với tháng được chọn
            string selectSql = @"
                SELECT Id, CourseName, CourseCode, StartDate, EndDate, StartTime, EndTime, Room, Semester, DayOfWeek, CreatedDate
                FROM CourseSchedule
                WHERE StartDate IS NOT NULL AND EndDate IS NOT NULL
                  AND date(StartDate) <= date(@endOfMonth)
                  AND date(EndDate) >= date(@startOfMonth)
                ORDER BY StartTime ASC;";

            var startOfMonth = new DateTime(year, month, 1).ToString("yyyy-MM-dd");
            var endOfMonth = new DateTime(year, month, DateTime.DaysInMonth(year, month)).ToString("yyyy-MM-dd");

            using var command = new SqliteCommand(selectSql, connection);
            command.Parameters.AddWithValue("@startOfMonth", startOfMonth);
            command.Parameters.AddWithValue("@endOfMonth", endOfMonth);
            using var reader = command.ExecuteReader();

            while (reader.Read())
            {
                list.Add(MapFromReader(reader));
            }

            return list;
        }

        public void Delete(int id)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string deleteSql = "DELETE FROM CourseSchedule WHERE Id = @id;";
            using var command = new SqliteCommand(deleteSql, connection);
            command.Parameters.AddWithValue("@id", id);
            command.ExecuteNonQuery();
        }

        private CourseSchedule MapFromReader(SqliteDataReader reader)
        {
            return new CourseSchedule
            {
                Id = reader.GetInt32(0),
                CourseName = reader.IsDBNull(1) ? null : reader.GetString(1),
                CourseCode = reader.IsDBNull(2) ? null : reader.GetString(2),
                StartDate = reader.IsDBNull(3) ? null : reader.GetDateTime(3),
                EndDate = reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                StartTime = reader.IsDBNull(5) ? null : reader.GetString(5),
                EndTime = reader.IsDBNull(6) ? null : reader.GetString(6),
                Room = reader.IsDBNull(7) ? null : reader.GetString(7),
                Semester = reader.IsDBNull(8) ? null : reader.GetString(8),
                DayOfWeek = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                CreatedDate = reader.IsDBNull(10) ? null : reader.GetDateTime(10),
            };
        }
    }
}
