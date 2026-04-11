using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("systemConfiguration")]
    public class SystemConfiguration
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string KeyConfig { get; set; }

        [Required]
        public string ValueConfig { get; set; }
    }
}
