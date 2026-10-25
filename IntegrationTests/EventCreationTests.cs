using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.DTO.Venue;
using Xunit.Abstractions;

namespace TestProject1;

public class EventCreationTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _httpClient = factory.CreateAuthenticatedClient();

    private static readonly string BaseRequiredUri = "/Events/private";

    private readonly HttpClient _httpClientNotAuth = factory.CreateUnauthenticatedClient();

    public async Task<Dictionary<string, List<int>>> Seed_VenueGenresArtists_ReturnsIDs()
    {
        // Artist
        List<int> artistsId = [];
        for (int i = 0; i < 3; i++)
        {
            var responseArtists = await _httpClient.PostAsJsonAsync("/Artists/private",
                new { Name = $"Artist-{i}", Slug = $"artist{i}|tests" });
            var artistSummaryDto = await responseArtists.Content.ReadFromJsonAsync<ArtistSummaryDto>();
            outputHelper.WriteLine(artistSummaryDto?.ToString());
            if (artistSummaryDto != null)
                artistsId.Add(artistSummaryDto.Id);
        }

        //Genres
        List<int> genresId = [];
        for (int i = 0; i < 3; i++)
        {
            var responseGenres = await _httpClient.PostAsJsonAsync("/Genres/private",
                new { Name = $"Genre-{i}" });
            var genreSummaryDto = await responseGenres.Content.ReadFromJsonAsync<GenreSummaryDto>();
            outputHelper.WriteLine(genreSummaryDto?.ToString());
            if (genreSummaryDto != null)
                genresId.Add(genreSummaryDto.Id);
        }

        // Venue
        int venueId = 0;
        var responseVenue = await _httpClient.PostAsJsonAsync("/Venues/private", new { Name = "Venue-0" });
        var publicVenueDto = await responseVenue.Content.ReadFromJsonAsync<PublicVenueDto>();
        outputHelper.WriteLine(publicVenueDto?.ToString());
        if (publicVenueDto != null)
        {
            venueId = publicVenueDto.Id;
        }

        return new Dictionary<string, List<int>>
        {
            { "Artists", artistsId },
            { "Genres", genresId },
            { "Venue", [venueId] }
        };
    }

    [Fact]
    public async Task Post_CreateEventNotAuth_ReturnsForbidden()
    {
        // Arrange
        var name = "Form University Party";
        DateTime startDate = new DateTime(2027, 3, 24, 0, 0, 0, DateTimeKind.Utc);
        int venueId = 1;


        // Act
        var response = await _httpClientNotAuth.PostAsJsonAsync(BaseRequiredUri,
            new { Name = name, StartDate = startDate, VenueId = venueId });

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
    
    [Fact]
    public async Task Post_CreateEvent_ReturnsCreated()
    {
        // Arrange
        var name = "Form University Party";
        DateTime startDate = new DateTime(2027, 3, 24, 0, 0, 0, DateTimeKind.Utc);
        var seededIds = await Seed_VenueGenresArtists_ReturnsIDs();

        // Act
        var response = await _httpClient.PostAsJsonAsync(BaseRequiredUri,
            new
            {
                Name = name, StartDate = startDate, VenueId = seededIds["Venue"][0], GenresId = seededIds["Genres"],
                ArtistsId = seededIds["Artists"]
            });
        outputHelper.WriteLine(response.ToString());
        
        var responseJson = await response.Content.ReadFromJsonAsync<PublicEventDto>();
        outputHelper.WriteLine(responseJson?.ToString());
        
        

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Genre-0", responseJson?.GenresName.First());
        Assert.Equal("Artist-0", responseJson?.ArtistsSummary.First().Name);
        Assert.Equal("Venue-0", responseJson?.VenueName);
        
    }




}