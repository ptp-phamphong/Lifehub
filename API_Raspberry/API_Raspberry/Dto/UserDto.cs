namespace API_Raspberry.Dto
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Name { get; set; }
        public bool Active { get; set; }
    }

    public class UserCreateDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string Name { get; set; }
    }

    public class UserUpdateDto
    {
        public string Name { get; set; }
        public bool Active { get; set; }
    }

    public class UserChangePasswordDto
    {
        public string NewPassword { get; set; }
    }
}
