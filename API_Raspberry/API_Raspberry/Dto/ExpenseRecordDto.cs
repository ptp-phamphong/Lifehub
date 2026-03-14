namespace API_Raspberry.Dto
{
    public class ExpenseRecordDto
    {
        public int Id { get; set; }
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ReasonTypeId { get; set; }
        public ReasonTypeDto ReasonType { get; set; }
    }

    public class ExpenseRecordCreateDto
    {
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ReasonTypeId { get; set; }
    }

    public class ExpenseRecordUpdateDto
    {
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? ReasonTypeId { get; set; }
    }
}
