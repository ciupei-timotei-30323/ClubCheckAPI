using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ClubCheckAPI.Models;

public class Artist
{
    public int Id { get; set; }

    [MaxLength(150)] public string Name { get; set; }

    public ICollection<User>? FollowingUsers { get; set; }

    public ICollection<Event>? Events { get; set; }
    
    public ICollection<Genre>? Genres { get; set; }

    public Uri? SpotifyProfileUrl { get; set; }

    public Uri? SpotifyImageUrl { get; set; }

    public Uri? SoundcloudProfileUrl { get; set; }

    public Uri? InstagramProfileUrl { get; set; }
}