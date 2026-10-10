using ClubCheckAPI.DomainClasses;


namespace ClubCheckAPI.DTO.Event;

public record QueryEventsDto()
{
    public bool? IsActive { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Name { get; set; }
    public string? City { get; set; }
    public Price?  Price { get; set; }
    public string? VenueName { get; set; }
    public ICollection<string>? GenresNames { get; set; }
    public string? Artist { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}