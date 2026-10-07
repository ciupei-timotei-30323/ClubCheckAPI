using System.Net;

namespace ClubCheckAPI.Exceptions;

public sealed class NotFoundException : AppException
{
    public NotFoundException(string resourceName, object key, HttpStatusCode statusCode = HttpStatusCode.NotFound) :
        base(
            internalMessage: $"[{resourceName}] with [{key}] was not found.]",
            publicMessage: "Not Found",
            statusCode: statusCode
        )
    {
    }
}