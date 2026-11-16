namespace ClubCheckAPI.DTO.Event;

/// <summary>
/// Currency values exposed by the public event DTOs. Kept separate from the domain enum so that
/// public responses can use string values without changing private write contracts.
/// </summary>
public enum PublicCurrency
{
    EUR,
    RON,
    USD,
    HUF
}
