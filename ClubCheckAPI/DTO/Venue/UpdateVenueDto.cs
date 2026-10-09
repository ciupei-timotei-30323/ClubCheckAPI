namespace ClubCheckAPI.DTO.Venue;

public record UpdateVenueDto()
{
    public string? Name { get; set; }
    
    public string? Address { get; set; }
}