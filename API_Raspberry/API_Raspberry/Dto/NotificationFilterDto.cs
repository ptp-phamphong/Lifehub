namespace API_Raspberry.Dto
{
    public class NotificationFilterDto
    {
        public int Id { get; set; }
        public string FilterType { get; set; }
        public string FilterValue { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class NotificationFilterCreateDto
    {
        public string FilterType { get; set; }
        public string FilterValue { get; set; }
        public string Description { get; set; }
    }

    public class NotificationFilterUpdateDto
    {
        public string FilterValue { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }
}
