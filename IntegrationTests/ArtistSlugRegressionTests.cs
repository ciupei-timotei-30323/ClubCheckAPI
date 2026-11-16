using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class ArtistSlugRegressionTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _httpClient = factory.CreateAuthenticatedClient();

    [Fact]
    public async Task Post_RepeatedSameSlug_AllocatesUniqueSuffixesForDifferentArtists()
    {
        const string baseSlug = "regression|repeated|slug";

        var slugs = new List<string>();
        for (var i = 0; i < 5; i++)
        {
            var response = await _httpClient.PostAsJsonAsync("/Artists/private",
                new { Name = $"Repeated Artist {i}", Slug = baseSlug });
            outputHelper.WriteLine(await response.Content.ReadAsStringAsync());
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var artist = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
            Assert.NotNull(artist);
            slugs.Add(artist.Slug);
        }

        Assert.Equal(
            [baseSlug, $"{baseSlug}-2", $"{baseSlug}-3", $"{baseSlug}-4", $"{baseSlug}-5"],
            slugs);
    }

    [Fact]
    public async Task Post_ConcurrentSameSlug_CreatesAllDifferentArtistsWithUniqueSlugs()
    {
        const string baseSlug = "regression|concurrent|slug";

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(i =>
            _httpClient.PostAsJsonAsync("/Artists/private",
                new { Name = $"Concurrent Artist {i}", Slug = baseSlug })));

        var artists = await Task.WhenAll(responses.Select(async response =>
        {
            outputHelper.WriteLine(await response.Content.ReadAsStringAsync());
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        }));

        Assert.All(artists, Assert.NotNull);
        Assert.Equal(8, artists.Select(a => a!.Slug).Distinct().Count());
    }

    [Fact]
    public async Task Post_SameArtistRepeatedly_ReturnsSameArtistAndCreatesOneRow()
    {
        const string name = "Idempotent Artist";
        const string slug = "idempotent|artist|identity";

        var first = await CreateArtist(name, slug);
        var second = await CreateArtist(name, slug);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(first.Slug, second.Slug);
        Assert.Equal(1, await CountArtists(name));
    }

    [Fact]
    public async Task Post_SameArtistWithGeneratedSuffix_ReturnsOriginalArtistAndCreatesOneRow()
    {
        const string name = "Suffixed Replay Artist";
        const string slug = "idempotent|artist|generated-suffix";

        var first = await CreateArtist(name, slug);
        var second = await CreateArtist(name, $"{slug}-2");
        var third = await CreateArtist(name, $"{slug}-3");

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(first.Id, third.Id);
        Assert.Equal(first.Slug, second.Slug);
        Assert.Equal(first.Slug, third.Slug);
        Assert.Equal(1, await CountArtists(name));
    }

    [Fact]
    public async Task Post_SameArtistWithDiacriticNameVariant_ReturnsOriginalArtistAndCreatesOneRow()
    {
        const string firstSlug =
            "042e3510-71ca-42db-a6c4-3029d11ab8f3|iuly-neamtu|iuly-neamtu|romanian-manele-singer|person|male|ro|romania|iuly-neamtu|manele|manele|discogs";

        var firstResponse = await _httpClient.PostAsJsonAsync("/Artists/private", new
        {
            Name = "Iuly Neamțu",
            Slug = firstSlug,
            SpotifyProfileUrl = (string?)null,
            SpotifyImageUrl = (string?)null,
            SoundcloudProfileUrl = (string?)null,
            InstagramProfileUrl = (string?)null
        });
        var secondResponse = await _httpClient.PostAsJsonAsync("/Artists/private", new
        {
            Name = "Iuly Neamtu",
            Slug = firstSlug,
            SpotifyProfileUrl = (string?)null,
            SpotifyImageUrl = (string?)null,
            SoundcloudProfileUrl = (string?)null,
            InstagramProfileUrl = (string?)null
        });

        outputHelper.WriteLine(await firstResponse.Content.ReadAsStringAsync());
        outputHelper.WriteLine(await secondResponse.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);

        var first = await firstResponse.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        var second = await secondResponse.Content.ReadFromJsonAsync<ArtistSummaryDto>();

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(first.Slug, second.Slug);
        Assert.Equal(1, await CountArtistsByUuid(Guid.Parse("042e3510-71ca-42db-a6c4-3029d11ab8f3")));
    }

    [Fact]
    public async Task Post_SameArtistConcurrently_ReturnsSameArtistAndCreatesOneRow()
    {
        const string name = "Concurrent Idempotent Artist";
        const string slug = "idempotent|artist|concurrent-identity";

        var responses = await Task.WhenAll(Enumerable.Range(0, 10).Select(_ =>
            _httpClient.PostAsJsonAsync("/Artists/private", new { Name = name, Slug = slug })));

        await AssertConcurrentRequestsReturnSameArtist(name, responses);
    }

    [Fact]
    public async Task Post_SameArtistConcurrentlyWithGeneratedSuffixes_ReturnsSameArtistAndCreatesOneRow()
    {
        const string name = "Concurrent Suffixed Artist";
        const string slug = "idempotent|artist|concurrent-suffix";

        var responses = await Task.WhenAll(Enumerable.Range(0, 10).Select(i =>
            _httpClient.PostAsJsonAsync("/Artists/private",
                new { Name = name, Slug = i % 2 == 0 ? slug : $"{slug}-{i + 2}" })));

        await AssertConcurrentRequestsReturnSameArtist(name, responses);
    }

    private async Task AssertConcurrentRequestsReturnSameArtist(
        string name,
        IEnumerable<HttpResponseMessage> responses)
    {

        var artists = await Task.WhenAll(responses.Select(async response =>
        {
            outputHelper.WriteLine(await response.Content.ReadAsStringAsync());
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        }));

        Assert.All(artists, Assert.NotNull);
        Assert.Single(artists.Select(a => a!.Id).Distinct());
        Assert.Equal(1, await CountArtists(name));
    }

    private async Task<ArtistSummaryDto> CreateArtist(string name, string slug)
    {
        var response = await _httpClient.PostAsJsonAsync("/Artists/private", new { Name = name, Slug = slug });
        outputHelper.WriteLine(await response.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var artist = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
        Assert.NotNull(artist);
        return artist;
    }

    private async Task<int> CountArtists(string name)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();
        return await context.Artists.CountAsync(a => a.Name == name);
    }

    private async Task<int> CountArtistsByUuid(Guid uuid)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ClubCheckAPIContext>();
        var uuidPrefix = $"{uuid:D}|";
        return await context.Artists.CountAsync(a => a.Slug.StartsWith(uuidPrefix));
    }
}
