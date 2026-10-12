using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Artist;

public record CreateArtistDto()
{
    [Required]
    [MaxLength(150)]
    public required string Name { get; set; }
    
    [Required]
    [MaxLength(300)]
    public required string Slug { get; set; }
}