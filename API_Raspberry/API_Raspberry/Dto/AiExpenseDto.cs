namespace API_Raspberry.Dto
{
    public class AiExpenseRequestDto
    {
        public string Prompt { get; set; }
    }

    public class AiExpenseResponseDto
    {
        public bool Success { get; set; }
        public int? ExpenseId { get; set; }
        public string Message { get; set; }
        public ExpenseRecordDto ParsedExpense { get; set; }
    }
}
