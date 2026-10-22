using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;

public class Genre
{
    public int Id { get; set; }
    
    [MaxLength(50)]
    public required string Name { get; set; }
    
    // public ICollection<User> FollowingUsers { get; set; }

    [DeleteBehavior(DeleteBehavior.SetNull)]
    public ICollection<Artist> Artists { get; set; } = [];

    [DeleteBehavior(DeleteBehavior.SetNull)]
    public ICollection<Event> Events { get; set; } = [];

}