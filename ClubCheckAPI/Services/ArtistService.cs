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
        var existing =
            await context.Artists.FirstOrDefaultAsync(a => a.Name == dto.Name, ct);


        if (existing is not null)
        {
            if (AreSlugsTheSame(existing.Slug, dto.Slug))
            {
                return ToSummaryDto(existing);
            }
        }

        bool doesSlugContainOnlyName = dto.Slug.EndsWith(dto.Name) || dto.Slug == "";
        var created = context.Artists.Add(new Artist()
        {
            Name = dto.Name,
            Slug = doesSlugContainOnlyName
                ? await FindFreeSlug(SlugHelper.Slugify(dto.Name, nameof(Artist)), ct)
                : await FindFreeSlug(dto.Slug, ct)
        });


        try
        {
            await context.SaveChangesAsync(ct);
            return ToSummaryDto(created.Entity);
        }
        catch (DbUpdateException e)
        {
            logger.LogError(e, "An error occured while trying to create a new artist {name}", dto.Name);
            throw new DbException(e.Message);
        }
    }


    /// <summary>
    /// Checks if localSlug is included in the externalSlug
    /// </summary>
    /// <param name="localSlug">Slug from the DB</param>
    /// <param name="externalSlug">Slug from the DTO</param>
    /// <returns>True if localSlug is included in the externalSlug</returns>
    private static bool AreSlugsTheSame(string localSlug, string externalSlug)
    {
        // Checks is one of the slugs is empty and returns false
        if (string.IsNullOrEmpty(localSlug) || string.IsNullOrEmpty(externalSlug))
            return false;

        // Get the words decomposed int o a list
        List<string> localSlugDecomposed = new List<string>(localSlug.Split(EscapeChars()));
        List<string> externalSlugDecomposed = new List<string>(externalSlug.Split(EscapeChars()));

        // Convert both lists to lower invariant
        localSlugDecomposed = localSlugDecomposed.Select(l => l.ToLowerInvariant()).ToList();
        externalSlugDecomposed = externalSlugDecomposed.Select(l => l.ToLowerInvariant()).ToList();

        foreach (var dbProp in localSlugDecomposed)
        {
            // If the dbProp is not contained in the externalSlugDecomposed list, return false
            if (!externalSlugDecomposed.Contains(dbProp))
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Holds chars that can be used to separate different words in a Slug
    /// </summary>
    /// <returns></returns>
    private static ReadOnlySpan<char> EscapeChars() =>
        new ReadOnlySpan<char>(['-', '.', '_', '|', ',', '+', ';', '&']);

    private async Task<string> FindFreeSlug(string baseSlug, CancellationToken ct)
    {
        var taken = await context.Artists
            .Where(a => a.Slug == baseSlug || a.Slug.StartsWith(baseSlug + "|"))
            .Select(a => a.Slug)
            .ToListAsync(ct);

        if (!taken.Contains(baseSlug))
            return baseSlug;

        var n = 2;
        while (taken.Contains($"{baseSlug}-{n}")) n++;
        return $"{baseSlug}-{n}";
    }

    private static ArtistSummaryDto ToSummaryDto(Artist artist) => new()
    {
        Id = artist.Id,
        Name = artist.Name,
        Slug = artist.Slug
    };
}