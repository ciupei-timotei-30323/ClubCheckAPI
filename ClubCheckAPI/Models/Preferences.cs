using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.Models;

public class Preferences
{
    
    
    // No two preferences for one user
    [Key]
    public int UserId { get; set; }
    public User User { get; set; }


    [MaxLength(100)] public string City { get; set; }

    // public string Country { get; set; }

    public bool HasEmailAnnouncement { get; set; }

    public bool HasPhoneAnnouncement { get; set; }
}