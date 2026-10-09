using ClubCheckAPI.DTO.Event;

namespace ClubCheckAPI.IServices;

public interface IEventService
{
    public Task<ICollection<PublicEventDto>> GetEvents(QueryEventsDto queryDto, CancellationToken ct);

    public Task<PublicEventDto> GetEventById(int id, CancellationToken ct);

    public Task<PublicEventDto> CreateEvent(CreateEventDto eventDto, CancellationToken ct);

    public Task DeleteEvents(DeleteEventsQuery query, CancellationToken ct);

    public Task<PublicEventDto> UpdateEvent(UpdateEventDto eventDto, int id, CancellationToken ct);
}