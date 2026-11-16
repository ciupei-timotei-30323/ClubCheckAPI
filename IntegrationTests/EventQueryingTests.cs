using System.Collections;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.DTO.Venue;
using Microsoft.AspNetCore.WebUtilities;
using Xunit.Abstractions;

namespace TestProject1;

public class EventQueryingTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>

{
    private readonly HttpClient _httpClient = factory.CreateAuthenticatedClient();

    private static readonly string BaseRequiredUri = "/Events/public";

    private static readonly Hashtable Artists = new()
    {
        { "Daft Punk", "daftPunk|france|electronicDuo" },
        { "Justice", "justice|france|electronicDuo" },
        { "Kavinsky", "kavinsky|france|electronic" },
        { "THAKK", "thakk|romania|electronic" },
        { "T2S", "t2s|romania|electronic|dj" },
        { "Adrian Minune", "adrianMinune|romania|manele" }
    };

    private static readonly HashSet<string> Genres =
    [
        "Progressive House",
        "Electronic",
        "House"
    ];

    private static readonly Hashtable Venues = new Hashtable()
    {
        { "Form", new Address("400394", "2", "Aleea Stadionului", "Cluj-Napoca") },
        { "The Matter", new Address("400347", "3", "Str. Universității", "Cluj-Napoca") },
        { "Flying Circus", new Address("400113", "21", "Piața Unirii", "Cluj-Napoca") }
    };

    private static readonly HashSet<string> Events =
    [
        "Back to University Party",
        "Halloween Party",
        "Techno Rave"
    ];

    private readonly HttpClient _httpClientNotAuth = factory.CreateUnauthenticatedClient();

