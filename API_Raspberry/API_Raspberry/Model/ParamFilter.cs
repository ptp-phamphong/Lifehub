namespace API_Raspberry.Model
{
    public class ParamFilter
    {
        public List<int> ReasonTypeIdsFilterIn { get; set; }
        public List<int> ReasonTypeIdsFilterOut { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string SortColumn { get; set; }
        public string SortDirection { get; set; }
    }
}
