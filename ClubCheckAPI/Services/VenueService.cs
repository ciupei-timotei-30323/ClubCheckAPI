using ClubCheckAPI.DTO.Venue;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class VenueService(ILogger<VenueService> logger, ClubCheckAPIContext context) : IVenueService
{
    public Task<PublicVenueDetailedDto> GetVenueByName(string name, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicVenueDto> CreateVenue(CreateVenueDto venueDto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicVenueDto> UpdateVenue(int id, UpdateVenueDto venueDto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public async Task DeleteVenue(int id, CancellationToken ct)
    {
        var rowsToBeDeleted = context.Venues.Where(v => v.Id == id).Select()
    }
}