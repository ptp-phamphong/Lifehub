using API_Raspberry.Dto;
using API_Raspberry.Service;

namespace API_Raspberry.Tests
{
    /// <summary>
    /// Các hàm thuần của luồng đồng bộ UEH bằng cookie từ extension Chrome.
    /// </summary>
    public class UehPortalResponseTests
    {
        private const string LoginPageHtml =
            "<!DOCTYPE html><html><body><form method=\"post\" action=\"/signin\">" +
            "<input name=\"TaiKhoan\" /><input type=\"password\" name=\"MatKhau\" /></form></body></html>";

        [Theory]
        [InlineData(301)]
        [InlineData(302)]
        [InlineData(307)]
        public void Redirect_IsLogin(int status)
        {
            Assert.True(UehPortalResponse.IsLoginResponse(status, string.Empty, expectJson: true));
            Assert.True(UehPortalResponse.IsLoginResponse(status, null, expectJson: false));
        }

        [Fact]
        public void LoginPageHtml_WhereJsonExpected_IsLogin()
        {
            Assert.True(UehPortalResponse.IsLoginResponse(200, LoginPageHtml, expectJson: true));
        }

        [Fact]
        public void AnyHtml_WhereJsonExpected_IsLogin()
        {
            Assert.True(UehPortalResponse.IsLoginResponse(200, "  \r\n<html><body>Lỗi</body></html>", expectJson: true));
        }

        [Fact]
        public void LoginPageHtml_WhereHtmlExpected_IsLogin()
        {
            Assert.True(UehPortalResponse.IsLoginResponse(200, LoginPageHtml, expectJson: false));
        }

        [Fact]
        public void NewLoginPage2026_WhereHtmlExpected_IsLogin()
        {
            // Trang loginst.ueh.edu.vn/signin từ 11/2026: không còn ô MatKhau, chỉ có token + recaptchaV3.
            var html = "<form action=\"https://loginst.ueh.edu.vn/continue\" method=\"post\">" +
                       "<input name=\"__RequestVerificationToken\" type=\"hidden\" value=\"x\">" +
                       "<input type=\"hidden\" name=\"recaptchaV3\" value=\"\"></form>";
            Assert.True(UehPortalResponse.IsLoginResponse(200, html, expectJson: false));
        }

        [Fact]
        public void WeekScheduleHtml_IsNotLogin()
        {
            var weekHtml = "<table class=\"table\"><tr><td>Lập trình Web</td></tr></table>";
            Assert.False(UehPortalResponse.IsLoginResponse(200, weekHtml, expectJson: false));
        }

        [Fact]
        public void ValidJson_IsNotLogin()
        {
            var json = "[{\"Week\":45,\"DisPlayWeek\":1,\"WeekOfYear\":45}]";
            Assert.False(UehPortalResponse.IsLoginResponse(200, json, expectJson: true));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        public void EmptyBody_IsNotLogin(string body)
        {
            // Body rỗng là lỗi portal (PortalError), không phải dấu hiệu phiên chết.
            Assert.False(UehPortalResponse.IsLoginResponse(200, body, expectJson: true));
            Assert.False(UehPortalResponse.IsLoginResponse(500, body, expectJson: true));
        }

        [Fact]
        public void ServerError_WithJsonExpectedButNoHtml_IsNotLogin()
        {
            Assert.False(UehPortalResponse.IsLoginResponse(500, "Internal Server Error", expectJson: true));
        }
    }

    public class UehCookieValidationTests
    {
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void Empty_IsInvalid(string cookie)
        {
            Assert.False(UehSessionRules.IsValidCookieHeader(cookie));
        }

        [Fact]
        public void TooLong_IsInvalid()
        {
            var cookie = "ASP.NET_SessionId=" + new string('a', UehSessionRules.MaxCookieHeaderLength);
            Assert.False(UehSessionRules.IsValidCookieHeader(cookie));
        }

        [Fact]
        public void ExactlyMaxLength_IsValid()
        {
            var prefix = "ASP.NET_SessionId=";
            var cookie = prefix + new string('a', UehSessionRules.MaxCookieHeaderLength - prefix.Length);
            Assert.True(UehSessionRules.IsValidCookieHeader(cookie));
        }

