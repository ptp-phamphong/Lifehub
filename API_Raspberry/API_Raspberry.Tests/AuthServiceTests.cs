using API_Raspberry.Dto;
using API_Raspberry.Model;
using API_Raspberry.Repository;
using API_Raspberry.Service;
using Microsoft.Extensions.Configuration;

namespace API_Raspberry.Tests
{
    public class AuthServiceTests
    {
        // Repo giả ném lỗi nếu bị gọi với username null - giống EF Core thật (trước đây thành 500).
        private class StrictUserRepository : IUserRepository
        {
            public List<User> GetAll() => new();
            public User GetById(int id) => null;
            public User GetByUsername(string username) =>
                username == null ? throw new NullReferenceException() : null;
            public int Add(User user) => 0;
            public void Update(User user) { }
            public void Delete(int id) { }
        }

        private static AuthService Create() =>
            new(new ConfigurationBuilder().Build(), new StrictUserRepository());

        [Fact]
        public void Null_body_is_rejected_without_throwing() => Assert.Null(Create().Authenticate(null));

        [Theory]
        [InlineData(null, "x")]
        [InlineData("", "x")]
        [InlineData("   ", "x")]
        [InlineData("demo", null)]
        [InlineData("demo", "")]
        public void Missing_username_or_password_is_rejected_without_throwing(string username, string password)
        {
            Assert.Null(Create().Authenticate(new LoginDto { Username = username, Password = password }));
        }
    }
}
