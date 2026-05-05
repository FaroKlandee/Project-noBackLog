namespace NoBacklog.Api.Models;

/*
 * Data Transfer Object used exclusively by the PATCH /api/lists/reorder endpoint.
 *
 * Carries the minimum information needed to reorder a single list:
 *   - Id       — identifies which list to update.
 *   - Position — the new zero-based index this list should occupy in its column.
 *
 * Using a dedicated DTO rather than the full List model keeps the endpoint
 * contract explicit and prevents callers from accidentally mutating other
 * fields (name, boardId, etc.) through the reorder operation.
 */
public class ListReorderItem
{
    /*
     * The unique identifier of the list to reposition.
     * Must match an existing list ID in the database — the service layer
     * will silently skip any ID that cannot be found.
     */
    public int Id { get; set; }

    /*
     * The new zero-based position for this list within its board column order.
     * The service layer assigns this value directly to List.Position and
     * persists all changes in a single SaveChangesAsync call.
     */
    public int Position { get; set; }
}