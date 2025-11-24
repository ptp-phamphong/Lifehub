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

        public void AddExpense(ExpenseRecord expense)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                INSERT INTO expenseRecords (Reason, Amount, ReasonTypeId, CreatedDate)
                VALUES (@reason, @amount, @reasonTypeId , @createdDate);";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@reason", expense.Reason);
            command.Parameters.AddWithValue("@amount", expense.Amount);
            command.Parameters.AddWithValue("@reasonTypeId", expense.ReasonTypeId ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@createdDate", DateTime.Now);
            command.ExecuteNonQuery();
        }

        public List<ExpenseRecord> GetAllExpenses(ParamFilter paramFilter)
        {
            var list = new List<ExpenseRecord>();

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            // Start SQL base
            var selectSql = @"
                            SELECT Id, Reason, Amount, ReasonTypeId, CreatedDate
                            FROM expenseRecords
                            WHERE 1=1
                        ";

            var command = new SqliteCommand();
            command.Connection = connection;

            // ===========================================
            // 1. Filter tháng
            // ===========================================
            if (paramFilter.Month.HasValue)
            {
                selectSql += " AND strftime('%m', CreatedDate) = @month";
                command.Parameters.AddWithValue("@month", paramFilter.Month.Value.ToString("D2"));
            }

            // ===========================================
            // 2. Filter năm
            // ===========================================
            if (paramFilter.Year.HasValue)
            {
                selectSql += " AND strftime('%Y', CreatedDate) = @year";
                command.Parameters.AddWithValue("@year", paramFilter.Year.Value.ToString());
            }

            // ===========================================
            // 3. Filter ReasonTypeIds (List<int>)
            // ===========================================
            if (paramFilter.ReasonTypeIds != null && paramFilter.ReasonTypeIds.Any())
            {
                var idParams = paramFilter.ReasonTypeIds
                    .Select((id, idx) => $"@rt{idx}")
                    .ToList();

                selectSql += $" AND ReasonTypeId IN ({string.Join(", ", idParams)})";

                for (int i = 0; i < paramFilter.ReasonTypeIds.Count; i++)
                {
                    command.Parameters.AddWithValue($"@rt{i}", paramFilter.ReasonTypeIds[i]);
                }
            }

            // Cuối cùng thêm ORDER BY
            selectSql += " ORDER BY CreatedDate DESC";

            command.CommandText = selectSql;

            // ===========================================
            // 4. Execute
            // ===========================================
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new ExpenseRecord
                {
                    Id = reader.GetInt32(0),
                    Reason = reader.GetString(1),
                    Amount = reader.GetInt32(2),
                    ReasonTypeId = !reader.IsDBNull(3) ? reader.GetInt32(3) : null,
                    CreatedDate = reader.GetDateTime(4),
                });
            }

            return list;
        }

        public ExpenseRecord GetExpenseById(int id)
        {

            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string selectSql = $"SELECT Id, Reason, Amount, ReasonTypeId, CreatedDate FROM expenseRecords Where Id = {id};";
            using var command = new SqliteCommand(selectSql, connection);
            using var reader = command.ExecuteReader();

            if (reader.Read())
            {
                return new ExpenseRecord
                {
                    Id = reader.GetInt32(0),
                    Reason = reader.GetString(1),
                    Amount = reader.GetInt32(2),
                    ReasonTypeId = !reader.IsDBNull(3) ? reader.GetInt32(3) : null,
                    CreatedDate = reader.GetDateTime(4),
                };
            }

            return null;
        }

        public void UpdateExpense(int id, ExpenseRecord expense)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                Update expenseRecords
                Set Reason = @reason, Amount = @amount, ReasonTypeId = @reasonTypeId
                Where Id = @id;";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@reason", expense.Reason);
            command.Parameters.AddWithValue("@amount", expense.Amount);
            command.Parameters.AddWithValue("@reasonTypeId", expense.ReasonTypeId ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@id", id);
            command.ExecuteNonQuery();
        }

        public void DeleteById(int id)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            string insertSql = @"
                Delete from expenseRecords
                Where Id = @id;";

            using var command = new SqliteCommand(insertSql, connection);
            command.Parameters.AddWithValue("@id", id);
            command.ExecuteNonQuery();
        }

        public int SumByMonth(ParamFilter paramFilter, int month, int year)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            // 1. Ưu tiên lấy month/year từ paramFilter nếu có
            int finalMonth = paramFilter.Month ?? month;
            int finalYear = paramFilter.Year ?? year;

            // 2. SQL base
            string selectSql = @"
                                    SELECT SUM(Amount)
                                    FROM expenseRecords
                                    WHERE strftime('%m', CreatedDate) = @month
                                      AND strftime('%Y', CreatedDate) = @year
                                ";

            var command = new SqliteCommand();
            command.Connection = connection;

            // 3. Gán month/year
            command.Parameters.AddWithValue("@month", finalMonth.ToString("D2"));
            command.Parameters.AddWithValue("@year", finalYear.ToString());

            // 4. Nếu có ReasonTypeIds → thêm IN (...)
            if (paramFilter.ReasonTypeIds != null && paramFilter.ReasonTypeIds.Any())
            {
                var idParams = paramFilter.ReasonTypeIds
                    .Select((id, idx) => $"@rt{idx}")
                    .ToList();

                selectSql += $" AND ReasonTypeId IN ({string.Join(", ", idParams)})";

                // Thêm parameter tương ứng
                for (int i = 0; i < paramFilter.ReasonTypeIds.Count; i++)
                {
                    command.Parameters.AddWithValue($"@rt{i}", paramFilter.ReasonTypeIds[i]);
                }
            }

            command.CommandText = selectSql;

            // 5. Execute
            var result = command.ExecuteScalar();

            return (result != null && result != DBNull.Value)
                ? Convert.ToInt32(result)
                : 0;
        }

        public int SumByWeek(ParamFilter paramFilter, DateTime startOfWeek, DateTime endOfWeek)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            // Base SQL
            string selectSql = @"
                                SELECT SUM(Amount)
                                FROM expenseRecords
                                WHERE CreatedDate >= @startOfWeek
                                  AND CreatedDate <  @endOfWeek
                            ";

            var command = new SqliteCommand();
            command.Connection = connection;

            // Add date parameters
            command.Parameters.AddWithValue("@startOfWeek", startOfWeek);
            command.Parameters.AddWithValue("@endOfWeek", endOfWeek);

            // -----------------------------------------
            //  Thêm ReasonTypeIds nếu có
            // -----------------------------------------
            if (paramFilter.ReasonTypeIds != null && paramFilter.ReasonTypeIds.Any())
            {
                // Sinh @rt0, @rt1, ...
                var idParams = paramFilter.ReasonTypeIds
                    .Select((id, idx) => $"@rt{idx}")
                    .ToList();

                selectSql += $" AND ReasonTypeId IN ({string.Join(", ", idParams)})";

                // Gán giá trị ID
                for (int i = 0; i < paramFilter.ReasonTypeIds.Count; i++)
                {
                    command.Parameters.AddWithValue($"@rt{i}", paramFilter.ReasonTypeIds[i]);
                }
            }
            // Hoàn thiện SQL
            command.CommandText = selectSql;
            var result = command.ExecuteScalar();
            if (result != DBNull.Value && result != null)
            {
                return Convert.ToInt32(result);
            }
            return 0;
        }
    }
}
