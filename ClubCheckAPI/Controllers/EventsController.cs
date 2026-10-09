using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class EventsController(IServiceEvent service, ILogger<EventsController> logger) : ControllerBase
{
    /// <summary>
    /// FOr batch retrieval of Events based on a query
    /// </summary>
    /// <param name="query"></param>
    /// <returns></returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ICollection<PublicEventDto>>> GetEvents([FromQuery] QueryEventsDto query, CancellationToken ct)
    {
        logger.LogInformation("Getting events {query}",  query);
        return Ok(await service.GetEvents(query, ct));
    }

    /// <summary>
    /// For retreival of a single Event object using its id 
    /// </summary>
    /// <param name="id">ID of the Event</param>
    /// <returns></returns>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicEventDto>> GetEvent([FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Getting event {id}", id);
        return Ok(await service.GetEventById(id, ct));
    }
    
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<PublicEventDto>> CreateEvent([FromBody] CreateEventDto eventDto, CancellationToken ct)
    {
        logger.LogInformation("Creating event {eventDto}", eventDto);
        var created = await service.CreateEvent(eventDto, ct);
        return CreatedAtAction(nameof(GetEvent), new {id = created.Id},  created);
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteEvent([FromBody] DeleteEventsQuery query, CancellationToken ct)
    {
        logger.LogInformation("Deleting event {query}", query);
        await service.DeleteEvents(query, ct);
        return NoContent();
    }

    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicEventDto>> UpdateEvent([FromBody] UpdatedEventDto eventDto, [FromRoute] int id, CancellationToken ct)
    {
        logger.LogInformation("Updating event {id} as {eventDto}", id, eventDto);
        return Ok(await service.UpdateEvent(eventDto, id, ct));
    }
    
}