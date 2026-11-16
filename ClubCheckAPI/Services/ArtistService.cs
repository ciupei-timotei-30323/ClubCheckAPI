using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.Helpers;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ClubCheckAPI.Services;

public class ArtistService(ClubCheckAPIContext context, ILogger<ArtistService> logger) : IArtistService
{
    private static readonly Regex GeneratedSlugSuffix = new(@"-\d+$", RegexOptions.Compiled);

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
        var baseSlug = GetBaseSlug(dto);
        var lockKey = GetArtistIdentityLockKey(dto.Name, baseSlug);

        await context.Database.OpenConnectionAsync(ct);
        try
        {
            // Serialize create attempts for the same logical artist across API instances.
            // The slug unique index still protects slug allocation between different artists.
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_lock({lockKey})", ct);

            return await CreateLocked(dto, baseSlug, ct);
        }
        finally
        {
            try
            {
                await context.Database.ExecuteSqlInterpolatedAsync(
                    $"SELECT pg_advisory_unlock({lockKey})", CancellationToken.None);
            }
            catch (Exception e)
            {
                // Closing the connection releases any session-level advisory lock left behind.
                logger.LogWarning(e, "Could not release artist creation lock for {Name}", dto.Name);
            }
            finally
            {
                await context.Database.CloseConnectionAsync();
            }
        }
    }

    private async Task<ArtistSummaryDto> CreateLocked(CreateArtistDto dto, string baseSlug, CancellationToken ct)
    {
        var existing = await FindMatchingArtist(dto.Name, dto.Slug, ct);
        if (existing is not null)
        {
            return ToSummaryDto(existing);
        }

        const int maxSlugAttempts = 10;

        for (var attempt = 1; attempt <= maxSlugAttempts; attempt++)
        {
            var artist = new Artist
            {
                Name = dto.Name,
                Slug = await FindFreeSlug(baseSlug, ct)
            };

            context.Artists.Add(artist);

            try
            {
                await context.SaveChangesAsync(ct);
                return ToSummaryDto(artist);
            }
            catch (DbUpdateException e) when (IsArtistSlugConflict(e))
            {
                context.Entry(artist).State = EntityState.Detached;

                // Another request may have inserted this exact artist after our initial lookup.
                // The unique index is the atomic arbiter, so return the winner instead of
                // creating a duplicate with an incremented slug.
                existing = await FindMatchingArtist(dto.Name, dto.Slug, ct);
                if (existing is not null)
                {
                    return ToSummaryDto(existing);
                }

                logger.LogWarning(e,
                    "Artist slug {Slug} was taken while creating {Name}. Retrying with a new slug (attempt {Attempt}/{MaxAttempts})",
                    artist.Slug, dto.Name, attempt, maxSlugAttempts);
            }
            catch (DbUpdateException e)
            {
                logger.LogError(e, "An error occured while trying to create a new artist {name}", dto.Name);
                throw new DbException(e.Message);
            }
        }

        logger.LogError("Could not create a unique slug for artist {name}", dto.Name);
        throw new DbException($"Could not create a unique slug for artist {dto.Name}");
    }

    private static string GetBaseSlug(CreateArtistDto dto)
    {
        bool doesSlugContainOnlyName = dto.Slug.EndsWith(dto.Name) || dto.Slug == "";
        return doesSlugContainOnlyName
            ? SlugHelper.Slugify(dto.Name, nameof(Artist))
            : dto.Slug;
    }

    private static long GetArtistIdentityLockKey(string name, string slug)
    {
        var canonicalSlug = GeneratedSlugSuffix.Replace(slug, string.Empty);
        var identity = $"{name.Trim().ToLowerInvariant()}\n{canonicalSlug.ToLowerInvariant()}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(identity));
        return BinaryPrimitives.ReadInt64LittleEndian(hash);
    }

    private async Task<Artist?> FindMatchingArtist(string name, string slug, CancellationToken ct)
    {
        var normalizedName = name.Trim().ToLowerInvariant();
        var candidates = await context.Artists
            .AsNoTracking()
            .Where(a => a.Name.Trim().ToLower() == normalizedName)
            .OrderBy(a => a.Id)
            .ToListAsync(ct);

        return candidates.FirstOrDefault(a => AreSlugsTheSame(a.Slug, slug));
    }

    private static bool IsArtistSlugConflict(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "IX_Artists_Slug"
        };


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

        // Generated collision suffixes ("-2", "-3", ...) are not part of the artist's identity.
        localSlug = GeneratedSlugSuffix.Replace(localSlug, string.Empty);
        externalSlug = GeneratedSlugSuffix.Replace(externalSlug, string.Empty);

        // Get the words decomposed int o a list
        List<string> localSlugDecomposed = new List<string>(localSlug.Split(EscapeChars()));
        List<string> externalSlugDecomposed = new List<string>(externalSlug.Split(EscapeChars()));

        // Convert both lists to lower invariant
        localSlugDecomposed = localSlugDecomposed.Select(l => l.ToLowerInvariant()).ToList();
        externalSlugDecomposed = externalSlugDecomposed.Select(l => l.ToLowerInvariant()).ToList();

        foreach (var dbProp in externalSlugDecomposed)
        {
            // If the dbProp is not contained in the externalSlugDecomposed list, return false
            if (!localSlugDecomposed.Contains(dbProp))
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
            .Where(a => a.Slug == baseSlug ||
                        a.Slug.StartsWith(baseSlug + "-") ||
                        a.Slug.StartsWith(baseSlug + "|"))
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