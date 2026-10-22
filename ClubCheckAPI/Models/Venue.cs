using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DomainClasses;

namespace ClubCheckAPI.Models;

public class Venue
{
    public int Id { get; set; }

    [MaxLength(100)] public required string Name { get; set; }

    public Address? Address { get; set; }



    // public Uri? GoogleMapsUrl { get; set; }

    public ICollection<Event> Events { get; set; } = [];

    // public ICollection<Review>? Reviews { get; set; }

    // public ICollection<User>? FollowingUsers { get; set; }

    
    
}