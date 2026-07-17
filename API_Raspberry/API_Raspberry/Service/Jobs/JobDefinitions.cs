namespace API_Raspberry.Service.Jobs
{
    /// <summary>
    /// Một chỗ duy nhất khai báo các tác vụ nền: khóa dùng ở API/Angular, id recurring job của
    /// Hangfire, và tên tiếng Việt hiển thị cho người dùng. Program.cs, JobsService và JobRunMapper
    /// đều lấy từ đây để không rải chuỗi trùng nhau ra khắp nơi.
    /// </summary>
    public static class JobDefinitions
    {
        /// <summary>Khóa dùng ở URL POST Jobs/Trigger/{jobKey} - Angular gửi đúng chuỗi này.</summary>
        public const string ScheduleImportKey = "schedule-import";
        public const string VisitorLogMaintenanceKey = "visitor-log-maintenance";

        /// <summary>Id recurring job trong Hangfire (hiện trên dashboard).</summary>
        public const string ScheduleImportRecurringId = "schedule-import-job";
        public const string VisitorLogMaintenanceRecurringId = "visitor-log-maintenance-job";

        /// <summary>
        /// Tên hiển thị suy từ tên type mà Hangfire lưu lại. Vì job được enqueue qua interface nên
        /// tên type là "IScheduleImportJob" chứ không phải "ScheduleImportJob".
        /// </summary>
        public static string FriendlyName(string typeName)
        {
            switch (typeName)
            {
                case nameof(IScheduleImportJob):
                    return "Đồng bộ lịch học UEH";
                case nameof(IVisitorLogMaintenanceJob):
                    return "Bảo trì nhật ký truy cập";
                default:
                    // Job lạ (vd job cũ còn sót trong DB): hiện tên type thô còn hơn hiện rỗng.
                    return string.IsNullOrEmpty(typeName) ? "Không rõ" : typeName;
            }
        }
    }
}
