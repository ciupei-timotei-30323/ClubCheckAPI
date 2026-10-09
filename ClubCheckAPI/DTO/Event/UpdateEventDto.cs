using ClubCheckAPI.Models;

namespace ClubCheckAPI.DTO.Event;

public record UpdateEventDto()
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
    public string? Description { get; set; }
    public Price?  Price { get; set; }
    public Uri? TicketUrl { get; set; }
    public Uri? AnnouncementUrl { get; set; }
    
    // Connection with other DTO's
    // TODO
}