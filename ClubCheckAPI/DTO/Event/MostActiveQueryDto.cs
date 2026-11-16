using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Event;

public record MostActiveQueryDto
{
    [Range(0, int.MaxValue)]
    public int TopGenresLimit { get; set; } = 10;

    [Range(0, int.MaxValue)]
    public int TopVenuesLimit { get; set; } = 10;

    [Range(0, int.MaxValue)]
    public int TopArtistsLimit { get; set; } = 10;

    [Range(0, int.MaxValue)]
    public int? TopCitiesLimit { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, int.MaxValue)]
    public int PageSize { get; set; } = 20;
}
