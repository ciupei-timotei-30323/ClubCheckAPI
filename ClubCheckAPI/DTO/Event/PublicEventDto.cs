using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.DTO.Venue;
using ClubCheckAPI.Models;

namespace ClubCheckAPI.DTO.Event;

public record PublicEventDto()
{
    [Required] 
    public required int Id { get; set; }
    
    [Required]
    public required DateTime StartDate { get; set; }
    
    [MaxLength(800)]
    public string? Description { get; set; }
    
    
    public Uri? AnnouncementUrl { get; set; }
    public Uri? TicketUrl { get; set; }
    public Price?  Price { get; set; }
    public DateTime? EndDate { get; set; }
    
    
    // Connection with other DTO's
    
    [Required]
    public required VenueSummaryDto Venue { get; set; }
    
    public ICollection<GenreSummaryDto>? Genres { get; set; }
    
    public ICollection<ArtistSummaryDto>? Artists { get; set; }
}