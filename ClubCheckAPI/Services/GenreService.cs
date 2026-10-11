using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.Exceptions;
using ClubCheckAPI.IServices;
using ClubCheckAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Services;

public class GenreService(ClubCheckAPIContext context, ILogger<GenreService> logger) : IGenreService
{
    

    public async Task<GenreSummaryDto> GetGenreByName(string name, CancellationToken ct)
    {
        var result = await context.Genre
            .FirstOrDefaultAsync(g => g.Name == name, ct);

        if (result is null)
        {
            throw new NotFoundException(nameof(Genre), name);
        }
        
        return ToSummaryDto(result);
    }

    public async Task<GenreSummaryDto> CreateGenre(CreateGenreDto dto, CancellationToken ct)
    {
        // Check if Genre already exist 
        var existing = await  context.Genre.FirstOrDefaultAsync(g => g.Name == dto.Name, ct);
        
        // If exisiting, return it
        if (existing is not null)
        {
            return ToSummaryDto(existing);
        }
        
        // Else create a new one
        var created = context.Genre.Add(new Genre(){Name = dto.Name});
        try
        {
            await context.SaveChangesAsync(ct);
            return ToSummaryDto(created.Entity);
        }
        catch (DbUpdateConcurrencyException e)
        {
            logger.LogError(e, "A concurrency exception was raised when trying to create genre {name}",  dto.Name);
            throw new DbException(e.Message);
        }
        catch (DbUpdateException e)
        {
            logger.LogError(e, "An exception occurred while trying to save the genre {genre}",  dto.Name);
            throw new DbException(e.Message);
        }
        
    }
    
    private static GenreSummaryDto ToSummaryDto(Genre genre) => new()
    {
        Id = genre.Id,
        Name = genre.Name
    };
}