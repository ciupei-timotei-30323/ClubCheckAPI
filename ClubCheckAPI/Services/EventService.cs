using System.Linq.Expressions;
using ClubCheckAPI.DTO;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.Helpers;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class EventService(ILogger<EventService> logger, ClubCheckAPIContext context) : IEventService
{
    private static int _minimumEventDurationMinutes = 30;

    private static readonly Expression<Func<Event, PublicEventDto>> ToPublicDto = e => new PublicEventDto
    {
        Id = e.Id,
        Slug = e.Slug,
        Name = e.Name,
        StartDate = e.StartDate,
        Description = e.Description,
        Organizer = e.Organizer,
        AnnouncementUrl = e.AnnouncementUrl,
        TicketUrl = e.TicketUrl,
        PosterUrl = e.PosterUrl,
        Price = e.Price == null
            ? null
            : new PublicPriceDto { Value = e.Price.Value, Currency = (PublicCurrency?)e.Price.Currency },
        City = e.Venue.Address!.City,
        VenueName = e.Venue.Name,
        GenresName = e.Genres.Select(g => g.Name).ToList(),
        ArtistsSummary = e.Artists
            .Select(a => new PublicArtistDto { Name = a.Name, Slug = a.Slug })
            .ToList()
    };

    public async Task<MostActiveStatisticsDto> GetMostActive(MostActiveQueryDto query, CancellationToken ct)
    {
        var genreRows = await context.Events
            .AsNoTracking()
            .SelectMany(e => e.Genres)
            .GroupBy(g => new { g.Id, g.Name })
            .Select(g => new { g.Key.Id, g.Key.Name, EventCount = g.Count() })
            .OrderByDescending(g => g.EventCount)
            .ThenBy(g => g.Name)
            .Take(query.TopGenresLimit)
            .ToListAsync(ct);

        var artistRows = await context.Events
            .AsNoTracking()
            .SelectMany(e => e.Artists)
            .GroupBy(a => new { a.Id, a.Name })
            .Select(g => new { g.Key.Id, g.Key.Name, EventCount = g.Count() })
            .OrderByDescending(g => g.EventCount)
            .ThenBy(g => g.Name)
            .Take(query.TopArtistsLimit)
            .ToListAsync(ct);

        var venueRows = await context.Events
            .AsNoTracking()
            .GroupBy(e => new { e.VenueId, e.Venue.Name })
            .Select(g => new { g.Key.VenueId, g.Key.Name, EventCount = g.Count() })
            .OrderByDescending(g => g.EventCount)
            .ThenBy(g => g.Name)
            .Take(query.TopVenuesLimit)
            .ToListAsync(ct);

        var cityRows = await context.Events
            .AsNoTracking()
            .Where(e => e.Venue.Address!.City != null &&
                        e.Venue.Address.City != "" &&
                        e.Venue.Address.City != "-")
            .GroupBy(e => e.Venue.Address!.City)
            .Select(g => new { Name = g.Key, EventCount = g.Count() })
            .OrderByDescending(g => g.EventCount)
            .ThenBy(g => g.Name)
            .ToListAsync(ct);

        var limitedCities = query.TopCitiesLimit is { } cityLimit
            ? cityRows.Take(cityLimit)
            : cityRows;

        var rankedCities = limitedCities
            .Select((city, index) => new MostActiveItemDto
            {
                Id = (index + 1).ToString(),
                Name = city.Name,
                EventCount = city.EventCount
            })
            .ToList();

        var totalItems = rankedCities.Count;
        var totalPages = totalItems == 0
            ? 0
            : (int)Math.Ceiling(totalItems / (double)query.PageSize);
        var skip = (long)(query.Page - 1) * query.PageSize;
        var pagedCities = skip >= totalItems
            ? []
            : rankedCities.Skip((int)skip).Take(query.PageSize).ToList();

        return new MostActiveStatisticsDto
        {
            TopCities = pagedCities,
            TopGenres = genreRows.Select(g => ToMostActiveItem(g.Id, g.Name, g.EventCount)).ToList(),
            TopArtists = artistRows.Select(a => ToMostActiveItem(a.Id, a.Name, a.EventCount)).ToList(),
            TopVenues = venueRows.Select(v => ToMostActiveItem(v.VenueId, v.Name, v.EventCount)).ToList(),
            Pagination = new PaginationDto
            {
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            }
        };
    }

    public async Task<PagedResult<PublicEventDto>> GetEvents(QueryEventsDto q, CancellationToken ct)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        IQueryable<Event> query = context.Events.Where(e => e.IsActive);

        if (q.StartDate is { } from)
        {
            var rangeStart = from.UtcDateTime;
            query = query.Where(e => (e.EndDate ?? e.StartDate) >= rangeStart);
        }

        if (q.EndDate is { } to)
        {
            var rangeEnd = to.UtcDateTime;
            query = query.Where(e => e.StartDate <= rangeEnd);
        }

        if (!string.IsNullOrWhiteSpace(q.Name))
            query = query.Where(e => EF.Functions.ILike(e.Name, $"%{q.Name}%"));

        if (!string.IsNullOrWhiteSpace(q.Organizer))
            query = query.Where(e => e.Organizer != null &&
                                     EF.Functions.ILike(e.Organizer, $"%{q.Organizer}%"));

        if (!string.IsNullOrWhiteSpace(q.City))
            query = query.Where(e => e.Venue.Address != null &&
                                     EF.Functions.ILike(e.Venue.Address.City, $"%{q.City}%"));

        if (!string.IsNullOrWhiteSpace(q.VenueName))
            query = query.Where(e => EF.Functions.ILike(e.Venue.Name, $"%{q.VenueName}%"));

        if (q.Price is { } maxPrice)
        {
            query = query.Where(e => 
                e.Price != null &&
                e.Price.Currency == maxPrice.Currency && 
                e.Price.Value <= maxPrice.Value);
        }

        if (q.GenresNames is { Count: > 0 })
            query = query.Where(e => e.Genres.Any(g => q.GenresNames.Contains(g.Name)));

        if (!string.IsNullOrWhiteSpace(q.Artist))
            query = query.Where(e => e.Artists.Any(a => EF.Functions.ILike(a.Name, $"%{q.Artist}%")));

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var searchPattern = $"%{q.Search}%";
            query = query.Where(e =>
                EF.Functions.ILike(e.Name, searchPattern) ||
                EF.Functions.ILike(e.Venue.Name, searchPattern) ||
                e.Artists.Any(a => EF.Functions.ILike(a.Name, searchPattern)));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderBy(e => e.StartDate)
            .ThenBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToPublicDto)
            .ToListAsync(ct);

        return new PagedResult<PublicEventDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<EventFilterOptionsDto> GetFilterOptions(CancellationToken ct)
    {
        var activeEvents = context.Events.AsNoTracking().Where(e => e.IsActive);

        var cities = await activeEvents
            .Where(e => e.Venue.Address!.City != null &&
                        e.Venue.Address.City != "" &&
                        e.Venue.Address.City != "-")
            .GroupBy(e => e.Venue.Address!.City)
            .Select(g => new EventFilterOptionDto { Name = g.Key, Count = g.Count() })
            .OrderByDescending(option => option.Count)
            .ThenBy(option => option.Name)
            .ToListAsync(ct);

        var venues = await activeEvents
            .GroupBy(e => new { e.Venue.Name, City = e.Venue.Address!.City })
            .Select(g => new VenueFilterOptionDto
            {
                Name = g.Key.Name,
                City = g.Key.City,
                Count = g.Count()
            })
            .OrderByDescending(option => option.Count)
            .ThenBy(option => option.Name)
            .ThenBy(option => option.City)
            .ToListAsync(ct);

        var genres = await activeEvents
            .SelectMany(e => e.Genres)
            .GroupBy(g => new { g.Id, g.Name })
            .Select(g => new EventFilterOptionDto { Name = g.Key.Name, Count = g.Count() })
            .OrderByDescending(option => option.Count)
            .ThenBy(option => option.Name)
            .ToListAsync(ct);

        return new EventFilterOptionsDto
        {
            Cities = cities,
            Venues = venues,
            Genres = genres
        };
    }

    public async Task<PublicEventDto> GetEventBySlug(string slug, CancellationToken ct)
    {
        var existingEvent = await context.Events.Where(e => e.Slug == slug).Select(ToPublicDto)
            .FirstOrDefaultAsync(cancellationToken: ct);

        if (existingEvent == null)
            throw new NotFoundException(nameof(Event), slug);

        return existingEvent;
    }

    public async Task<PublicEventDto> CreateEvent(CreateEventDto eventDto, CancellationToken ct)
    {
        // Checks for the Dates to be valid (No past event can be added)
        CheckDateValidity(eventDto);

        // Does the venue mentioned in the event exist?
        var venue = await ValidateVenueExistence(logger, context, eventDto, ct);

        // Do the genres mentioned in the event exist?
        var genres = await ValidateGenresExistence(logger, context, eventDto, ct);

        // Do the artists mentioned in the event exist
        var artists = await ValidateArtistsExistence(context, eventDto, ct, logger);

        // Is this a duplicate event?
        var existingEvent = await IsEventDuplicate(context, eventDto, ct);

        if (existingEvent != null)
        {
            return existingEvent;
        }
        
        var created = await context.Events.AddAsync(new Event()
        {
            Name = eventDto.Name,
            Slug = await FindFreeSlug(SlugHelper.Slugify(eventDto.Name, nameof(Event)), ct),
            StartDate = eventDto.StartDate,
            IsActive = eventDto.IsActive,
            EndDate = eventDto.EndDate,
            Description = eventDto.Description,
            Organizer = eventDto.Organizer,
            Price = eventDto.Price,
            TicketUrl = eventDto.TicketUrl,
            PosterUrl = eventDto.PosterUrl,
            AnnouncementUrl = eventDto.AnnouncementUrl,
            VenueId = eventDto.VenueId,
            Venue = venue,
            Genres = genres,
            Artists = artists
        }, ct);

        try
        {
            await context.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e)
        {
            logger.LogError(e, "An error occured while trying to create a new event {Name}", eventDto.Name);
            throw new DbException(e.InnerException?.ToString() ?? "");
        }

        return await context.Events
            .Where(e => e.Id == created.Entity.Id)
            .Select(ToPublicDto)
            .SingleAsync(ct);
    }

    private void CheckDateValidity(CreateEventDto eventDto)
    {
        if ((eventDto.StartDate - DateTime.UtcNow).TotalMinutes < 0)
        {
            logger.LogError("An error occured while trying to create a new event {Name}\nDate {Date} is in the past",
                eventDto.Name, eventDto.StartDate);
            throw new ArgumentException(nameof(DateTime), $"{eventDto.StartDate} is in the past.");
        }

        if (eventDto.EndDate != null)
        {
            // Checks for the End Date to be after the start date
            if ((eventDto.EndDate.Value - eventDto.StartDate).TotalMinutes <= 0)
            {
                logger.LogError(
                    "An error occured while trying to create a new event {Name}\nStart date {Date} is before the end date {EndDate}",
                    eventDto.Name, eventDto.StartDate, eventDto.EndDate);
                throw new ArgumentException(nameof(DateTime), $"{eventDto.EndDate} is invalid.");
            }

            if ((eventDto.EndDate.Value - eventDto.StartDate).TotalMinutes <= _minimumEventDurationMinutes)
            {
                logger.LogError(
                    "An error occured while trying to create a new event {Name}\nTime interval of event is too small [{Date}, {EndDate}]\n Minimum is {Interval} minutes",
                    eventDto.Name, eventDto.StartDate, eventDto.EndDate, _minimumEventDurationMinutes);
                throw new ArgumentException(nameof(DateTime),
                    $"{eventDto.EndDate} is too close to start date {eventDto.StartDate}. Minimum is {_minimumEventDurationMinutes} minutes");
            }
        }
    }

    private static async Task<Venue?> ValidateVenueExistence(ILogger<EventService> logger, ClubCheckAPIContext context,
        CreateEventDto eventDto,
        CancellationToken ct)
    {
        var venue = await context.Venues.FirstOrDefaultAsync(v => v.Id == eventDto.VenueId, ct);

        if (venue is null)
        {
            logger.LogWarning("Venue [{VenueId}] doesn't exist when creating {EventDto}", eventDto.VenueId, eventDto);
            throw new ArgumentException(nameof(Venue), $"{eventDto.VenueId} does not exist");
        }

        return venue;
    }

    // Helper private methods

    private static MostActiveItemDto ToMostActiveItem(int id, string name, int eventCount) => new()
    {
        Id = id.ToString(),
        Name = name,
        EventCount = eventCount
    };

    private static async Task<List<Genre>> ValidateGenresExistence(ILogger<EventService> logger,
        ClubCheckAPIContext context, CreateEventDto eventDto,
        CancellationToken ct)
    {
        var requestedGenreIds = eventDto.GenresId.Distinct().ToList();
        var genres = await context.Genre.Where(g => requestedGenreIds.Contains(g.Id)).ToListAsync(ct);

        if (genres.Count != requestedGenreIds.Count)
        {
            var missing = requestedGenreIds.Except(genres.Select(g => g.Id));
            logger.LogWarning("Genres [{Missing}] doesn't exist when creating {EventDto}", missing, eventDto);
            throw new ArgumentException($"Genres not found: {string.Join(", ", missing)}", nameof(eventDto));
        }

        return genres;
    }

    private static async Task<List<Artist>> ValidateArtistsExistence(ClubCheckAPIContext context,
        CreateEventDto eventDto,
        CancellationToken ct, ILogger<EventService> logger)
    {
        var requestedArtistIds = eventDto.ArtistsId.Distinct().ToList();
        var artists = await context.Artists.Where(a => requestedArtistIds.Contains(a.Id)).ToListAsync(ct);
        if (artists.Count != requestedArtistIds.Count)
        {
            var missing = requestedArtistIds.Except(artists.Select(a => a.Id));
            logger.LogWarning("Artists [{Missing}] doesn't exist when creating {EventDto}", missing, eventDto);
            throw new ArgumentException($"Artists not found: {string.Join(", ", missing)}", nameof(eventDto));
        }

        return artists;
    }

    private async Task<PublicEventDto?> IsEventDuplicate(ClubCheckAPIContext dbContext, CreateEventDto eventDto,
        CancellationToken ct)
    {
        var existingEvent = await dbContext.Events.Where(e =>
            e.VenueId == eventDto.VenueId && e.StartDate.Date == eventDto.StartDate.Date &&
            e.StartDate.TimeOfDay.Hours == eventDto.StartDate.TimeOfDay.Hours &&
            e.StartDate.TimeOfDay.Minutes == eventDto.StartDate.TimeOfDay.Minutes).Select(ToPublicDto).FirstOrDefaultAsync(ct);

        return existingEvent;
    }

    private async Task<string> FindFreeSlug(string baseSlug, CancellationToken ct)
    {
        var taken = await context.Events
            .Where(a => a.Slug == baseSlug || a.Slug.StartsWith(baseSlug + "-"))
            .Select(a => a.Slug)
            .ToListAsync(ct);

        if (!taken.Contains(baseSlug))
            return baseSlug;

        var n = 2;
        while (taken.Contains($"{baseSlug}-{n}")) n++;
        return $"{baseSlug}-{n}";
    }


    public Task DeleteEvents(DeleteEventsQuery query, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicEventDto> UpdateEvent(UpdateEventDto eventDto, int id, CancellationToken ct)
    {
        throw new NotImplementedException();
    }
}