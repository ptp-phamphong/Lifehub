using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("incomeRecords")]
    public class IncomeRecord
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Reason { get; set; }

        [Required]
        public int Amount { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
