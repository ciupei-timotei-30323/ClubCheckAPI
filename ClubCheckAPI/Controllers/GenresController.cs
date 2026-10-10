using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class GenresController(IGenreService service, ILogger<GenresController> logger) : ControllerBase
{

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GenreSummaryDto>> GetGenre([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Getting genre {id}", id);
        return Ok(await service.GetGenreById(id, ct));
        
    }

    [HttpPost]
    public async Task<ActionResult<GenreSummaryDto>> CreateGenre([FromBody] CreateGenreDto dto, CancellationToken ct)
    {
        logger.LogInformation("Creating genre {dto}", dto);
        var created = await service.CreateGenre(dto, ct);
        return CreatedAtAction(nameof(GetGenre), new {id = created.Id}, created);
    }
    
    
}