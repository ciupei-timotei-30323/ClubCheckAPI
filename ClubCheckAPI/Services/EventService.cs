using ClubCheckAPI.DTO.Event;
using ClubCheckAPI.IServices;

namespace ClubCheckAPI.Services;

public class EventService : IEventService
{
    public Task<ICollection<PublicEventDto>> GetEvents(QueryEventsDto queryDto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicEventDto> GetEventBySlug(string slug, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicEventDto> CreateEvent(CreateEventDto eventDto, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task DeleteEvents(DeleteEventsQuery query, CancellationToken ct)
    {
        throw new NotImplementedException();
    }

    public Task<PublicEventDto> UpdateEvent(UpdateEventDto eventDto, int id, CancellationToken ct)
    {
        throw new NotImplementedException();
    }
}