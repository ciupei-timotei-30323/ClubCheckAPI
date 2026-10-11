using System.ComponentModel.DataAnnotations;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;

namespace ClubCheckAPI.DTO.Artist;

public record PublicArtistDetailedDto()
{
    [Required]
    public required int Id { get; set; }
    
    [Required]
    [MaxLength(150)]
    public required string Name { get; set; }

    public ICollection<EventSummaryDto> Events { get; set; } = [];

    public ICollection<GenreSummaryDto> Genres { get; set; } = [];
    
    public Uri? SpotifyProfileUrl { get; set; }

    public Uri? SpotifyImageUrl { get; set; }

    public Uri? SoundcloudProfileUrl { get; set; }

    public Uri? InstagramProfileUrl { get; set; }
}