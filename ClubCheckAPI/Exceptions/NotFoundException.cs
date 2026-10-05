using System.Net;

namespace ClubCheckAPI.Exceptions;

public sealed class NotFoundException : AppException
{
    // production Message
    public NotFoundException(string message) : base(message, HttpStatusCode.NotFound)
    {
    }
    
    // Development Message
    public NotFoundException(string resourceName, object key) : base(
        $"[{resourceName}] with key [{key}] cannot be found", HttpStatusCode.NotFound)
    {
    }
}