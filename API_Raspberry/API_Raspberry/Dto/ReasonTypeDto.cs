namespace API_Raspberry.Dto
{
    public class ReasonTypeDto
    {
        public int Id { get; set; }
        public string ReasonName { get; set; }
        public bool Active { get; set; }
        public int? SortOrder { get; set; }
        public int DefaultFilterType { get; set; }
    }

    public class ReasonTypeCreateDto
    {
        public string ReasonName { get; set; }
        public int? SortOrder { get; set; }
        public int DefaultFilterType { get; set; }
    }

    public class ReasonTypeUpdateDto
    {
        public string ReasonName { get; set; }
        public bool Active { get; set; }
        public int? SortOrder { get; set; }
        public int DefaultFilterType { get; set; }
    }
}
