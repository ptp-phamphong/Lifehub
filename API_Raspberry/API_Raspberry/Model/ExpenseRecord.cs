namespace API_Raspberry.Model
{
    public class ExpenseRecord
    {
        public int Id { get; set; }
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ReasonTypeId { get; set; }
        public ReasonType ReasonType { get; set; }
    }
}
