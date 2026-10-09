using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Venue;

public record PublicVenueDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    public required string Name { get; set; }
    
    public string? City { get; set; }
    
    public ICollection<int>? EventIds { get; set; }
    
    
}