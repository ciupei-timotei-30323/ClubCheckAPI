using ClubCheckAPI.DTO.Artist;

namespace ClubCheckAPI.IServices;

public interface IArtistService
{
    public Task<ArtistSummaryDto> GetArtistById(int id, CancellationToken ct);
    
    public Task<ArtistSummaryDto> Create(CreateArtistDto dto, CancellationToken ct);
}