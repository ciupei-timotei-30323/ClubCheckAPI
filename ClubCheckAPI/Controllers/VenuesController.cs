using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class VenuesController(IVenueService service, ILogger<VenuesController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<PublicVenueDto>>> GetVenues([FromQuery] QueryVenuesDto query,
        CancellationToken ct)
    {
        logger.LogInformation("Getting venues {query}", query);
        return Ok(await service.GetVenues(query, ct));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicVenueDto>> GetVenueById([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Getting venue {id}", id);
        return Ok(service.GetVenueById(id, ct));
    }

    [HttpPost]
    public async Task<ActionResult<PublicVenueDto>> CreateVenue([FromBody] CreateVenueDto venueDto,
        CancellationToken ct)
    {
        logger.LogInformation("Creating venue {venue}", venueDto);
        var created = await service.CreateVenue(venueDto, ct);
        return CreatedAtAction(nameof(GetVenueById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicVenueDto>> UpdateVenue([FromRoute] int id, [FromBody] UpdateVenueDto venueDto,
        CancellationToken ct)
    {
        logger.LogInformation("Updating venue {id} with {venueDto}", id,  venueDto);
        return await service.UpdateVenue(id, venueDto, ct);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteVenue([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Deleting venue {id}", id);
        await service.DeleteVenue(id, ct);
        return NoContent();
    }
}