using ClubCheckAPI.DTO.Artist;

namespace ClubCheckAPI.IServices;

public interface IArtistService
{
    public Task<PublicArtistDetailedDto> GetArtistBySlug(string slug, CancellationToken ct);
    
    public Task<ArtistSummaryDto> Create(CreateArtistDto dto, CancellationToken ct);
    
    public Task<ICollection<ArtistSummaryDto>> GetArtistByName(string name, CancellationToken ct);
}