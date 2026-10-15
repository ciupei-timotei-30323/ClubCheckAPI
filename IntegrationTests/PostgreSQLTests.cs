using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Serilog;
using Testcontainers.PostgreSql;

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

        private readonly HttpClient _httpClient;

        public ArtistCreationTests(PostgreSQLTests fixture)
        {
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
        public async Task Post_CreateArtist_ReturnsRedirectToRoot()
        {
            // Arrange


            // Act
            var response = await _httpClient.PostAsJsonAsync("/Artists", new { Name = "THAKK", Slug = "thakk|clujNapoca" });

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
    }
}