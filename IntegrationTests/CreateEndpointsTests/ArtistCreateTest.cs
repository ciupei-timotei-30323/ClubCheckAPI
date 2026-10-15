using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TestProject1.CreateEndpointsTests;

public class ArtistCreateTest(WebApplicationFactory<Program> _factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    // [InlineData("/")]
    [InlineData("/health-db")]
    // [InlineData("/About")]
    // [InlineData("/Privacy")]
    // [InlineData("/Contact")]
    public async Task Get_EndpointsReturnSuccessAndCorrectContentType(string url)
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync(url);

        // Assert
        response.EnsureSuccessStatusCode(); // Status Code 200-299
        Assert.Equal(HttpStatusCode.OK,
            response.StatusCode);
    }
}