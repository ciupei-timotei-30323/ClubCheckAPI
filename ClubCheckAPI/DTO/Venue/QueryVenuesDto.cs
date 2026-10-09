using ClubCheckAPI.DomainClasses;

namespace ClubCheckAPI.DTO.Venue;

public record QueryVenuesDto()
{
    public string?  Name { get; set; }
    public Address? Address { get; set; }
}