using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.Models;

public class Genre
{
    public int Id { get; set; }
    
    [MaxLength(50)]
    public required string Name { get; set; }
    
    // public ICollection<User> FollowingUsers { get; set; }

    public ICollection<Artist> Artists { get; set; } = [];

    public ICollection<Event> Events { get; set; } = [];

}