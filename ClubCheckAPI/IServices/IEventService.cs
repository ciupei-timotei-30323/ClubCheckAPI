using ClubCheckAPI.DTO.Event;

namespace ClubCheckAPI.IServices;

public interface IEventService
{
    public Task<MostActiveStatisticsDto> GetMostActive(MostActiveQueryDto query, CancellationToken ct);

    public Task<ICollection<PublicEventDto>> GetEvents(QueryEventsDto queryDto, CancellationToken ct);

    public Task<PublicEventDto> GetEventBySlug(string slug, CancellationToken ct);

    public Task<PublicEventDto> CreateEvent(CreateEventDto eventDto, CancellationToken ct);

    public Task DeleteEvents(DeleteEventsQuery query, CancellationToken ct);

    public Task<PublicEventDto> UpdateEvent(UpdateEventDto eventDto, int id, CancellationToken ct);
}