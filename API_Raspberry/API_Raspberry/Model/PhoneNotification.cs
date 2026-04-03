using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Raspberry.Model
{
    [Table("PhoneNotification")]
    public class PhoneNotification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string App { get; set; }

        public string AppName { get; set; }

        public string Title { get; set; }

        public string Text { get; set; }

        public string Time { get; set; }

        public DateTime? CreatedDate { get; set; }
    }
}
