using API_Raspberry.Filters;

namespace API_Raspberry.Middleware
{
    /// <summary>
    /// Cổng allowlist cho instance demo: chỉ cho qua request khớp với một endpoint có
    /// [AllowInDemo]. Còn lại (endpoint không đánh dấu, Hangfire dashboard, route không tồn tại)
    /// trả 404 với body rỗng, để người ngoài không phân biệt được "bị chặn" với "không có".
    ///
    /// Chỉ đăng ký khi IDemoModeService.IsDemo - pipeline của bản thật không đổi. Phải đứng sau
    /// UseRouting (để có endpoint) và UseCors (để preflight vẫn được trả 204 và response 404 vẫn
    /// có header CORS), trước UseAuthentication (để trả 404 chứ không phải 401).
    /// </summary>
    public class DemoGateMiddleware
    {
        private readonly RequestDelegate _next;

        public DemoGateMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public Task InvokeAsync(HttpContext context)
        {
            var endpoint = context.GetEndpoint();
            if (endpoint?.Metadata.GetMetadata<AllowInDemoAttribute>() == null)
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return Task.CompletedTask;
            }

            return _next(context);
        }
    }
}
