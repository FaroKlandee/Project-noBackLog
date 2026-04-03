using NoBacklog.Api.Models;

namespace NoBacklog.Api.Services.Interfaces;

public interface ITimeLogService
{
    Task<IEnumerable<TimeLog>> GetAllTimeLogsAsync(int? cardId);
    Task<TimeLog?> GetTimeLogByIdAsync(int id);
    Task<TimeLog> CreateTimeLogAsync(TimeLog timeLog);
    Task<TimeLog?> UpdateTimeLogAsync(int id, TimeLog timeLog);
    Task<bool> DeleteTimeLogAsync(int id);
}