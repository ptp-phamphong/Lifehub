using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace API_Raspberry.Model
{
    [Table("expenseRecords")]
    public class ExpenseRecord
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Reason { get; set; }

        [Required]
        public int Amount { get; set; }

        public DateTime? CreatedDate { get; set; }

        public int? ReasonTypeId { get; set; }

        [ForeignKey(nameof(ReasonTypeId))]
        public ReasonType ReasonType { get; set; }
    }
}
