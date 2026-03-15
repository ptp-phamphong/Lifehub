namespace API_Raspberry.Dto
{
    public class NotificationEmailDto
    {
        public List<NotificationItem> Notifications { get; set; }
    }

    public class NotificationItem
    {
        public string App { get; set; }
        public string Title { get; set; }
        public string Text { get; set; }
        public string Time { get; set; }
    }
}
