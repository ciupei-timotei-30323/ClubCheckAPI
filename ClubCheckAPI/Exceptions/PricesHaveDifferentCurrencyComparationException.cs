using System.Net;

namespace ClubCheckAPI.Exceptions;

public class PricesHaveDifferentCurrencyComparationException : AppException
{
    public PricesHaveDifferentCurrencyComparationException(string? currency1, string? currency2,
        HttpStatusCode statusCode = HttpStatusCode.BadRequest) : base("Bad Request", $"Prices of currency {currency1} and {currency2} cannot be compared",
        statusCode)
    {
    }
}