        [Theory]
        [InlineData("ASP.NET_SessionId=abc\r\nX-Injected: 1")]
        [InlineData("ASP.NET_SessionId=abc\nX-Injected: 1")]
        [InlineData("ASP.NET_SessionId=abc\r")]
        public void CrLf_IsInvalid(string cookie)
        {
            Assert.False(UehSessionRules.IsValidCookieHeader(cookie));
        }

        [Theory]
        [InlineData("ASP.NET_SessionId=abc123")]
        [InlineData("ASP.NET_SessionId=abc123; _ga=GA1.1.1; other=x")]
        public void Normal_IsValid(string cookie)
        {
            Assert.True(UehSessionRules.IsValidCookieHeader(cookie));
        }
    }

    public class UehShouldSyncTests
    {
        private const string CookieA = "ASP.NET_SessionId=aaa; _ga=GA1.1.1";
        private const string CookieAOtherExtras = "_ga=GA1.1.999; ASP.NET_SessionId=aaa; foo=bar";
        private const string CookieB = "ASP.NET_SessionId=bbb; _ga=GA1.1.1";

        [Fact]
        public void NothingStored_Syncs_SavedNew()
        {
            Assert.True(UehSessionRules.ShouldSync(null, false, CookieA, forceSync: false));
            Assert.Equal(UehSessionOutcome.SavedNew, UehSessionRules.SavedOutcome(null, false, CookieA));
        }

        [Fact]
        public void DifferentSession_Syncs_SavedNew()
        {
            Assert.True(UehSessionRules.ShouldSync(CookieA, true, CookieB, forceSync: false));
            Assert.Equal(UehSessionOutcome.SavedNew, UehSessionRules.SavedOutcome(CookieA, true, CookieB));
        }

        [Fact]
        public void SameSession_Valid_NoSync_Unchanged()
        {
            Assert.False(UehSessionRules.ShouldSync(CookieA, true, CookieA, forceSync: false));
            Assert.Equal(UehSessionOutcome.Unchanged, UehSessionRules.SavedOutcome(CookieA, true, CookieA));
        }

        [Fact]
        public void SameSession_OnlyExtraCookiesChanged_NoSync_Unchanged()
        {
            // Cookie phụ đổi liên tục không được tính là phiên mới.
            Assert.False(UehSessionRules.ShouldSync(CookieA, true, CookieAOtherExtras, forceSync: false));
            Assert.Equal(UehSessionOutcome.Unchanged, UehSessionRules.SavedOutcome(CookieA, true, CookieAOtherExtras));
        }

        [Fact]
        public void SameSession_WasExpired_Syncs_Revived()
        {
            Assert.True(UehSessionRules.ShouldSync(CookieA, false, CookieA, forceSync: false));
            Assert.Equal(UehSessionOutcome.Revived, UehSessionRules.SavedOutcome(CookieA, false, CookieA));
        }

        [Fact]
        public void DifferentSession_WasExpired_Syncs_SavedNew()
        {
            Assert.True(UehSessionRules.ShouldSync(CookieA, false, CookieB, forceSync: false));
            Assert.Equal(UehSessionOutcome.SavedNew, UehSessionRules.SavedOutcome(CookieA, false, CookieB));
        }

        [Fact]
        public void ForceSync_AlwaysSyncs()
        {
            Assert.True(UehSessionRules.ShouldSync(CookieA, true, CookieA, forceSync: true));
            Assert.True(UehSessionRules.ShouldSync(null, false, CookieA, forceSync: true));
        }

        [Fact]
        public void NoSessionCookie_ComparesWholeHeader()
        {
            Assert.False(UehSessionRules.ShouldSync("x=1; y=2", true, "x=1; y=2", forceSync: false));
            Assert.True(UehSessionRules.ShouldSync("x=1; y=2", true, "x=1; y=3", forceSync: false));
        }

        [Theory]
        [InlineData("ASP.NET_SessionId=abc", "abc")]
        [InlineData("a=1; ASP.NET_SessionId = abc ; b=2", "abc")]
        [InlineData("asp.net_sessionid=abc", "abc")]
        public void SessionKey_ExtractsSessionId(string header, string expected)
        {
            Assert.Equal(expected, UehSessionRules.SessionKey(header));
        }
    }
}
