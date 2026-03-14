using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("reasonType")]
    public class ReasonType
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ReasonName { get; set; }

        public bool Active { get; set; }

        public int? SortOrder { get; set; }
    }
}
