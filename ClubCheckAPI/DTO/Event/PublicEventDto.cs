using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;


namespace ClubCheckAPI.DTO.Event;

public record PublicEventDto()
{
    [Required] 
    public required int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }
    
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
    public required string VenueName { get; set; }

    public ICollection<string> GenresName { get; set; } = [];

    public ICollection<string> ArtistsName { get; set; } = [];
}