using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.Models;

public class User
{
    public int Id  { get; set; }
    
    [MaxLength(50)]
    public string Name { get; set; }
    
    [MaxLength(50)]
    public string Email { get; set; }
    
    public string PasswordHashed { get; set; }
    
    public Preferences Preferences { get; set; }
    
    //TODO: FluentAPI connection with the Event class
    public ICollection<Event>? FollowedEvents { get; set; }
    
    public ICollection<Artist>? FollowedArtists { get; set; }
    
    public ICollection<Event>? CompletedEvents { get; set; }
    
    public ICollection<Venue>? FollowedVenues { get; set; }
    
    public ICollection<Review>? GivenReviews { get; set; }
    
    [Range(1,10000)]
    public int CompletedEventsCount { get; set; }
    
    // Constructor
    // public User()
    
}