namespace ClubCheckAPI.DTO;

public record DeleteEventsQuery()
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public bool? IsActive { get; set; }
    public int? Id  { get; set; }
    
    /// Delete all events from this venue
    public int? VenueId { get; set; }
    
    /// Delete all events where this artist participates
    /// This only applies when there is only one artist at the event
    /// This doesn't do anything otherwise
    public int? ArtistId { get; set; }
}