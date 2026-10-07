using ClubCheckAPI.Exceptions;
using Microsoft.EntityFrameworkCore;
using ClubCheckAPI.Models;

var builder = WebApplication.CreateBuilder(args);

// Adding ProblemDetails and GlobalExceptionHandler
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add services to the container.
// Adding the Database connection
var connString = builder.Configuration.GetConnectionString("DefaultConnection");

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

var app = builder.Build();


app.UseExceptionHandler();
app.Logger.LogInformation("Starting Application...");
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


if (app.Environment.IsProduction())
{
    //TODO
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

