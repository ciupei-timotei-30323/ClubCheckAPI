using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Serilog;
using Testcontainers.PostgreSql;
using Xunit.Abstractions;

namespace TestProject1;

public sealed class PostgreSQLTests() : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgreSqlContainer = new PostgreSqlBuilder().Build();

    public Task InitializeAsync()
    {
        return _postgreSqlContainer.StartAsync();
    }


    public Task DisposeAsync()
    {
        return _postgreSqlContainer.DisposeAsync().AsTask();
    }

    public sealed class ArtistCreationTests : IClassFixture<PostgreSQLTests>, IDisposable
    {
        private readonly WebApplicationFactory<Program> _webApplicationFactory;

        private readonly ITestOutputHelper _outputHelper;

        private readonly HttpClient _httpClient;

        public ArtistCreationTests(PostgreSQLTests fixture, ITestOutputHelper outputHelper)
        {
            _outputHelper = outputHelper;
            var clientOptions = new WebApplicationFactoryClientOptions();

            clientOptions.AllowAutoRedirect = false;

            _webApplicationFactory = new CustomWebApplicationFactory(fixture);
            var db = (ClubCheckAPIContext)_webApplicationFactory.Services.CreateScope().ServiceProvider.GetService(typeof(ClubCheckAPIContext));
            db.Database.Migrate();
            _httpClient = _webApplicationFactory.CreateClient(clientOptions);
        }

        public void Dispose()
        {
            _webApplicationFactory.Dispose();
        }

        private sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
        {
            private readonly string _connectionString;

            public CustomWebApplicationFactory(PostgreSQLTests fixture)
            {
                _connectionString = fixture._postgreSqlContainer.GetConnectionString();
            }

            protected override void ConfigureWebHost(IWebHostBuilder builder)
            {
                builder.ConfigureServices(services =>
                    {
                        services.Remove(services.SingleOrDefault(service =>
                            typeof(DbContextOptions<ClubCheckAPIContext>) == service.ServiceType));
                        services.Remove(
                            services.SingleOrDefault(service => typeof(DbConnection) == service.ServiceType));
                        services.AddDbContext<ClubCheckAPIContext>((_, option) => option.UseNpgsql(_connectionString));
                    }
                );
            }
        }

        /// <summary>
        /// ARTIST CREATION TESTS
        /// </summary>
        [Fact]
        public async Task Post_CreateArtist_ReturnsCreated()
        {
            // Arrange
            var name= "THAKK";
            var slug = "thakk|clujNapoca";

            // Act
            var response = await _httpClient.PostAsJsonAsync("/Artists", new { Name = name, Slug = slug });
            
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
            var response = await _httpClient.PostAsJsonAsync("/Artists", new { Name = name });
            
            _outputHelper.WriteLine(await response.Content.ReadAsStringAsync());
            
            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Post_CreateArtistWithAlreadyPresentSlug_ReturnsCreated()
        {
            // Arrange
            await _httpClient.PostAsJsonAsync("/Artists",
                new { Name = "Justice", Slug = "justice|france|frenchElectronicDuo" });
            
            // Act
            var response = await _httpClient.PostAsJsonAsync("/Artists",
                new { Name = "Justice Tribute Band", Slug = "justice|france|frenchElectronicDuo" });

            var responseJson = await response.Content.ReadFromJsonAsync<ArtistSummaryDto>();
            _outputHelper.WriteLine(responseJson.ToString());
            
            // Asser
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.Equal("justice|france|frenchElectronicDuo-2",responseJson.Slug);
        }
    }
}