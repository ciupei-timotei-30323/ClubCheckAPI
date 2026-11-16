using ClubCheckAPI.DomainClasses;


namespace ClubCheckAPI.DTO.Event;

public record QueryEventsDto()
{
    /// <summary>
    /// Optional active-state filter.
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Inclusive start of the requested date range as an ISO-8601 instant with offset.
    /// An event matches when its end (or start, when no end is set) is on or after this instant.
    /// Omit for an open-ended start.
    /// </summary>
    public DateTimeOffset? StartDate { get; set; }

    /// <summary>
    /// Inclusive end of the requested date range as an ISO-8601 instant with offset.
    /// An event matches when its start is on or before this instant.
    /// Omit for an open-ended end.
    /// </summary>
    public DateTimeOffset? EndDate { get; set; }

    /// <summary>
    /// Case-insensitive substring filter on the event name.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Case-insensitive substring filter on the organizer.
    /// </summary>
    public string? Organizer { get; set; }

    /// <summary>
    /// Case-insensitive substring filter on the venue city.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// Maximum price filter. The event currency must match and the value must be less than or equal to this value.
    /// </summary>
    public Price?  Price { get; set; }

    /// <summary>
    /// Case-insensitive substring filter on the venue name.
    /// </summary>
    public string? VenueName { get; set; }

    /// <summary>
    /// Restricts results to events linked to at least one of the supplied genre names.
    /// </summary>
    public ICollection<string> GenresNames { get; set; } = [];

    /// <summary>
    /// Case-insensitive substring filter on any linked artist name.
    /// </summary>
    public string? Artist { get; set; }

    /// <summary>
    /// Case-insensitive OR search across the event name, venue name and any linked artist name.
    /// This filter is combined with all other filters using AND.
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// One-based page number. Values below 1 are clamped to 1.
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page. Values outside 1-100 are clamped into that range. Defaults to 10.
    /// </summary>
    public int PageSize { get; set; } = 10;
}