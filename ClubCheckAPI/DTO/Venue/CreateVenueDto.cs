using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;

namespace ClubCheckAPI.DTO.Venue;

public record CreateVenueDto()
{
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }
    
    public Address? Address { get; set; }
    public ICollection<int>? EventIds { get; set; }
}