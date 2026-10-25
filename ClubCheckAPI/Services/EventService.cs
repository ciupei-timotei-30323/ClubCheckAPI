using System.Linq.Expressions;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class EventService(ILogger<EventService> logger, ClubCheckAPIContext context) : IEventService
{
    private static readonly Expression<Func<Event, PublicEventDto>> ToPublicDto = e => new PublicEventDto
    {
        Slug = e.Slug,
        Name = e.Name,
        StartDate = e.StartDate,
        Description = e.Description,
        AnnouncementUrl = e.AnnouncementUrl,
        TicketUrl = e.TicketUrl,
        Price = e.Price,
        VenueName = e.Venue.Name,
        GenresName = e.Genres.Select(g => g.Name).ToList(),
        ArtistsSummary = e.Artists
            .Select(a => new PublicArtistDto { Name = a.Name, Slug = a.Slug })
            .ToList()
    };

    public async Task<ICollection<PublicEventDto>> GetEvents(QueryEventsDto q, CancellationToken ct)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        IQueryable<Event> query = context.Events.Where(e => e.IsActive);

        if (q.StartDate is { } from)
            query = query.Where(e => e.StartDate >= from);

        if (q.EndDate is { } to)
            query = query.Where(e => e.EndDate == null || e.EndDate <= to);

        if (!string.IsNullOrWhiteSpace(q.Name))
            query = query.Where(e => EF.Functions.ILike(e.Name, $"%{q.Name}%"));

        if (!string.IsNullOrWhiteSpace(q.City))
            query = query.Where(e => e.Venue.Address != null &&
                                     EF.Functions.ILike(e.Venue.Address.City, $"%{q.City}%"));

        if (!string.IsNullOrWhiteSpace(q.VenueName))
            query = query.Where(e => EF.Functions.ILike(e.Venue.Name, $"%{q.VenueName}%"));

        if (q.Price is { } maxPrice)
            query = query.Where(e => e.Price <= maxPrice);

        if (q.GenresNames is { Count: > 0 })
            query = query.Where(e => e.Genres.Any(g => q.GenresNames.Contains(g.Name)));

        if (!string.IsNullOrWhiteSpace(q.Artist))
            query = query.Where(e => e.Artists.Any(a => EF.Functions.ILike(a.Name, $"%{q.Artist}%")));

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(e => e.StartDate)
            .ThenBy(e => e.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToPublicDto)
            .ToListAsync(ct);

        return items;
    }

    public Task<PublicEventDto> GetEventBySlug(string slug, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicEventDto> CreateEvent(CreateEventDto eventDto, CancellationToken ct)
    {
        throw new NotImplementedException();
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