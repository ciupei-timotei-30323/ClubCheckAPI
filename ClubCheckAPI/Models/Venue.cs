using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;

public class Venue
{
    
    public int Id { get; set; }
    
    [MaxLength(50)]
    public string Name { get; set; }
    
    public Address? Address { get; set; }
    
    public ICollection<Event>? Events { get; set; }
    
    public ICollection<Review>? Reviews { get; set; }
    
    public ICollection<User>? FollowingUsers { get; set; }
    
    // max value: 5.0
    [Precision(2,1)]
    [Range(1,5)]
    public decimal? AvgRating { get; set; }
    
}