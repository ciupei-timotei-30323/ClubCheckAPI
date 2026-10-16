using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace IntegrationTests;

public class IntegrationTestWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgreSqlContainer = new PostgreSqlBuilder().Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _postgreSqlContainer.GetConnectionString();
    }

    // 3. IAsyncLifetime starts the container (and you can even run Database.Migrate() right after!)
    public async Task InitializeAsync()
    {
        await _postgreSqlContainer.StartAsync();
        // this.Services.GetService<ClubCheckAPIContext>().Database.Migrate();
        var db = (ClubCheckAPIContext)this.Services.CreateScope().ServiceProvider
            .GetService(typeof(ClubCheckAPIContext));
        db?.Database.Migrate();
        
    }

    public new Task DisposeAsync()
    {
        return _postgreSqlContainer.DisposeAsync().AsTask();
    }
}