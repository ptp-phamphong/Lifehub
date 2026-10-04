using API_Raspberry.Model;
using API_Raspberry.Repository;
using API_Raspberry.Service;
using Microsoft.Extensions.Logging.Abstractions;

namespace API_Raspberry.Tests
{
    public class PasswordResetServiceTests
    {
        private class FakeUserRepository : IUserRepository
        {
            public List<User> Users { get; } = new();
            public List<User> GetAll() => Users;
            public User GetById(int id) => Users.FirstOrDefault(u => u.Id == id);
            public User GetByUsername(string username) =>
                Users.FirstOrDefault(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase));
            public int Add(User user) { Users.Add(user); return user.Id; }
            public void Update(User user) { }
            public void Delete(int id) => Users.RemoveAll(u => u.Id == id);
        }

        private class FakeDemoMode : IDemoModeService
        {
            public bool IsDemo { get; set; }
        }

        private static PasswordResetService Create(FakeUserRepository repo, bool isDemo = false) =>
            new(repo, new OtpStore(), new FakeDemoMode { IsDemo = isDemo }, NullLogger<PasswordResetService>.Instance);

        [Fact]
        public async Task Unknown_user_gets_the_same_answer_as_a_real_request()
        {
            var service = Create(new FakeUserRepository());

            var result = await service.RequestOtpAsync("nobody");

            Assert.True(result.Success);
            Assert.Equal(PasswordResetService.GenericRequestMessage, result.Message);
            Assert.Null(result.MaskedEmail);
        }

        [Fact]
        public async Task User_without_email_gets_the_same_answer()
        {
            var repo = new FakeUserRepository();
            repo.Users.Add(new User { Id = 1, Username = "admin", Name = "Admin", Active = true, Email = "" });

            var result = await Create(repo).RequestOtpAsync("admin");

            Assert.True(result.Success);
            Assert.Equal(PasswordResetService.GenericRequestMessage, result.Message);
        }

        [Fact]
        public async Task Demo_blocks_both_steps()
        {
            var repo = new FakeUserRepository();
            repo.Users.Add(new User { Id = 1, Username = "demo", Name = "demo", Active = true, Email = "a@b.c" });
            var service = Create(repo, isDemo: true);

            Assert.False((await service.RequestOtpAsync("demo")).Success);
            Assert.False(service.VerifyAndReset("demo", "123456", "newpass").Success);
        }
    }

    public class OtpStoreTests
    {
        private static readonly TimeSpan Hour = TimeSpan.FromHours(1);
        private static readonly TimeSpan Minute = TimeSpan.FromSeconds(60);
        private static readonly DateTime T0 = new(2026, 10, 4, 10, 0, 0, DateTimeKind.Utc);

        [Fact]
        public void Second_request_within_60_seconds_is_refused()
        {
            var store = new OtpStore();
            Assert.True(store.TryRegisterRequest("admin", T0, 3, Hour, Minute));
            Assert.False(store.TryRegisterRequest("admin", T0.AddSeconds(30), 3, Hour, Minute));
            Assert.True(store.TryRegisterRequest("admin", T0.AddSeconds(61), 3, Hour, Minute));
        }

        [Fact]
        public void Fourth_request_within_an_hour_is_refused_then_allowed_after_the_window()
        {
            var store = new OtpStore();
            Assert.True(store.TryRegisterRequest("admin", T0, 3, Hour, Minute));
            Assert.True(store.TryRegisterRequest("admin", T0.AddMinutes(2), 3, Hour, Minute));
            Assert.True(store.TryRegisterRequest("admin", T0.AddMinutes(4), 3, Hour, Minute));
            Assert.False(store.TryRegisterRequest("ADMIN", T0.AddMinutes(6), 3, Hour, Minute));
            Assert.True(store.TryRegisterRequest("admin", T0.AddMinutes(61), 3, Hour, Minute));
        }

        [Fact]
        public void Limits_are_per_username()
        {
            var store = new OtpStore();
            Assert.True(store.TryRegisterRequest("a", T0, 1, Hour, Minute));
            Assert.True(store.TryRegisterRequest("b", T0, 1, Hour, Minute));
        }
    }
}
