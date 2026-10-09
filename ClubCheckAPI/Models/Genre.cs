namespace ClubCheckAPI.Models;

public class Genre
{
    public int Id { get; set; }
    
    public string Name { get; set; }
    
    // public ICollection<User> FollowingUsers { get; set; }
    
    public ICollection<Artist> Artists { get; set; }
    
    public ICollection<Event> Events { get; set; }
    
}