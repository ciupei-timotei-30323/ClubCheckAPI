using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;
//TODO
// Implement 'Genre' model class
public class Event
{
    
    public int Id { get; set; }
    
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    
    
    [MaxLength(800)]    
    public string? Description { get; set; }
    
    public ICollection<Artist> Lineup { get; set; }
    
    public ICollection<User>? FollowingUsers { get; set; }
    
    // Users who completed this event
    public ICollection<User>? CompletedUsers { get; set; }
    
    
    
    
    public int VenueId { get; set; }    
    public Venue Venue { get; set; }
    
    public Price? Price { get; set; }
    
    public Uri? TicketUrl { get; set; }
    
    public Uri? AnnouncementUrl { get; set; }
    
    
    
}