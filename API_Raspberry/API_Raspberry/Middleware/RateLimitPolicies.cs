using System.Threading.RateLimiting;

namespace API_Raspberry.Middleware
{
    /// <summary>
    /// Tên các policy rate limit (dùng với [EnableRateLimiting]) và cách đăng ký chúng.
    /// Phân theo IP: UseForwardedHeaders chạy trước UseRateLimiter nên RemoteIpAddress đã là IP
    /// thật của khách chứ không phải 127.0.0.1 của Caddy.
    /// </summary>
    public static class RateLimitPolicies
    {
        public const string Login = "auth-login";
        public const string ForgotPassword = "auth-forgot-password";
        public const string ResetPassword = "auth-reset-password";

        public static IServiceCollection AddLifeHubRateLimiting(this IServiceCollection services, bool isDemo)
        {
            return services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy(Login, ctx => FixedWindowByIp(ctx, 10, TimeSpan.FromMinutes(1)));
                options.AddPolicy(ForgotPassword, ctx => FixedWindowByIp(ctx, 3, TimeSpan.FromHours(1)));
                options.AddPolicy(ResetPassword, ctx => FixedWindowByIp(ctx, 10, TimeSpan.FromHours(1)));

                // Demo: thêm trần cho mọi request ghi. Nhiều endpoint ĐỌC của app cũng là POST
                // (GetAllExpenseNote, SumAllWithFilter...) nên để 120/phút cho một người bấm qua lại
                // các màn hình không bị chặn oan, mà script spam vẫn bị chặn.
                if (isDemo)
                {
                    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                    {
                        var method = ctx.Request.Method;
                        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
                            return RateLimitPartition.GetNoLimiter("read");

                        return FixedWindowByIp(ctx, 120, TimeSpan.FromMinutes(1));
                    });
                }
            });
        }

        private static RateLimitPartition<string> FixedWindowByIp(HttpContext ctx, int permitLimit, TimeSpan window)
        {
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueLimit = 0
            });
        }
    }
}
