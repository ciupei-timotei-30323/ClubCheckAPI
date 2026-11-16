using System.Text.Json.Serialization;
using ClubCheckAPI.DomainClasses;

namespace ClubCheckAPI.DTO.Event;

public record PublicPriceDto
{
    public decimal Value { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public Currency? Currency { get; set; }
}
