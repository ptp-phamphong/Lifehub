namespace API_Raspberry.Dto
{
    public class VisitorKnownIpDto
    {
        public int Id { get; set; }
        public string IpAddress { get; set; }
        public string VisitorId { get; set; }
        public string Label { get; set; }
        public bool IsSelf { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class VisitorKnownIpCreateDto
    {
        public string IpAddress { get; set; }
        public string VisitorId { get; set; }
        public string Label { get; set; }
        public bool IsSelf { get; set; } = true;
    }

    public class VisitorKnownIpUpdateDto
    {
        public string Label { get; set; }
        public bool IsSelf { get; set; }
    }
}
