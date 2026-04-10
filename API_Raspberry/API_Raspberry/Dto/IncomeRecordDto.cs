namespace API_Raspberry.Dto
{
    public class IncomeRecordDto
    {
        public int Id { get; set; }
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class IncomeRecordCreateDto
    {
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class IncomeRecordUpdateDto
    {
        public string Reason { get; set; }
        public int Amount { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
