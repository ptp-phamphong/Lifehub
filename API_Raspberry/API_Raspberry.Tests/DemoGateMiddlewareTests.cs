using API_Raspberry.Filters;
using API_Raspberry.Middleware;
using Microsoft.AspNetCore.Http;

namespace API_Raspberry.Tests
{
    public class DemoGateMiddlewareTests
    {
        private static async Task<(int status, bool nextCalled)> Run(Endpoint endpoint)
        {
            var nextCalled = false;
            var middleware = new DemoGateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
            var context = new DefaultHttpContext();
            context.SetEndpoint(endpoint);

            await middleware.InvokeAsync(context);
            return (context.Response.StatusCode, nextCalled);
        }

        [Fact]
        public async Task No_matching_endpoint_returns_404()
        {
            var (status, nextCalled) = await Run(null);
            Assert.Equal(404, status);
            Assert.False(nextCalled);
        }

        [Fact]
        public async Task Endpoint_without_AllowInDemo_returns_404()
        {
            var endpoint = new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(), "blocked");
            var (status, nextCalled) = await Run(endpoint);
            Assert.Equal(404, status);
            Assert.False(nextCalled);
        }

        [Fact]
        public async Task Endpoint_with_AllowInDemo_passes_through()
        {
            var endpoint = new Endpoint(_ => Task.CompletedTask,
                new EndpointMetadataCollection(new AllowInDemoAttribute()), "allowed");
            var (_, nextCalled) = await Run(endpoint);
            Assert.True(nextCalled);
        }
    }
}
