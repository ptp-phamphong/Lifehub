namespace API_Raspberry.Dto
{
    public class SemesterMetadataDto
    {
        public int Id { get; set; }
        public string SemesterName { get; set; }
        public string CodeSemester { get; set; }
        public int Year { get; set; }
        public bool IsCurrentSemester { get; set; }
    }

    public class SemesterMetadataCreateDto
    {
        public string SemesterName { get; set; }
        public string CodeSemester { get; set; }
        public int Year { get; set; }
        public bool IsCurrentSemester { get; set; }
    }

    public class SemesterMetadataUpdateDto
    {
        public string SemesterName { get; set; }
        public string CodeSemester { get; set; }
        public int Year { get; set; }
        public bool IsCurrentSemester { get; set; }
    }
}
