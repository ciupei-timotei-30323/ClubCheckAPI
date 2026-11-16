using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class MostActiveEndpointTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private const string BaseUri = "/Events/public/most-active";

    private readonly HttpClient _httpClientNotAuth = factory.CreateUnauthenticatedClient();

    [Fact]
    public async Task Get_MostActiveWithoutAuthorization_ReturnsRankedStatistics()
    {
        await SeedStatistics();

        var response = await _httpClientNotAuth.GetAsync(BaseUri);
        var statistics = await response.Content.ReadFromJsonAsync<MostActiveStatisticsDto>();

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(statistics);

        Assert.Equal(["Cluj-Napoca", "Bucharest"], statistics.TopCities.Select(c => c.Name));
        Assert.Equal(3, statistics.TopCities.First().EventCount);
        Assert.Equal("1", statistics.TopCities.First().Id);

        Assert.Equal("Stats House", statistics.TopGenres.First().Name);
        Assert.Equal(3, statistics.TopGenres.First().EventCount);

        Assert.Equal("Stats Artist One", statistics.TopArtists.First().Name);
        Assert.Equal(3, statistics.TopArtists.First().EventCount);

        Assert.Equal("Stats Venue Cluj A", statistics.TopVenues.First().Name);
        Assert.Equal(2, statistics.TopVenues.First().EventCount);

        Assert.Equal(1, statistics.Pagination.Page);
        Assert.Equal(20, statistics.Pagination.PageSize);
        Assert.Equal(2, statistics.Pagination.TotalItems);
        Assert.Equal(1, statistics.Pagination.TotalPages);
    }

    [Fact]
    public async Task Get_MostActiveWithLimitsAndCityPagination_ReturnsExpectedSlices()
    {
        await SeedStatistics();

        var limitedResponse = await _httpClientNotAuth.GetAsync(
            $"{BaseUri}?topGenresLimit=1&topVenuesLimit=1&topArtistsLimit=1&topCitiesLimit=1");
        var limited = await limitedResponse.Content.ReadFromJsonAsync<MostActiveStatisticsDto>();

        outputHelper.WriteLine(await limitedResponse.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, limitedResponse.StatusCode);
        Assert.NotNull(limited);
        Assert.Single(limited.TopGenres);
        Assert.Single(limited.TopVenues);
        Assert.Single(limited.TopArtists);
        Assert.Single(limited.TopCities);
        Assert.Equal(1, limited.Pagination.TotalItems);

        var pagedResponse = await _httpClientNotAuth.GetAsync($"{BaseUri}?page=2&pageSize=1");
        var paged = await pagedResponse.Content.ReadFromJsonAsync<MostActiveStatisticsDto>();

        outputHelper.WriteLine(await pagedResponse.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, pagedResponse.StatusCode);
        Assert.NotNull(paged);
        Assert.Single(paged.TopCities);
        Assert.Equal("Bucharest", paged.TopCities.Single().Name);
        Assert.Equal(2, paged.Pagination.Page);
        Assert.Equal(1, paged.Pagination.PageSize);
        Assert.Equal(2, paged.Pagination.TotalItems);
        Assert.Equal(2, paged.Pagination.TotalPages);
    }

    [Theory]
    [InlineData("topGenresLimit=-1")]
    [InlineData("topVenuesLimit=-1")]
    [InlineData("topArtistsLimit=-1")]
    [InlineData("topCitiesLimit=-1")]
    [InlineData("page=0")]
    [InlineData("pageSize=0")]
    public async Task Get_MostActiveWithInvalidLimit_ReturnsBadRequest(string queryString)
    {
        var response = await _httpClientNotAuth.GetAsync($"{BaseUri}?{queryString}");

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Get_MostActiveWithNonIntegerParameter_ReturnsBadRequest()
    {
        var response = await _httpClientNotAuth.GetAsync($"{BaseUri}?topArtistsLimit=not-a-number");

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task SeedStatistics()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();

        if (await context.Events.AnyAsync(e => e.Slug == "stats-event-one|test"))
        {
            return;
        }

        var venueClujA = new Venue
        {
            Name = "Stats Venue Cluj A",
            Address = new Address("400001", "1", "Stats Street", "Cluj-Napoca")
        };
        var venueClujB = new Venue
        {
            Name = "Stats Venue Cluj B",
            Address = new Address("400002", "2", "Stats Street", "Cluj-Napoca")
        };
        var venueBucharest = new Venue
        {
            Name = "Stats Venue Bucharest",
            Address = new Address("010001", "3", "Stats Street", "Bucharest")
        };

        var house = new Genre { Name = "Stats House" };
        var techno = new Genre { Name = "Stats Techno" };
        var manele = new Genre { Name = "Stats Manele" };

        var artistOne = new Artist { Name = "Stats Artist One", Slug = "stats-artist-one|test" };
        var artistTwo = new Artist { Name = "Stats Artist Two", Slug = "stats-artist-two|test" };
        var artistThree = new Artist { Name = "Stats Artist Three", Slug = "stats-artist-three|test" };

        context.Venues.AddRange(venueClujA, venueClujB, venueBucharest);
        context.Genre.AddRange(house, techno, manele);
        context.Artists.AddRange(artistOne, artistTwo, artistThree);
        await context.SaveChangesAsync();

        var startDate = DateTime.UtcNow.AddDays(1);
        var events = new[]
        {
            new Event
            {
                Name = "Stats Event One",
                Slug = "stats-event-one|test",
                StartDate = startDate,
                IsActive = true,
                VenueId = venueClujA.Id,
                Venue = venueClujA,
                Genres = [house, techno],
                Artists = [artistOne, artistTwo]
            },
            new Event
            {
                Name = "Stats Event Two",
                Slug = "stats-event-two|test",
                StartDate = startDate.AddHours(1),
                IsActive = true,
                VenueId = venueClujB.Id,
                Venue = venueClujB,
                Genres = [house],
                Artists = [artistOne]
            },
            new Event
            {
                Name = "Stats Event Three",
                Slug = "stats-event-three|test",
                StartDate = startDate.AddHours(2),
                IsActive = true,
                VenueId = venueBucharest.Id,
                Venue = venueBucharest,
                Genres = [manele],
                Artists = [artistThree]
            },
            new Event
            {
                Name = "Stats Event Four",
                Slug = "stats-event-four|test",
                StartDate = startDate.AddHours(3),
                IsActive = true,
                VenueId = venueClujA.Id,
                Venue = venueClujA,
                Genres = [house, techno],
                Artists = [artistOne, artistThree]
            }
        };

        context.Events.AddRange(events);
        await context.SaveChangesAsync();
    }
}
