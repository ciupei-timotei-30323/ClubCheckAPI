using ClubCheckAPI.DTO.Artist;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;
//TODO Change route for private endpoints to something like /private/..
[ApiController]
[Route("[controller]")]
public class ArtistsController(IArtistService service, ILogger<ArtistsController> logger) : ControllerBase
{
    /// <summary>
    /// fetches detailed information about an artist based on its name. <remarks>This endpoint is <c>Public</c></remarks> 
    /// </summary>
    /// <returns></returns>
    [HttpGet("{slug}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicArtistDetailedDto>> GetBySlug([FromRoute] string slug, CancellationToken ct)
    {
        logger.LogInformation("Getting artist with id {name}", slug);
        return Ok(await service.GetArtistBySlug(slug, ct));
    }

    /// <summary>
    /// Returns the Artist Summary object. Usefull for when trying to see if the artist already exists in the DB or not
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("private/{name}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ArtistSummaryDto>> GetByName([FromRoute] string name, CancellationToken ct)
    {
        logger.LogInformation("Getting artist with name {name}", name);
        return Ok(await service.GetArtistByName(name, ct));
    }
    
    /// <summary>
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<ArtistSummaryDto>> CreateArtist([FromBody] CreateArtistDto dto, CancellationToken ct)
    {
        logger.LogInformation("Creating artist {dto}", dto);
        var created = await service.Create(dto, ct);
        return CreatedAtAction(nameof(GetBySlug), new { slug = created.Slug }, created);
    }
}