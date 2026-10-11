using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.Helpers;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class ArtistService(ClubCheckAPIContext context, ILogger<ArtistService> logger) : IArtistService
{
    public async Task<PublicArtistDetailedDto> GetArtistBySlug(string slug, CancellationToken ct)
    {
        var artistDto = await context.Artists
            .Where(a => a.Slug == slug.ToLowerInvariant())
            .Select(a => new PublicArtistDetailedDto()
            {
                Slug = a.Slug,
                Name = a.Name,
                InstagramProfileUrl = a.InstagramProfileUrl,
                SoundcloudProfileUrl = a.SoundcloudProfileUrl,
                SpotifyProfileUrl = a.SpotifyProfileUrl,
                SpotifyImageUrl = a.SpotifyImageUrl,
                Events = a.Events.Select(e => new EventSummaryDto()
                {
                    Slug = e.Slug,
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
            throw new NotFoundException(nameof(Artist), slug);
        }

        return artistDto;
    }

    public async Task<ArtistSummaryDto> Create(CreateArtistDto dto, CancellationToken ct)
    {
        var baseSlug = SlugHelper.Slugify(dto.Name, nameof(Artist));
        var artist = new Artist
        {
            Name = dto.Name,
            Slug = await FindFreeSlug(baseSlug, ct)
        };
        
        context.Artists.Add(artist);

        try
        {
            await context.SaveChangesAsync(ct);
            return new ArtistSummaryDto() { Id = artist.Id, Name = artist.Name, Slug = artist.Slug };
        }
        catch (DbUpdateException e)
        {
            logger.LogError(e, "An error occured while trying to create a new artist {name}", dto.Name);
            throw new DbException(e.Message);
        }
    }

    public async Task<ICollection<ArtistSummaryDto>> GetArtistByName(
        string name, CancellationToken ct)
    {
        var trimmed = name.Trim();
        if (trimmed.Length == 0)
            return [];

        var pattern = EscapeLike(trimmed);

        var artists = await context.Artists
            .Where(a => EF.Functions.ILike(a.Name, pattern))
            .OrderBy(a => a.Name)
            .ThenBy(a => a.Slug)
            .Take(50)
            .Select(a => new ArtistSummaryDto
            {
                Id = a.Id,
                Name = a.Name,
                Slug = a.Slug,
                InstagramProfileUrl = a.InstagramProfileUrl,
                SoundcloudProfileUrl = a.SoundcloudProfileUrl,
                SpotifyProfileUrl = a.SpotifyProfileUrl,
                SpotifyImageUrl = a.SpotifyImageUrl,
                Events = a.Events.Select(e => new EventSummaryDto
                {
                    Name = e.Name,
                    Slug = e.Slug,
                    StartDate = e.StartDate
                }).ToList(),
                Genres = a.Genres.Select(g => new GenreSummaryDto
                {
                    Id = g.Id,
                    Name = g.Name
                }).ToList()
            })
            .ToListAsync(ct);

        if (!artists.Any())
        {
            throw new NotFoundException(nameof(Artist), name);
        }
        return artists;
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private async Task<string> FindFreeSlug(string baseSlug, CancellationToken ct)
    {
        var taken = await context.Artists
            .Where(a => a.Slug == baseSlug || a.Slug.StartsWith(baseSlug + "-"))
            .Select(a => a.Slug)
            .ToListAsync(ct);

        if (!taken.Contains(baseSlug))
            return baseSlug;

        var n = 2;
        while (taken.Contains($"{baseSlug}-{n}")) n++;
        return $"{baseSlug}-{n}";
    }
}