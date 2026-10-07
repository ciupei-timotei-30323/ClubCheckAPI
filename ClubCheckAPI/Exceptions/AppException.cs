using System.Net;

namespace ClubCheckAPI.Exceptions;

public abstract class AppException : Exception
{
    public HttpStatusCode StatusCode { get; }
    public string PublicMessage { get; }
    protected AppException(string publicMessage, string internalMessage, HttpStatusCode statusCode = HttpStatusCode.InternalServerError) :
        base(internalMessage)
    {
        StatusCode = statusCode;
        PublicMessage = publicMessage;
    }
    
}