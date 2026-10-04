using System.Collections;
using API_Raspberry.Service;
using Microsoft.Extensions.Configuration;

namespace API_Raspberry.Tests
{
    public class DemoStartupGuardTests
    {
        private static IConfiguration Config(Dictionary<string, string> values) =>
            new ConfigurationBuilder().AddInMemoryCollection(values).Build();

        private static Dictionary<string, string> CleanDemoConfig() => new()
        {
            ["Jwt:Issuer"] = DemoStartupGuard.DemoIssuer,
            ["Jwt:Audience"] = DemoStartupGuard.DemoAudience,
            ["Gemini:ApiKey"] = "",
            ["DemoControl:ConnectionString"] = "",
        };

        [Fact]
        public void Clean_demo_config_has_no_problems()
        {
            var problems = DemoStartupGuard.FindProblems(Config(CleanDemoConfig()), new Hashtable { ["PATH"] = "/usr/bin" });
            Assert.Empty(problems);
        }

        [Theory]
        [InlineData("EMAIL_APP_PASSWORD")]
        [InlineData("EMAIL_ADDRESS")]
        [InlineData("UEH_LOGIN_MATKHAU")]
        [InlineData("AZURE_OPENAI_KEY")]
        public void Forbidden_env_variable_is_reported_by_name_only(string name)
        {
            var problems = DemoStartupGuard.FindProblems(Config(CleanDemoConfig()), new Hashtable { [name] = "super-secret-value" });
            var problem = Assert.Single(problems);
            Assert.Contains(name, problem);
            Assert.DoesNotContain("super-secret-value", problem);
        }

        [Theory]
        [InlineData("UehLogin:TaiKhoan")]
        [InlineData("UehLogin:MatKhau")]
        [InlineData("Gemini:ApiKey")]
        [InlineData("DemoControl:ConnectionString")]
        [InlineData("AzureAI:APIKey")]
        public void Secret_config_key_must_be_empty(string key)
        {
            var values = CleanDemoConfig();
            values[key] = "super-secret-value";
            var problem = Assert.Single(DemoStartupGuard.FindProblems(Config(values), new Hashtable()));
            Assert.Contains(key, problem);
            Assert.DoesNotContain("super-secret-value", problem);
        }

        [Fact]
        public void Real_instance_issuer_is_rejected()
        {
            var values = CleanDemoConfig();
            values["Jwt:Issuer"] = "RaspberryPiAPI";
            values["Jwt:Audience"] = "RaspberryPiClients";
            Assert.Equal(2, DemoStartupGuard.FindProblems(Config(values), new Hashtable()).Count);
        }

        [Fact]
        public void Shipped_appsettings_Demo_json_passes_the_guard()
        {
            // appsettings.json + appsettings.Demo.json đúng như được publish, không có biến môi trường.
            var dir = Path.GetDirectoryName(typeof(Program).Assembly.Location);
            var config = new ConfigurationBuilder()
                .SetBasePath(dir)
                .AddJsonFile("appsettings.json")
                .AddJsonFile("appsettings.Demo.json")
                .Build();

            Assert.Empty(DemoStartupGuard.FindProblems(config, new Hashtable()));
        }
    }
}
