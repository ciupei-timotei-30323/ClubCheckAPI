namespace ClubCheckAPI.DTO;

public record PagedResult<T>
{
    /// <summary>
    /// Items in the requested page, ordered deterministically.
    /// </summary>
    public ICollection<T> Items { get; set; } = [];

    /// <summary>
    /// Total number of items matching the filters before pagination is applied.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// One-based page number of this result.
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Maximum number of items requested per page, after clamping to 1-100.
    /// </summary>
    public int PageSize { get; set; }
}
