using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Genre;

public record GenreSummaryDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    public required string Name { get; set; }
}