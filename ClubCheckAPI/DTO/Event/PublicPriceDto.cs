using System.Text.Json.Serialization;

namespace ClubCheckAPI.DTO.Event;

public record PublicPriceDto
{
    public decimal Value { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter<PublicCurrency>))]
    public PublicCurrency? Currency { get; set; }
}
