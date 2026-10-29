using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ClubCheckAPI.Helpers;

public static class UtcDateTime
{
    public static DateTime Normalize(DateTime v) => v.Kind switch
    {
        DateTimeKind.Utc => v,
        DateTimeKind.Local => v.ToUniversalTime(),
        _ => DateTime.SpecifyKind(v, DateTimeKind.Utc) // treat unspecified as UTC
    };
}


public class UtcConverter() : ValueConverter<DateTime, DateTime>(
    v => UtcDateTime.Normalize(v),
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

public class NullableUtcConverter() : ValueConverter<DateTime?, DateTime?>(
    v => v.HasValue ? UtcDateTime.Normalize(v.Value) : v,
    v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);