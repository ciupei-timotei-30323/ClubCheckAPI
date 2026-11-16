using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class PublicEventsContractTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private const string EventsUri = "/Events/public";
    private const string PaginationPrefix = "Contract Page";
    private const string DatesPrefix = "Contract Dates";

    private readonly HttpClient _httpClientNotAuth = factory.CreateUnauthenticatedClient();

    [Fact]
    public async Task Get_PublicEvents_ReturnsDeterministicPagedEnvelopeWithoutDuplicatesOrGaps()
    {
        await SeedContractData();

        var expectedIds = await GetExpectedEventIds();

        var collectedIds = new List<int>();
        for (var page = 1; page <= 3; page++)
        {
            var uri = QueryHelpers.AddQueryString(EventsUri, new Dictionary<string, string?>
            {
                ["Page"] = page.ToString(),
                ["PageSize"] = "5"
            });

            var response = await _httpClientNotAuth.GetAsync(uri);
            var result = await response.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

            outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(result);
            Assert.Equal(page, result.Page);
            Assert.Equal(5, result.PageSize);
            Assert.Equal(expectedIds.Count, result.TotalCount);

            collectedIds.AddRange(result.Items.Select(item => item.Id));
        }

        Assert.Equal(expectedIds.Count, collectedIds.Count);
        Assert.Equal(expectedIds.Count, collectedIds.Distinct().Count());
        Assert.Equal(expectedIds, collectedIds);

        var filteredUri = QueryHelpers.AddQueryString(EventsUri, new Dictionary<string, string?>
        {
            ["Name"] = PaginationPrefix,
            ["Page"] = "2",
            ["PageSize"] = "2"
        });
        var filteredResponse = await _httpClientNotAuth.GetAsync(filteredUri);
        var filteredResult = await filteredResponse.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

        Assert.Equal(HttpStatusCode.OK, filteredResponse.StatusCode);
        Assert.NotNull(filteredResult);
        Assert.Equal(5, filteredResult.TotalCount);
        Assert.Equal(2, filteredResult.Page);
        Assert.Equal(2, filteredResult.PageSize);
        Assert.Equal(2, filteredResult.Items.Count);
    }

    [Fact]
    public async Task Get_PublicEvents_SerializesIdCityAndCurrencyForFrontend()
    {
        await SeedContractData();

        var uri = QueryHelpers.AddQueryString(EventsUri, new Dictionary<string, string?>
        {
            ["Name"] = PaginationPrefix,
            ["PageSize"] = "100"
        });
        var response = await _httpClientNotAuth.GetAsync(uri);
        var json = await response.Content.ReadAsStringAsync();

        outputHelper.WriteLine(json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(json);
        var items = document.RootElement.GetProperty("items").EnumerateArray().ToList();

        var priced = items.Single(item => item.GetProperty("slug").GetString() == "contract-page-1|test");
        var unpriced = items.Single(item => item.GetProperty("slug").GetString() == "contract-page-2|test");

        var expectedId = await GetEventIdBySlug("contract-page-1|test");

        Assert.Equal(expectedId, priced.GetProperty("id").GetInt32());
        Assert.Equal("Cluj-Napoca", priced.GetProperty("city").GetString());
        Assert.Equal("RON", priced.GetProperty("price").GetProperty("currency").GetString());
        Assert.Equal(JsonValueKind.Null, unpriced.GetProperty("price").ValueKind);
    }

    [Fact]
    public async Task Get_PublicEventFilters_ReturnsActiveEventOptions()
    {
        await SeedContractData();

        var response = await _httpClientNotAuth.GetAsync("/Events/public/filters");
        var result = await response.Content.ReadFromJsonAsync<EventFilterOptionsDto>();

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);

        Assert.Equal(["Cluj-Napoca", "Bucharest"], result.Cities.Select(city => city.Name));
        Assert.Equal(8, result.Cities.First().Count);

        Assert.Equal("Contract Venue Cluj", result.Venues.First().Name);
        Assert.Equal("Cluj-Napoca", result.Venues.First().City);
        Assert.Equal(8, result.Venues.First().Count);

        Assert.Equal(["Contract House", "Contract Techno"], result.Genres.Select(genre => genre.Name));
        Assert.Equal(3, result.Genres.First().Count);
        Assert.Equal(2, result.Genres.Skip(1).First().Count);
    }

    [Fact]
    public async Task Get_PublicEvents_DateRangeUsesInclusiveOverlapAndSupportsOpenEnds()
    {
        await SeedContractData();

        var rangeStart = new DateTimeOffset(2030, 5, 10, 0, 0, 0, TimeSpan.FromHours(3));
        var rangeEnd = new DateTimeOffset(2030, 5, 11, 23, 59, 59, TimeSpan.FromHours(3));

        var boundedResult = await GetContractDateEvents(new Dictionary<string, string?>
        {
            ["StartDate"] = rangeStart.ToString("O"),
            ["EndDate"] = rangeEnd.ToString("O")
        });
        Assert.Equal(
            new[] { "Contract Dates Inside", "Contract Dates Straddles Start", "Contract Dates Straddles End", "Contract Dates Null Inside" }.Order(),
            boundedResult.Items.Select(item => item.Name).Order().ToArray());

        var openStartResult = await GetContractDateEvents(new Dictionary<string, string?>
        {
            ["StartDate"] = rangeStart.ToString("O")
        });
        Assert.Equal(
            new[]
            {
                "Contract Dates Inside", "Contract Dates Null Inside", "Contract Dates Null Outside",
                "Contract Dates Outside After", "Contract Dates Straddles End", "Contract Dates Straddles Start"
            }.Order(),
            openStartResult.Items.Select(item => item.Name).Order().ToArray());

        var openEndResult = await GetContractDateEvents(new Dictionary<string, string?>
        {
            ["EndDate"] = rangeEnd.ToString("O")
        });
        Assert.Equal(
            new[]
            {
                "Contract Dates Inside", "Contract Dates Null Inside", "Contract Dates Outside Before",
                "Contract Dates Straddles End", "Contract Dates Straddles Start"
            }.Order(),
            openEndResult.Items.Select(item => item.Name).Order().ToArray());
    }

    private async Task<PagedResult<PublicEventDto>> GetContractDateEvents(Dictionary<string, string?> extraQuery)
    {
        var query = new Dictionary<string, string?>(extraQuery)
        {
            ["Name"] = DatesPrefix,
            ["PageSize"] = "100"
        };
        var uri = QueryHelpers.AddQueryString(EventsUri, query);
        var response = await _httpClientNotAuth.GetAsync(uri);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<PublicEventDto>>();

        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        return result;
    }

    private async Task<List<int>> GetExpectedEventIds()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();
        return await context.Events
            .AsNoTracking()
            .Where(e => e.IsActive)
            .OrderBy(e => e.StartDate)
            .ThenBy(e => e.Id)
            .Select(e => e.Id)
            .ToListAsync();
    }

    private async Task<int> GetEventIdBySlug(string slug)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();
        return await context.Events
            .AsNoTracking()
            .Where(e => e.Slug == slug)
            .Select(e => e.Id)
            .SingleAsync();
    }

    private async Task SeedContractData()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();

        if (await context.Events.AnyAsync(e => e.Slug == "contract-page-1|test"))
        {
            return;
        }

        var clujVenue = new Venue
        {
            Name = "Contract Venue Cluj",
            Address = new Address("400001", "10", "Contract Street", "Cluj-Napoca")
        };
        var bucharestVenue = new Venue
        {
            Name = "Contract Venue Bucharest",
            Address = new Address("010001", "20", "Contract Street", "Bucharest")
        };

        var house = new Genre { Name = "Contract House" };
        var techno = new Genre { Name = "Contract Techno" };

        context.Venues.AddRange(clujVenue, bucharestVenue);
        context.Genre.AddRange(house, techno);
        await context.SaveChangesAsync();

        var sharedStartDate = new DateTime(2030, 4, 1, 18, 0, 0, DateTimeKind.Utc);
        var paginationEvents = Enumerable.Range(1, 5)
            .Select(index => new Event
            {
                Name = $"{PaginationPrefix} {index}",
                Slug = $"contract-page-{index}|test",
                StartDate = sharedStartDate,
                IsActive = true,
                VenueId = clujVenue.Id,
                Venue = clujVenue,
                Price = index switch
                {
                    1 => new Price(50, Currency.RON),
                    3 => new Price(75, Currency.EUR),
                    4 => new Price(100, Currency.USD),
                    _ => null
                },
                Genres = index <= 3 ? [house] : [techno]
            })
            .ToList();

        var dateEvents = new List<Event>
        {
            CreateDateEvent(clujVenue, "Contract Dates Inside",
                new DateTime(2030, 5, 10, 10, 0, 0, DateTimeKind.Utc),
                new DateTime(2030, 5, 10, 12, 0, 0, DateTimeKind.Utc)),
            CreateDateEvent(clujVenue, "Contract Dates Straddles Start",
                new DateTime(2030, 5, 9, 20, 0, 0, DateTimeKind.Utc),
                new DateTime(2030, 5, 9, 22, 0, 0, DateTimeKind.Utc)),
            CreateDateEvent(clujVenue, "Contract Dates Straddles End",
                new DateTime(2030, 5, 11, 20, 0, 0, DateTimeKind.Utc),
                new DateTime(2030, 5, 11, 22, 0, 0, DateTimeKind.Utc)),
            CreateDateEvent(bucharestVenue, "Contract Dates Null Inside",
                new DateTime(2030, 5, 10, 15, 0, 0, DateTimeKind.Utc), null),
            CreateDateEvent(bucharestVenue, "Contract Dates Null Outside",
                new DateTime(2030, 5, 12, 10, 0, 0, DateTimeKind.Utc), null),
            CreateDateEvent(bucharestVenue, "Contract Dates Outside After",
                new DateTime(2030, 5, 12, 10, 0, 0, DateTimeKind.Utc),
                new DateTime(2030, 5, 12, 12, 0, 0, DateTimeKind.Utc)),
            CreateDateEvent(bucharestVenue, "Contract Dates Outside Before",
                new DateTime(2030, 5, 8, 10, 0, 0, DateTimeKind.Utc),
                new DateTime(2030, 5, 8, 12, 0, 0, DateTimeKind.Utc))
        };

        context.Events.AddRange(paginationEvents);
        context.Events.AddRange(dateEvents);
        await context.SaveChangesAsync();
    }

    private static Event CreateDateEvent(Venue venue, string name, DateTime start, DateTime? end)
    {
        return new Event
        {
            Name = name,
            Slug = $"{name.ToLowerInvariant().Replace(' ', '-')}|test",
            StartDate = start,
            EndDate = end,
            IsActive = true,
            VenueId = venue.Id,
            Venue = venue
        };
    }
}
