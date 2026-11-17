using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Venue;
using Xunit.Abstractions;

namespace TestProject1;

public class VenueCreationTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _httpClient = factory.CreateAuthenticatedClient();

    private static string _baseRequiredUri = "/Venues/private";

    private readonly HttpClient _httpClientNotAuth = factory.CreateUnauthenticatedClient();

    // var clientOptions = new WebApplicationFactoryClientOptions();
    // clientOptions.AllowAutoRedirect = false;
    // _webApplicationFactory = new CustomWebApplicationFactory(fixture);

    [Fact]
    public async Task Post_CreateVenueNotAuth_ReturnsNotFound()
    {
        // Arrange
        var name = "Form";

        outputHelper.WriteLine(_httpClientNotAuth.DefaultRequestHeaders.ToString());

        // Act
        var response = await _httpClientNotAuth.PostAsJsonAsync(_baseRequiredUri, new { Name = name });

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }


    [Fact]
    public async Task Post_CreateVenue_ReturnsCreated()
    {
        // Arrange
        var name = "Form";
        // var address = new Address("40000","200", "Str. Piezisa","Cluj-Napoca");

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name, Address = new Address("40000", "200", "Str. Piezisa", "Cluj-Napoca") });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Cluj-Napoca", responseJson?.City);
    }

    [Fact]
    public async Task Post_CreateVenueWithDuplicateNameAndNoAddress_ReturnsCreated()
    {
        // Arrange
        var name = "Form";

        var name2 = "Form";
        // var address = new Address("40000","200", "Str. Piezisa","Cluj-Napoca");
        await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name2, Address = new Address("40000", "200", "Str. Piezisa", "Cluj-Napoca") });

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri, new { Name = name });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Form", responseJson?.Name);
        Assert.Equal("Cluj-Napoca", responseJson?.City);
        Assert.Equal(1, responseJson?.Id);
    }

    [Fact]
    public async Task Post_CreateVenueWithDuplicateAddressAndDifferentName_ReturnsCreated()
    {
        // Arrange
        var name = "Form (Cluj-Napoca)";
        var name2 = "Form";
        await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name2, Address = new Address(null, "200", "Str. Piezisa", "Cluj-Napoca") });

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri, new { Name = name, Address = new Address(null, "200", "Str. Piezisa", "Cluj-Napoca") });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Form", responseJson?.Name);
        Assert.Equal("Cluj-Napoca", responseJson?.City);
        Assert.Equal(1, responseJson?.Id);
    }
    
    [Fact]
    public async Task Post_CreateVenueWithDuplicateAddressAndName_ReturnsCreated()
    {
        // Arrange
        var name = "Form";
        var name2 = "Form";
        await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name2, Address = new Address(null, "200", "Str. Piezisa", "Cluj-Napoca") });

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri, new { Name = name, Address = new Address(null, "200", "Str. Piezisa", "Cluj-Napoca") });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Form", responseJson?.Name);
        Assert.Equal("Cluj-Napoca", responseJson?.City);
        Assert.Equal(1, responseJson?.Id);
    }
    
    [Fact]
    public async Task Post_CreateVenueWithDifferentNameAndAddressWithDuplicateZipCode_ReturnsCreated()
    {
        // Arrange
        var name = "?";
        var name2 = "The Matter";
        await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name2, Address = new Address("40347", "3", "Str. Universitatii", "Cluj-Napoca") });

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri, new { Name = name, Address = new Address("40347","-", "-", "-") });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("The Matter", responseJson?.Name);
        Assert.Equal("Cluj-Napoca", responseJson?.City);
    }
    
    [Fact]
    public async Task Post_CreateVenueWithDifferentNameAndAddressWithNameOnlyName_ReturnsCreated()
    {
        // Arrange
        var name = "By Jules";
        var name2 = "Maison 8";
        await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = name2, Address = new Address(null, null, null, "Craiova") });

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri, new { Name = name, Address = new Address(null,null, null, "Slobozia", "Ialomita") });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(name, responseJson?.Name);
        Assert.Equal("Slobozia", responseJson?.City);
    }

    [Fact]
    public async Task Post_CreateVenueWithDifferentNameAndSameSparseCity_ReturnsCreated()
    {
        // Arrange
        const string firstName = "Sparse Venue Alpha";
        const string secondName = "Sparse Venue Beta";
        const string city = "Sparse City";

        var firstResponse = await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = firstName, Address = new Address(null, null, null, city) });
        var firstResponseJson = await firstResponse.Content.ReadFromJsonAsync<PublicVenueDto>();

        // Act
        var response = await _httpClient.PostAsJsonAsync(_baseRequiredUri,
            new { Name = secondName, Address = new Address(null, null, null, city) });
        var responseJson = await response.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(responseJson?.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(secondName, responseJson?.Name);
        Assert.Equal(city, responseJson?.City);
        Assert.NotEqual(firstResponseJson?.Id, responseJson?.Id);
    }
}
