using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;


public class Event
{
    public int Id { get; set; }

    public DateTime StartDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime? EndDate { get; set; }


    [MaxLength(800)] public string? Description { get; set; }

    public ICollection<Artist> Artists { get; set; }

    public ICollection<User>? FollowingUsers { get; set; }

    public ICollection<Genre>? Genres { get; set; }


    public int VenueId { get; set; }
    public Venue Venue { get; set; }

    
    public Price? Price { get; set; }

    public Uri? TicketUrl { get; set; }

    public Uri? AnnouncementUrl { get; set; }
    
    
}