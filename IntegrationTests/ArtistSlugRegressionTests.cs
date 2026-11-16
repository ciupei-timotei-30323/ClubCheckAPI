using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DTO.Artist;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class ArtistSlugRegressionTests(IntegrationTestWebAppFactory factory, ITestOutputHelper outputHelper)
    : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _httpClient = factory.CreateAuthenticatedClient();

    [Fact]
    public async Task Post_RepeatedSameSlug_AllocatesUniqueSuffixes()
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
    public async Task Post_ConcurrentSameSlug_CreatesAllArtistsWithUniqueSlugs()
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
}
