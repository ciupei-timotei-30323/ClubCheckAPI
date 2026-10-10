using ClubCheckAPI.DTO.Genre;

namespace ClubCheckAPI.IServices;

public interface IGenreService
{
    public Task<GenreSummaryDto>  GetGenreById(int id, CancellationToken ct);
    
    public Task<GenreSummaryDto> CreateGenre(CreateGenreDto dto, CancellationToken ct);
}