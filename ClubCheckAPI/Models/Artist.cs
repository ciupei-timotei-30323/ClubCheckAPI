using System.ComponentModel.DataAnnotations;

namespace ClubCheckAPI.Models;

public class Artist
{
    public int Id { get; set; }

    [MaxLength(40)] public string Name { get; set; }

    public ICollection<User>? FollowingUsers { get; set; }

    public ICollection<Event>? FutureEvents { get; set; }

    public ICollection<Event>? CompletedEvents { get; set; }

    public ICollection<Genre>? Genres { get; set; }

    public Uri? SpotifyProfileUrl { get; set; }

    public Uri? SpotifyImageUrl { get; set; }

    public Uri? SoundcloudProfileUrl { get; set; }

    public Uri? InstagramProfileUrl { get; set; }
}