using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Artist;

public record PublicArtistDto()
{
    [Required]
    [MaxLength(150)]
    public required string Name { get; set; }
    
    [Required]
    [MaxLength(150)]
    public required string Slug { get; set; }
}