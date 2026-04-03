using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Services;

public class TimeLogService : ITimeLogService
{
    private readonly AppDbContext _context;

    public TimeLogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TimeLog>> GetAllTimeLogsAsync(int? cardId)
    {
        var query = _context.TimeLogs.AsQueryable();

        if (cardId.HasValue)
            query = query.Where(t => t.CardId == cardId.Value);

        return await query
            .OrderBy(t => t.StartTime)
            .ToListAsync();
    }

    public async Task<TimeLog?> GetTimeLogByIdAsync(int id)
    {
        return await _context.TimeLogs
            .Include(t => t.Card)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<TimeLog> CreateTimeLogAsync(TimeLog timeLog)
    {
        var cardExists = await _context.Cards.AnyAsync(c => c.Id == timeLog.CardId);
        if (!cardExists)
            throw new KeyNotFoundException($"Card with ID {timeLog.CardId} not found.");

        if (timeLog.EndTime.HasValue && timeLog.EndTime <= timeLog.StartTime)
            throw new ArgumentException("End time must be after start time.");

        if (timeLog.EndTime.HasValue)
            timeLog.Duration = (long)(timeLog.EndTime.Value - timeLog.StartTime).TotalMilliseconds;

        timeLog.CreatedAt = DateTime.UtcNow;
        timeLog.UpdatedAt = DateTime.UtcNow;

        _context.TimeLogs.Add(timeLog);
        await _context.SaveChangesAsync();

        return timeLog;
    }

    public async Task<TimeLog?> UpdateTimeLogAsync(int id, TimeLog updated)
    {
        var timeLog = await _context.TimeLogs.FindAsync(id);
        if (timeLog is null) return null;

        if (updated.CardId != 0 && updated.CardId != timeLog.CardId)
        {
            var cardExists = await _context.Cards.AnyAsync(c => c.Id == updated.CardId);
            if (!cardExists)
                throw new KeyNotFoundException($"Card with ID {updated.CardId} not found.");

            timeLog.CardId = updated.CardId;
        }

        var newStartTime = updated.StartTime != default ? updated.StartTime : timeLog.StartTime;
        var newEndTime = updated.EndTime ?? timeLog.EndTime;

        if (newEndTime.HasValue && newEndTime <= newStartTime)
            throw new ArgumentException("End time must be after start time.");

        timeLog.StartTime = newStartTime;
        timeLog.EndTime = newEndTime;

        if (newEndTime.HasValue)
            timeLog.Duration = (long)(newEndTime.Value - newStartTime).TotalMilliseconds;

        timeLog.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return timeLog;
    }

    public async Task<bool> DeleteTimeLogAsync(int id)
    {
        var timeLog = await _context.TimeLogs.FindAsync(id);
        if (timeLog is null) return false;

        _context.TimeLogs.Remove(timeLog);
        await _context.SaveChangesAsync();

        return true;
    }
}