namespace ClubCheckAPI.ApiAuth;

using Microsoft.AspNetCore.Authentication;


public sealed class ApiKeyAuthenticationOptions : AuthenticationSchemeOptions
{
    public const string DefaultScheme = "ApiKey";
    public const string HeaderName = "X-API-Key";
    
    
}