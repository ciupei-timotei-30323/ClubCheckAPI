using System.Net;

namespace ClubCheckAPI.Exceptions;

public class DbException : AppException
{
    public DbException(string internalMessage) : base("An error has appeared", internalMessage, HttpStatusCode.ServiceUnavailable)
    {
    }
}