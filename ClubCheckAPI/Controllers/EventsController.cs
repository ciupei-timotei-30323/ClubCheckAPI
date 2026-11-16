using ClubCheckAPI.DTO.Event;
using Microsoft.AspNetCore.Mvc;
using ClubCheckAPI.IServices;
using Microsoft.AspNetCore.Authorization;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class EventsController(IEventService service, ILogger<EventsController> logger) : ControllerBase
{
    /// <summary>
    /// FOr batch retrieval of Events based on a query.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Public</c></description></item>
    ///     <item><description>This endpoint is <c>Non-Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("public")]
    [ProducesResponseType(typeof(ICollection<PublicEventDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ICollection<PublicEventDto>>> GetEvents([FromQuery] QueryEventsDto query, CancellationToken ct)
    {
        logger.LogInformation("Getting events {query}",  query);
        return Ok(await service.GetEvents(query, ct));
    }

    /// <summary>
    /// Gets the most active cities, genres, artists and venues based on their linked event counts.
    /// <remarks>This endpoint is <c>Public</c>.</remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("public/most-active")]
    [ProducesResponseType(typeof(MostActiveStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MostActiveStatisticsDto>> GetMostActive([FromQuery] MostActiveQueryDto query,
        CancellationToken ct)
    {
        logger.LogInformation("Getting most active event statistics {query}", query);
        return Ok(await service.GetMostActive(query, ct));
    }

    /// <summary>
    /// For retreival of a single Event object using its name.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Public</c></description></item>
    ///     <item><description>This endpoint is <c>Non-Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [HttpGet("public/{slug}")]
    [ProducesResponseType(typeof(PublicEventDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicEventDto>> GetEvent([FromRoute] string slug, CancellationToken ct)
    {
        logger.LogInformation("Getting event {name}", slug);
        return Ok(await service.GetEventBySlug(slug, ct));
    }
    
    /// <summary>
    /// Creates an Event.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns>The Created Event</returns>
    [Authorize]
    [HttpPost("private")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<PublicEventDto>> CreateEvent([FromBody] CreateEventDto eventDto, CancellationToken ct)
    {
        logger.LogInformation("Creating event {eventDto}", eventDto);
        var created = await service.CreateEvent(eventDto, ct);
        return CreatedAtAction(nameof(GetEvent), new {slug = created.Slug},  created);
    }

    
    /// <summary>
    /// Deletes an event. <remarks>This endpoint is <c>Private</c></remarks>
    /// </summary>
    /// <returns></returns>
    [Authorize]
    [HttpDelete("private")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteEvent([FromBody] DeleteEventsQuery query, CancellationToken ct)
    {
        logger.LogInformation("Deleting event {query}", query);
        await service.DeleteEvents(query, ct);
        return NoContent();
    }

    /// <summary>
    /// Updates an EVent based on its iD.
    /// <remarks>
    /// <list type="number">
    ///     <item><description>This endpoint is <c>Private</c></description></item>
    ///     <item><description>This endpoint is <c>Idempotent</c></description></item>
    /// </list>
    /// </remarks>
    /// </summary>
    /// <returns></returns>
    [Authorize]
    [HttpPut("private/{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicEventDto>> UpdateEvent([FromBody] UpdateEventDto eventDto, [FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Updating event {id} as {eventDto}", id, eventDto);
        return await service.UpdateEvent(eventDto, id, ct);
    }
    
}