using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using Microsoft.EntityFrameworkCore;
using ClubCheckAPI.Models;
using ClubCheckAPI.Services;
using Scalar.AspNetCore;
using Serilog;


Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();
try
{
    Log.Information("Starting up...");

    var builder = WebApplication.CreateBuilder(args);

// Adding ProblemDetails and GlobalExceptionHandler
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add services to the container.
// Adding the Database connection
    var connString = builder.Configuration.GetConnectionString("DefaultConnection");

    Log.Information("Connecting to database...");
    builder.Services.AddDbContext<ClubCheckAPIContext>(options => options.UseNpgsql(connString,

        // This enables retry on dead connections
        npgsqlOptionsAction: sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(2),
                errorCodesToAdd: null);
        }
    ));

    
    builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
    builder.Services.AddOpenApi();

    builder.Services.AddScoped<IGenreService, GenreService>();
    
    var app = builder.Build();


    app.UseExceptionHandler();
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
}
finally
{
    Log.CloseAndFlush();
}