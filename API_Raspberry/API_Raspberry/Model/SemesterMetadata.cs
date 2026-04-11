using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("semesterMetadata")]
    public class SemesterMetadata
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SemesterName { get; set; }

        [Required]
        public string CodeSemester { get; set; }

        public bool IsCurrentSemester { get; set; }
    }
}
