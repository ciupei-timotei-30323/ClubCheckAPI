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
        var address = venueDto.Address;
        var zipCode = NormalizeAddressPart(address?.ZipCode);
        var city = NormalizeAddressPart(address?.City);
        var number = NormalizeAddressPart(address?.Number);

        // Missing address fields are not identity. Comparing nullable columns directly
        // makes NULL == NULL match every venue with an empty field, which groups
        // unrelated events under the first venue created.
        var existingVenue = await context.Venues.FirstOrDefaultAsync(
            v => v.Name == venueDto.Name ||
                 (zipCode != null && v.Address!.ZipCode == zipCode) ||
                 (city != null && number != null &&
                  v.Address!.City == city && v.Address.Number == number)
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

    private static string? NormalizeAddressPart(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim() == "-")
        {
            return null;
        }

        return value.Trim();
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
            Id = e.Id,
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
            Price = e.Price == null
                ? null
                : new PublicPriceDto { Value = e.Price.Value, Currency = (PublicCurrency?)e.Price.Currency },
            Slug = e.Slug,
            StartDate = e.StartDate,
            TicketUrl = e.TicketUrl,
            PosterUrl = e.PosterUrl,
            City = e.Venue.Address?.City,
            VenueName = e.Venue.Name
        }).ToList()
    };
}