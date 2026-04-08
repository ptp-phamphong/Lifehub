namespace API_Raspberry.Dto
{
    public class PhoneNotificationDto
    {
        public int Id { get; set; }
        public string App { get; set; }
        public string AppName { get; set; }
        public string Title { get; set; }
        public string Text { get; set; }
        public string Time { get; set; }
        public string AndroidTime { get; set; }
        public string NotificationKey { get; set; }
        public string NotificationId { get; set; }
        public string NotificationTag { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class PhoneNotificationCreateDto
    {
        public string App { get; set; }
        public string AppName { get; set; }
        public string Title { get; set; }
        public string Text { get; set; }
        public string Time { get; set; }
        public string AndroidTime { get; set; }
        public string NotificationKey { get; set; }
        public string NotificationId { get; set; }
        public string NotificationTag { get; set; }
    }
}
