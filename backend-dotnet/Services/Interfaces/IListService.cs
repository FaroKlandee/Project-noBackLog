using NoBacklog.Api.Models;

namespace NoBacklog.Api.Services.Interfaces;

public interface IListService
{
    Task<IEnumerable<List>> GetAllListsAsync(int? boardId);
    Task<List?> GetListByIdAsync(int id);
    Task<List> CreateListAsync(List list);
    Task<List?> UpdateListAsync(int id, List list);
    Task<bool> DeleteListAsync(int id);

    /// <summary>
    /// Reassigns the Position value of each list according to the order of IDs
    /// supplied in <paramref name="orderedIds"/>. The first ID receives
    /// position 0, the second position 1, and so on. All changes are persisted
    /// in a single SaveChangesAsync call.
    /// </summary>
    /// <param name="orderedIds">
    /// An ordered sequence of list IDs representing the desired new order.
    /// Every ID must belong to an existing list; unknown IDs are ignored.
    /// </param>
    /// <returns>
    /// <c>true</c> if the operation succeeded; <c>false</c> if no matching
    /// lists were found for any of the supplied IDs.
    /// </returns>
    Task<bool> ReorderListsAsync(IEnumerable<int> orderedIds);
}