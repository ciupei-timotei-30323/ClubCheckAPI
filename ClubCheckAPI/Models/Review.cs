using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.Models;

public class Review
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; }

    public int VenueId { get; set; }
    public Venue Venue { get; set; }
    
    public int EventId { get; set; }
    public Event Event { get; set; }

    [Range(1,5)]
    public int Score { get; set; }
    
    [MaxLength(400)] 
    public string? Comment { get; set; }

    public DateTime DatePublished { get; set; }
}