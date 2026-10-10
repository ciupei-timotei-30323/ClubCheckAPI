using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Venue;

namespace ClubCheckAPI.DTO.Event;

public record QueryEventsDto()
{
    public bool? IsActive { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Search { get; set; }
    public string? City { get; set; }
    public Price?  Price { get; set; }
    public VenueSummaryDto? Venue { get; set; }
    // TODO
    // A query can search for events with multiple genres attached to it
    // public ICollection<GenreSummaryDto>? Genres { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}