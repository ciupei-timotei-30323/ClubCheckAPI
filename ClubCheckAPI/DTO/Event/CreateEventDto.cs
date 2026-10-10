using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.DTO.Venue;
using ClubCheckAPI.Models;

namespace ClubCheckAPI.DTO.Event;

public record CreateEventDto()
{
    [Required]
    public string Name { get; set; }
    [Required]
    public DateTime StartDate { get; set; }
    [Required]
    public bool IsActive { get; set; } =  true;
    
    public DateTime? EndDate { get; set; }
    [MaxLength(800)]
    public string? Description { get; set; }
    public Price? Price { get; set; }
    public Uri? TicketUrl { get; set; }
    public Uri? AnnouncementUrl { get; set; }
    
    // Connection with other DTO's
    [Required]
    public required int VenueId {get; set;} 
    
    public ICollection<int>? GenresId { get; set; }
    
    public ICollection<int>? ArtistsId { get; set; }
    
}