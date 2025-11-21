using API_Raspberry.Model;
using Microsoft.Data.Sqlite;

namespace API_Raspberry.Repository
{
    public class ReasonTypeRepository
    {

        private readonly string _dbPath;
        private readonly string _connectionString;

        public ReasonTypeRepository()
        {
            string baseDir = AppContext.BaseDirectory;
            string dbDir = Path.Combine(baseDir, "../Database");
            _dbPath = Path.GetFullPath(Path.Combine(dbDir, "raspberry.db"));

            // Tạo thư mục nếu chưa có
            Directory.CreateDirectory(Path.GetDirectoryName(_dbPath)!);

            _connectionString = $"Data Source={_dbPath};";
        }

        public List<ReasonType> GetAllReasonType()
        {
            var list = new List<ReasonType>();

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = "SELECT id, reasonName, Active FROM ReasonType ORDER BY id DESC;";
            using var command = new SqliteCommand(selectSql, connection);
            using var reader = command.ExecuteReader();

            while (reader.Read())
            {
                list.Add(new ReasonType
                {
                    Id = reader.GetInt32(0),
                    ReasonName = reader.GetString(1),
                    Active = reader.GetBoolean(2),
                });
            }

            return list;
        }

        public void AddReasonType(string reasonName)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                INSERT INTO ReasonType (reasonName, active)
                VALUES (@reasonName, @active);";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@reasonName", reasonName);
            command.Parameters.AddWithValue("@active", true);
            command.ExecuteNonQuery();
        }


        public ReasonType GetReasonTypeById(int id)
        {

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = $"SELECT Id, reasonName, Active FROM ReasonType Where Id = {id};";
            using var command = new SqliteCommand(selectSql, connection);
            using var reader = command.ExecuteReader();

            if (reader.Read())
            {
                return new ReasonType
                {
                    Id = reader.GetInt32(0),
                    ReasonName = reader.GetString(1),
                    Active = reader.GetBoolean(2),
                };
            }

            return null;
        }



        public void UpdateReasonType(int id, ReasonType reasonType)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                Update ReasonType
                Set reasonName = @reasonName, active = @active
                Where Id = @id;";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@reasonName", reasonType.ReasonName);
            command.Parameters.AddWithValue("@active", reasonType.Active);
            command.Parameters.AddWithValue("@id", id);
            command.ExecuteNonQuery();
        }
    }
}
