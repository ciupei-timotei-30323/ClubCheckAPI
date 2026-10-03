namespace ClubCheckAPI.Models;

public class Review
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    public User User { get; set; }
    
    public int VenueId { get; set; }
    public Venue Venue { get; set; }
    
    public ReviewScoring Score { get; set; }
    
    public DateTime DatePublished { get; set; }
    
    
}