using NoBacklog.Api.Models;

namespace NoBacklog.Api.Services.Interfaces;

public interface IListService
{
    Task<IEnumerable<List>> GetAllListsAsync(int? boardId);
    Task<List?> GetListByIdAsync(int id);
    Task<List> CreateListAsync(List list);
    Task<List?> UpdateListAsync(int id, List list);
    Task<bool> DeleteListAsync(int id);
}