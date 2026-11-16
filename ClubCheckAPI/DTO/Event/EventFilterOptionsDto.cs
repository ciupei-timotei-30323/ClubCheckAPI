namespace ClubCheckAPI.DTO.Event;

public record EventFilterOptionsDto
{
    public ICollection<EventFilterOptionDto> Cities { get; set; } = [];
    public ICollection<VenueFilterOptionDto> Venues { get; set; } = [];
    public ICollection<EventFilterOptionDto> Genres { get; set; } = [];
}

public record EventFilterOptionDto
{
    public required string Name { get; set; }
    public int Count { get; set; }
}

public record VenueFilterOptionDto
{
    public required string Name { get; set; }
    public string? City { get; set; }
    public int Count { get; set; }
}
