using ClubCheckAPI.DTO.Artist;

namespace ClubCheckAPI.IServices;

public interface IArtistService
{
    public Task<PublicArtistDetailedDto> GetArtistByName(string name, CancellationToken ct);
    
    public Task<ArtistSummaryDto> Create(CreateArtistDto dto, CancellationToken ct);
}