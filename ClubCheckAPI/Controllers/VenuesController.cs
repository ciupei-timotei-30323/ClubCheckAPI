using ClubCheckAPI.DTO.Venue;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class VenuesController(IVenueService service, ILogger<VenuesController> logger) : ControllerBase
{
    // [HttpGet]
    // [ProducesResponseType(StatusCodes.Status404NotFound)]
    // public async Task<ActionResult<IEnumerable<PublicVenueDto>>> GetVenues([FromQuery] QueryVenuesDto query,
    //     CancellationToken ct)
    // {
    //     logger.LogInformation("Getting venues {query}", query);
    //     return Ok(await service.GetVenues(query, ct));
    // }

    /// <summary>
    /// Gets a Venue based on its name.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Public</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("{name}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicVenueDetailedDto>> GetVenueById([FromRoute] string name, CancellationToken ct)
    {
        logger.LogInformation("Getting venue {name}", name);
        return Ok(await service.GetVenueByName(name, ct));
    }

    
    /// <summary>
    /// Creates a Venue.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult<PublicVenueDto>> CreateVenue([FromBody] CreateVenueDto venueDto,
        CancellationToken ct)
    {
        logger.LogInformation("Creating venue {venue}", venueDto);
        var created = await service.CreateVenue(venueDto, ct);
        return CreatedAtAction(nameof(GetVenueById), new { name = created.Name }, created);
    }

    
    /// <summary>
    /// Updates a Venue based on its ID.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicVenueDto>> UpdateVenue([FromRoute] int id, [FromBody] UpdateVenueDto venueDto,
        CancellationToken ct)
    {
        logger.LogInformation("Updating venue {id} with {venueDto}", id,  venueDto);
        return await service.UpdateVenue(id, venueDto, ct);
    }
    
    
    /// <summary>
    /// Deletes a Venue based on its ID.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Non-Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteVenue([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Deleting venue {id}", id);
        await service.DeleteVenue(id, ct);
        return NoContent();
    }
}