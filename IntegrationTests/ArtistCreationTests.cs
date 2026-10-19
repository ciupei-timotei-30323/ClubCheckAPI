using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DTO.Artist;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class ArtistCreationTests : IClassFixture<IntegrationTestWebAppFactory>
{
    // private readonly WebApplicationFactory<Program> _webApplicationFactory;

    private readonly ITestOutputHelper _outputHelper;

    private readonly HttpClient _httpClient;

    private static string baseRequiredUri = "/Artists/private";
    
    private readonly HttpClient _httpClientNotAuth;
    
    //TODO Move this class to another file
    public ArtistCreationTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
        // var clientOptions = new WebApplicationFactoryClientOptions();

        // clientOptions.AllowAutoRedirect = false;

        // _webApplicationFactory = new CustomWebApplicationFactory(fixture);

        _httpClient = factory.CreateClient();
        _httpClientNotAuth = factory.CreateUnauthenticatedClient();
    }

    // private sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
    // {
    //     private readonly string _connectionString;
    //
    //     public CustomWebApplicationFactory(PostgreSQLTests fixture)
    //     {
    //         _connectionString = fixture._postgreSqlContainer.GetConnectionString();
    //     }
    //
    //     protected override void ConfigureWebHost(IWebHostBuilder builder)
    //     
    //     {
    //         builder.ConfigureServices(services =>
    //             {
    //                 services.Remove(services.SingleOrDefault(service =>
    //                     typeof(DbContextOptions<ClubCheckAPIContext>) == service.ServiceType));
    //                 services.Remove(
    //                     services.SingleOrDefault(service => typeof(DbConnection) == service.ServiceType));
    //                 services.AddDbContext<ClubCheckAPIContext>((_, option) => option.UseNpgsql(_connectionString));
    //             }
    //         );
    //     }
    // }

    /// <summary>
    /// ARTIST CREATION TESTS
    /// </summary>

    [Fact]
    public async Task Post_CreateArtistNotAuth_ReturnsNotFound()
    {
        // Arrange
        var name = "Michael Jackson";
        var slug = "michaelJackson|usa";
        
        // Act
        var response = await _httpClient.PostAsJsonAsync("/Artists", new { Name = name, Slug = slug });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        
    }
    
    [Fact]
    public async Task Post_CreateArtist_ReturnsCreated()
    {
        // Arrange
        var name = "THAKK";
        var slug = "thakk|clujNapoca";

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri, new { Name = name, Slug = slug });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Post_CreateArtistWithoutGivenSlug_ReturnsBadRequest()
    {
        // Arrange
        var name = "Daft Punk";

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri, new { Name = name });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_CreateArtistWithDuplicateSlug_ReturnsCreated()
    {
        // Arrange
        await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Justice", Slug = "justice|france|frenchElectronicDuo" });

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Justice Tribute Band", Slug = "justice|france|frenchElectronicDuo" });

        var responseJson = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        _outputHelper.WriteLine(responseJson.ToString());

        // Asser
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("justice|france|frenchElectronicDuo-2", responseJson.Slug);
    }

    [Fact]
    public async Task Post_CreateArtistWithEmptySlugAndDuplicateName_ReturnsBadRequest()
    {
        // Arrange
        await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Gaspard", Slug = "gaspard|france" });

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Gaspard", Slug = "" });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());



        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

    }


    [Fact]
    public async Task Post_CreateArtistWithDuplicateNameAndSlug_ReturnsCreatedWithSameSlug()
    {
        // Arrange
        await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Manuel", Slug = "manuel|france" });

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Manuel", Slug = "manuel|france" });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        var responseJson = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        _outputHelper.WriteLine(responseJson.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("manuel|france", responseJson.Slug);

    }

    [Fact]
    public async Task Post_CreateArtistWithDuplicateName_ReturnsCreated()
    {
        // Arrange
        await _httpClient.PostAsJsonAsync("/Artists",
            new { Name = "Tame Impala", Slug = "tameImpala|australia" });

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "Tame Impala", Slug = "tameImpala|norway" });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        var responseJson = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        _outputHelper.WriteLine(responseJson.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("tameImpala|norway", responseJson.Slug);

    }


    //TODO Make this not fail
    [Fact]
    public async Task Post_CreateArtistWithPartialPresentSlug_ReturnsCreated()
    {
        // Arrange
        await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "T2S", Slug = "t2s|romania" });

        // Act
        var response = await _httpClient.PostAsJsonAsync(baseRequiredUri,
            new { Name = "T2S", Slug = "t2s|romania|dj" });

        _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        var responseJson = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        _outputHelper.WriteLine(responseJson.ToString());

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("t2s|romania|dj", responseJson.Slug);


    }
}