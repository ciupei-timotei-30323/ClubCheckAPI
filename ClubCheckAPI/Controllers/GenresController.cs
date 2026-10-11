using ClubCheckAPI.DTO.Genre;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class GenresController(IGenreService service, ILogger<GenresController> logger) : ControllerBase
{

    // GET 
    /// <summary>
    /// Gets a Genre based on its name.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("{name}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GenreSummaryDto>> GetGenre([FromRoute] string name, CancellationToken ct)
    {
        logger.LogInformation("Getting genre {name}", name);
        return Ok(await service.GetGenreByName(name, ct));
        
    }
    
    
    /// <summary>
    /// Creates a Genre.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult<GenreSummaryDto>> CreateGenre([FromBody] CreateGenreDto dto, CancellationToken ct)
    {
        logger.LogInformation("Creating genre {dto}", dto);
        var created = await service.CreateGenre(dto, ct);
        return CreatedAtAction(nameof(GetGenre), new {name = created.Name}, created);
    }
    
    
}