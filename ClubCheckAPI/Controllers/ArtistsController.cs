using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class ArtistsController(IArtistService service, ILogger<ArtistsController> logger) : ControllerBase
{
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ArtistSummaryDto>> Get([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Getting artist with id {id}", id);
        return Ok(await service.GetArtistById(id, ct));
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<ArtistSummaryDto>> CreateArtist([FromBody] CreateArtistDto dto, CancellationToken ct)
    {
        logger.LogInformation("Creating artist {dto}", dto);
        var created = await service.Create(dto, ct);
        return CreatedAtAction(nameof(Get), new {id = created.Id}, created);
    }
}