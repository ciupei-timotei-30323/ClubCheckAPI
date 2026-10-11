using System.Collections;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class ArtistService(ClubCheckAPIContext context, ILogger<ArtistService> logger) : IArtistService
{
    public async Task<PublicArtistDetailedDto> GetArtistByName(string name, CancellationToken ct)
    {
        var artistDto = await context.Artists
            .Where(a => a.Name == name)
            .Select(a => new PublicArtistDetailedDto()
            {
                Id = a.Id,
                Name = a.Name,
                InstagramProfileUrl = a.InstagramProfileUrl,
                SoundcloudProfileUrl = a.SoundcloudProfileUrl,
                SpotifyProfileUrl = a.SpotifyProfileUrl,
                SpotifyImageUrl = a.SpotifyImageUrl,
                Events = a.Events.Select(e => new EventSummaryDto()
                {
                    Id = e.Id,
                    Name = e.Name,
                    StartDate = e.StartDate
                }).ToList(),
                Genres = a.Genres.Select(g => new GenreSummaryDto()
                {
                    Id = g.Id,
                    Name = g.Name
                }).ToList()
            }).FirstOrDefaultAsync(ct);

        if (artistDto is null)
        {
            throw new NotFoundException(nameof(Artist), name);
        }

        return artistDto;
    }

    public Task<ArtistSummaryDto> Create(CreateArtistDto dto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }
}
