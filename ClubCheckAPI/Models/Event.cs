using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ClubCheckAPI.DomainClasses;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Models;

public class Event
{
    public int Id { get; set; }

    [MaxLength(100)] public required string Name { get; set; }
    [MaxLength(150)] public required string Slug { get; set; }
    public required DateTime StartDate { get; set; }
    public required bool IsActive { get; set; }
    public DateTime? EndDate { get; set; }


    [MaxLength(800)] public string? Description { get; set; }

    public ICollection<Artist> Artists { get; set; } = [];

    // public ICollection<User>? FollowingUsers { get; set; }

    public ICollection<Genre> Genres { get; set; } = [];


    public required int VenueId { get; set; }
    public required Venue Venue { get; set; }


    public Price? Price { get; set; }

    public Uri? TicketUrl { get; set; }

    public Uri? AnnouncementUrl { get; set; }
}