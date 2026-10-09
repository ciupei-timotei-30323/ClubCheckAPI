using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.DTO.Event;

public record EventSummaryDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    public required DateTime StartDate { get; set; }
    
    [Required]
    public required string Name { get; set; }
}