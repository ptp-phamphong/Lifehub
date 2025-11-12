using API_Raspberry.Model;
using Microsoft.Data.Sqlite;
using System.Data;
using System.Data.SQLite;

namespace API_Raspberry.Repository
{
    public class ExpenseRepository
    {
        private readonly string _dbPath;
        private readonly string _connectionString;

        public ExpenseRepository()
        {
            string baseDir = AppContext.BaseDirectory;
            string dbDir = Path.Combine(baseDir, "../Database");
            _dbPath = Path.GetFullPath(Path.Combine(dbDir, "raspberry.db"));

            // Tạo thư mục nếu chưa có
            Directory.CreateDirectory(Path.GetDirectoryName(_dbPath)!);

            _connectionString = $"Data Source={_dbPath};";
            EnsureDatabase();
        }

        private void EnsureDatabase()
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string createTableSql = @"
                CREATE TABLE IF NOT EXISTS expenseRecords (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Reason TEXT NOT NULL,
                    Amount INTEGER NOT NULL,
                    CreatedDate DATETIME NOT NULL
                );";

            using var command = new SqliteCommand(createTableSql, connection);
            command.ExecuteNonQuery();
        }

        public void AddExpense(string reason, int amount)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                INSERT INTO expenseRecords (Reason, Amount, CreatedDate)
                VALUES (@reason, @amount, @createdDate);";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@reason", reason);
            command.Parameters.AddWithValue("@amount", amount);
            command.Parameters.AddWithValue("@createdDate", DateTime.Now);
            command.ExecuteNonQuery();
        }

        public List<ExpenseRecord> GetAllExpenses()
        {
            var list = new List<ExpenseRecord>();

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = "SELECT Id, Reason, Amount, CreatedDate FROM expenseRecords ORDER BY CreatedDate DESC;";
            using var command = new SqliteCommand(selectSql, connection);
            using var reader = command.ExecuteReader();

            while (reader.Read())
            {
                list.Add(new ExpenseRecord
                {
                    Id = reader.GetInt32(0),
                    Reason = reader.GetString(1),
                    Amount = reader.GetInt32(2),
                    CreatedDate = reader.GetDateTime(3)
                });
            }

            return list;
        }
    }
}
