using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Artist;

public record ArtistSummaryDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    [MaxLength(150)]
    public required string Name { get; set; }
}