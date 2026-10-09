using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Event;

namespace ClubCheckAPI.DTO.Venue;

public record PublicVenueDetailedDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }
    
    public Address? Address  { get; set; }
    
    // public Uri? GoogleMapsUrl { get; set; }
    
    public ICollection<EventSummaryDto>? EventSummary { get; set; }
    
    // public ICollection<ReviewSummaryDto>?  ReviewSummary { get; set; }
    
    
}