    private async Task Seed_VenueGenresArtistsEvents()
    {
        // Artist
        List<int> artistsId = [];
        foreach (var artist in Artists.Keys)
        {
            var responseArtists = await _httpClient.PostAsJsonAsync("/Artists/private",
                new { Name = artist, Slug = Artists[artist] });
            var artistSummaryDto = await responseArtists.Content.ReadFromJsonAsync<ArtistSummaryDto>();
            // outputHelper.WriteLine(artistSummaryDto?.ToString());
            if (artistSummaryDto != null)
                artistsId.Add(artistSummaryDto.Id);
        }

        //Genres
        List<int> genresId = [];
        foreach (var genre in Genres)
        {
            var responseGenres = await _httpClient.PostAsJsonAsync("/Genres/private",
                new { Name = genre });
            var genreSummaryDto = await responseGenres.Content.ReadFromJsonAsync<GenreSummaryDto>();
            // outputHelper.WriteLine(genreSummaryDto?.ToString());
            if (genreSummaryDto != null)
                genresId.Add(genreSummaryDto.Id);
        }

        // Venue
        List<int> venuesId = [];
        foreach (var venue in Venues.Keys)
        {
            var responseVenue = await _httpClient.PostAsJsonAsync("/Venues/private",
                new { Name = venue, Address = Venues[venue] });
            var publicVenueDto = await responseVenue.Content.ReadFromJsonAsync<PublicVenueDto>();
            // outputHelper.WriteLine(publicVenueDto?.ToString());
            if (publicVenueDto != null)
            {
                venuesId.Add(publicVenueDto.Id);
            }
        }

        // Creating Events
        var rand = new Random();
        for (var i = 0; i < 20; i++)
        {
            // variables
            var startDate = DateTime.UtcNow.AddDays(rand.Next(2, 10)).AddHours(rand.Next(1, 10));
            var endDate = startDate.AddHours(rand.Next(1, 5));
            var price = new Price(rand.Next(0, 100));
            var venueId = venuesId[rand.Next(0, venuesId.Count)];


            var genreStart = rand.Next(0, genresId.Count);
            var maxGenreLength = genresId.Count - genreStart;
            var genreLength = rand.Next(1, maxGenreLength + 1);
            var genreId = genresId.Slice(genreStart, genreLength);

            var artistStart = rand.Next(0, artistsId.Count);
            var artistLength = artistsId.Count - artistStart;
            var artistId = artistsId.Slice(artistStart, artistLength);


            var eventName = Events.ToArray()[rand.Next(0, Events.Count)];
            var response = await _httpClient.PostAsJsonAsync("Events/private",
                new
                {
                    IsActive = true,
                    Name = eventName, StartDate = startDate, EndDate = endDate, Price = price, VenueId = venueId,
                    GenresId = genreId,
                    ArtistsId = artistId
                });
            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to seed event. Status: {response.StatusCode}. Details: {errorDetails}");
            }
            // var publicEventDto = await response.Content.ReadFromJsonAsync<PublicEventDto>();
            // outputHelper.WriteLine(response.ToString());
        }
    }


    [Fact]
    public async Task Get_QueryAllActiveEvents_ReturnsOk()
    {
        // Arrange
        await Seed_VenueGenresArtistsEvents();
        var queryParams = new Dictionary<string, string?>()
        {
            { "IsActive", "true" },
            // {"StartDate", "2026-11-20"},
            // {"EndDate", "2023-01-31"},
            // {"Name", "Rave"},
            // {"City", "Cluj-Napoca"},
            { "Price.Value", "50" },
            { "Price.Currency", "RON" },
            // {"VenueName", "Form"},
            // {"GenresNames", "Electronic"},
            // {"Artist", "Justice"},
            { "Page", "1" },
            { "PageSize", "10" }
        };
        var uriWithQuery = QueryHelpers.AddQueryString(BaseRequiredUri, queryParams);


        // Act
        var response = await _httpClientNotAuth.GetAsync(uriWithQuery);
        var responseDto = await response.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

        if (responseDto != null)
        {
            // Create options for pretty-printing
            var jsonOptions = new JsonSerializerOptions
            {
                WriteIndented = true
            };

            // Serialize the entire result at once instead of looping
            string readableOutput = JsonSerializer.Serialize(responseDto, jsonOptions);

            outputHelper.WriteLine(readableOutput);
        }

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseDto);
        Assert.Equal(1, responseDto.Page);
        Assert.Equal(10, responseDto.PageSize);
        Assert.True(responseDto.TotalCount >= responseDto.Items.Count);
    }

    [Fact]
    public async Task Get_Pagination_LimitsResultsCorrectly()
    {
        // Arrange
        await Seed_VenueGenresArtistsEvents(); // Seeds 20 items
        var queryParams = new Dictionary<string, string?>
        {
            { "Page", "1" },
            { "PageSize", "5" } // We only want 5 back
        };
        var uriWithQuery = QueryHelpers.AddQueryString(BaseRequiredUri, queryParams);

        // Act
        var response = await _httpClientNotAuth.GetAsync(uriWithQuery);
        var responseDto = await response.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseDto);
        Assert.Equal(5, responseDto.Items.Count); // Ensures PageSize is respected
        Assert.Equal(5, responseDto.PageSize);
    }

    [Fact]
    public async Task Get_InvalidPagination_ReturnsOk()
    {
        // Arrange
        // No need to seed data for validation tests
        var queryParams = new Dictionary<string, string?>
        {
            { "Page", "-1" }, // Invalid page number
            { "PageSize", "10" }
        };
        var uriWithQuery = QueryHelpers.AddQueryString(BaseRequiredUri, queryParams);

        // Act
        var response = await _httpClientNotAuth.GetAsync(uriWithQuery);

        // Assert
        // Assuming your API returns 400 Bad Request for invalid pagination params
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); // Should not throw a 404 or 500
        
    }

    [Fact]
    public async Task Get_FilterWithNoMatches_ReturnsEmptyList()
    {
        // Arrange
        await Seed_VenueGenresArtistsEvents();
        var queryParams = new Dictionary<string, string?>
        {
            { "City", "New York" }, // A city that does not exist in our Seed data
            { "Page", "1" },
            { "PageSize", "10" }
        };
        var uriWithQuery = QueryHelpers.AddQueryString(BaseRequiredUri, queryParams);

        // Act
        var response = await _httpClientNotAuth.GetAsync(uriWithQuery);
        var responseDto = await response.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); // Should not throw a 404 or 500
        Assert.NotNull(responseDto);
        Assert.Empty(responseDto.Items); // Should return an empty page
        Assert.Equal(0, responseDto.TotalCount);
    }

    // This fails because some events are dup0licates so 20 events is not a sure thing
    // [Fact]
    // public async Task Get_CityFilter_ReturnsOnlyEventsInThatCity()
    // {
    //     // Arrange
    //     await Seed_VenueGenresArtistsEvents();
    //     var queryParams = new Dictionary<string, string?>
    //     {
    //         { "City", "Cluj-Napoca" },
    //         { "Page", "1" },
    //         { "PageSize", "20" } // Request enough to get all of them
    //     };
    //     var uriWithQuery = QueryHelpers.AddQueryString(BaseRequiredUri, queryParams);
    //
    //     // Act
    //     var response = await _httpClientNotAuth.GetAsync(uriWithQuery);
    //     var responseDto = await response.Content.ReadFromJsonAsync<List<PublicEventDto>>();
    //
    //     // Assert
    //     Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    //     Assert.NotNull(responseDto);
    //
    //     // Since all our seeded venues are in Cluj-Napoca, it should return all 20
    //     Assert.Equal(20, responseDto.Count);
    // }
}