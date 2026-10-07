using System.Net;
using ClubCheckAPI.Models;

namespace ClubCheckAPI.Exceptions;

public sealed class DbNotConnectedException : AppException
{
    public DbNotConnectedException(string dbId,
        HttpStatusCode statusCode = HttpStatusCode.FailedDependency) : base(
        publicMessage: "Database offline",
        internalMessage: $"DB with ID [{dbId}] is offline", 
        statusCode)
    {
    }
}