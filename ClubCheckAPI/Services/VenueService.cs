using ClubCheckAPI.DomainClasses;
using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.DTO.Venue;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class VenueService(ILogger<VenueService> logger, ClubCheckAPIContext context) : IVenueService
{
    public async Task<PublicVenueDetailedDto> GetVenueByName(string name, CancellationToken ct)
    {
        var result = await context.Venues.FirstOrDefaultAsync(v => v.Name == name, ct);
        return result is null ? throw new NotFoundException(nameof(Venue), name) : ToDetailedDto(result);
    }

    public async Task<PublicVenueDto> CreateVenue(CreateVenueDto venueDto, CancellationToken ct)
    {
        var existingVenue = await context.Venues.FirstOrDefaultAsync(
            v => v.Name == venueDto.Name || (venueDto.Address != null && ((v.Address.City == venueDto.Address.City &&
                                                                           v.Address.Number ==
                                                                           venueDto.Address.Number &&
                                                                           v.Address.Number ==
                                                                           venueDto.Address.Number) ||
                                                                          v.Address.ZipCode ==
                                                                          venueDto.Address.ZipCode))
            , ct);

        if (existingVenue is not null)
        {
            return ToDto(existingVenue);
        }

        var created = context.Venues.Add(new Venue()
        {
            Name = venueDto.Name,
            Address = new Address(venueDto.Address?.ZipCode,
                venueDto.Address?.Number,
                venueDto.Address?.Street,
                venueDto.Address?.City is null ? "-" : venueDto.Address.City,
                venueDto.Address?.County,
                venueDto.Address?.Country,
                venueDto.Address?.GoogleMapsUrl),
        });

        try
        {
            await context.SaveChangesAsync(ct);
            return ToDto(created.Entity);
        }
        catch (DbUpdateException e)
        {
            logger.LogError(e, "An error occured while trying to create a new venue {name}", venueDto.Name);
            throw new DbException(e.Message);
        }

        // throw new NotImplementedException();
    }

    public Task<PublicVenueDto> UpdateVenue(int id, UpdateVenueDto venueDto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public async Task DeleteVenue(int id, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    private static PublicVenueDto ToDto(Venue v) => new PublicVenueDto()
    {
        Name = v.Name,
        City = v.Address?.City,
        Id = v.Id
    };

    private static PublicVenueDetailedDto ToDetailedDto(Venue v) => new PublicVenueDetailedDto()
    {
        Name = v.Name,
        Address = v.Address,
        Id = v.Id,
        Events = v.Events.Select(e => new PublicEventDto()
        {
            AnnouncementUrl = e.AnnouncementUrl,
            ArtistsSummary = e.Artists.Select(a => new PublicArtistDto()
            {
                Name = a.Name,
                Slug = a.Slug
            }).ToList(),
            Description = e.Description,
            EndDate = e.EndDate,
            GenresName = e.Genres.Select(g => g.Name).ToList(),
            Name = e.Name,
            Price = e.Price,
            Slug = e.Slug,
            StartDate = e.StartDate,
            TicketUrl = e.TicketUrl,
            VenueName = e.Venue.Name
        }).ToList()
    };
}