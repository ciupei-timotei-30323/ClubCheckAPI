namespace ClubCheckAPI.DTO.Event;

public record MostActiveStatisticsDto
{
    public ICollection<MostActiveItemDto> TopCities { get; set; } = [];
    public ICollection<MostActiveItemDto> TopGenres { get; set; } = [];
    public ICollection<MostActiveItemDto> TopArtists { get; set; } = [];
    public ICollection<MostActiveItemDto> TopVenues { get; set; } = [];
    public PaginationDto Pagination { get; set; } = new();
}

public record MostActiveItemDto
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required int EventCount { get; set; }
}

public record PaginationDto
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}
