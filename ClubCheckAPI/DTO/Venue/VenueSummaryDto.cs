using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Venue;

public record VenueSummaryDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    public required string Name { get; set; }
}