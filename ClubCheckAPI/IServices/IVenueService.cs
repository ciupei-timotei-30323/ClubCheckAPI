namespace ClubCheckAPI.IServices;

public interface IVenueService
{
    public Task<ICollection<PublicVenueDto>> GetVenues(QueryVenuesDto queryDto, CancellationToken ct);
    
    public Task<PublicVenueDto> GetVenueById(int id, CancellationToken ct);
    
    public Task<PublicVenueDto> CreateVenue(CreateVenueDto  venueDto, CancellationToken ct );
    
    public Task<PublicVenueDto> UpdateVenue(int id, UpdateVenueDto venueDto, CancellationToken ct);
    
    public Task DeleteVenue(int id, CancellationToken ct);
    
}