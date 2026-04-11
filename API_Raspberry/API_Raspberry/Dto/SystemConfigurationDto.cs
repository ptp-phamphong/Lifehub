namespace API_Raspberry.Dto
{
    public class SystemConfigurationDto
    {
        public int Id { get; set; }
        public string KeyConfig { get; set; }
        public string ValueConfig { get; set; }
    }

    public class SystemConfigurationCreateDto
    {
        public string KeyConfig { get; set; }
        public string ValueConfig { get; set; }
    }

    public class SystemConfigurationUpdateDto
    {
        public string KeyConfig { get; set; }
        public string ValueConfig { get; set; }
    }
}
