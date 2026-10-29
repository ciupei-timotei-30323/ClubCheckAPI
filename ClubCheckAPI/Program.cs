using ClubCheckAPI.ApiAuth;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using Microsoft.EntityFrameworkCore;
using ClubCheckAPI.Models;
using ClubCheckAPI.Services;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Scalar.AspNetCore;
using Serilog;


Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();
try
{
    Log.Information("Starting up...");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services),true); // True otherwise Logger freezes in Testing (idk why)

    // Adding API key authorization
    builder.Services
        .AddAuthentication(ApiKeyAuthenticationOptions.DefaultScheme)
        .AddScheme<ApiKeyAuthenticationOptions, ApiAuthHandler>(
            ApiKeyAuthenticationOptions.DefaultScheme, _ => { });
    builder.Services.AddAuthorization();
    
    
// Adding ProblemDetails and GlobalExceptionHandler
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add services to the container.
// Adding the Database connection
    var connString = builder.Configuration.GetConnectionString("DefaultConnection");

    Log.Information("Connecting to database...");
    builder.Services.AddDbContext<ClubCheckAPIContext>(options => options.UseNpgsql(connString,

            // This enables retry on dead connections
            npgsqlOptionsAction:
            sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(2),
                    errorCodesToAdd: null);

                sqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);


            }
        )
    );


    builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
    builder.Services.AddOpenApi();

    builder.Services.AddScoped<IGenreService, GenreService>();
    builder.Services.AddScoped<IArtistService, ArtistService>();
    builder.Services.AddScoped<IVenueService, VenueService>();
    builder.Services.AddScoped<IEventService, EventService>();
    

    var app = builder.Build();

    // app.MapGet("/public/", () => "anyone can read this");
    //
    // app.MapGet("/private/", () => "only callers with a valid API key see this")
    //     .RequireAuthorization();
    

    app.UseExceptionHandler();
    app.UseSerilogRequestLogging();
// Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
    }


    if (app.Environment.IsProduction())
    {
        //TODO
    }

    app.UseHttpsRedirection();

    app.UseAuthorization();

    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}