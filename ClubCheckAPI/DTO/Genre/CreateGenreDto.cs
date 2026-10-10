using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Genre;

public record CreateGenreDto()
{
    [Required]
    public required string Name { get; set; }
}