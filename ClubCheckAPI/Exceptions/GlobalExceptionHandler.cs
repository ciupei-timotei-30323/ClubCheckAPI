using System.Net;
using System.Security.Principal;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Exceptions;

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> _logger,
    IProblemDetailsService _problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception occured. TraceID: {}", httpContext.TraceIdentifier);

        var (statusCode, title) = MapException(exception);

        httpContext.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = GetSafeErrorMessage(exception, httpContext),
            Instance = httpContext.Request.Path
        };

        // problemDetails.Extensions["traceID"] = httpContext.TraceIdentifier;
        problemDetails.Extensions["TimeUTC"] = DateTime.UtcNow;

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext()
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails
        });
    }

    private static (int statusCode, string title) MapException(Exception exception) => exception switch
    {
        AppException appException => ((int)appException.StatusCode, appException.PublicMessage),
        ArgumentException => (StatusCodes.Status400BadRequest, "Bad Request"),
        UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
        _ => (StatusCodes.Status500InternalServerError, "An internal error occured")
    };


    private static string? GetSafeErrorMessage(Exception exception, HttpContext context)
    {
        var env = context.RequestServices.GetRequiredService<IHostEnvironment>();
        if (env.IsDevelopment())
        {
            return exception.Message;
        }

        if (exception is AppException appException)
        {
            return appException.PublicMessage;
        }

        return null;
    }
}