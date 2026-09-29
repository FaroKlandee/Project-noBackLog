using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Services;

public class TimeLogService : ITimeLogService
{
    private readonly AppDbContext _context;
    private readonly TimeTrackingOptions _options;

    public TimeLogService(AppDbContext context, IOptions<TimeTrackingOptions> options)
    {
        _context = context;
        _options = options.Value;
    }

    public TimeTrackingOptions GetSettings() => _options;

    /* Every running timer app-wide, with its card's title for display. */
    public async Task<IEnumerable<RunningTimerSummary>> GetRunningTimersAsync()
    {
        return await _context.TimeLogs
            .Where(t => t.EndTime == null)
            .OrderBy(t => t.StartTime)
            .Select(t => new RunningTimerSummary(t.Id, t.CardId, t.Card!.Title, t.StartTime))
            .ToListAsync();
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

        if (!timeLog.EndTime.HasValue)
        {
            await EnsureNoRunningTimerAsync(timeLog.CardId);
            await EnsureBelowRunningLimitAsync();
        }

        await EnsureBelowEntryLimitAsync(timeLog.CardId);

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

    /*
     * Start a timer on a card. The start time is stamped here, not supplied by
     * the client. A card may have at most one running (EndTime == null) entry,
     * its total entry count — running included — is capped by
     * TimeTrackingOptions.MaxEntriesPerCard, and the number of timers running
     * across all cards is capped by TimeTrackingOptions.MaxRunningTimers.
     */
    public async Task<TimeLog> StartTimeLogAsync(int cardId)
    {
        var cardExists = await _context.Cards.AnyAsync(c => c.Id == cardId);
        if (!cardExists)
            throw new KeyNotFoundException($"Card with ID {cardId} not found.");

        await EnsureNoRunningTimerAsync(cardId);
        await EnsureBelowEntryLimitAsync(cardId);
        await EnsureBelowRunningLimitAsync();

        var now = DateTime.UtcNow;
        var timeLog = new TimeLog
        {
            CardId = cardId,
            StartTime = now,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _context.TimeLogs.Add(timeLog);
        await _context.SaveChangesAsync();

        return timeLog;
    }

    /*
     * Stop a running timer, stamping its end time and computing Duration (ms).
     * Returns null when the entry doesn't exist; throws if it's already finished.
     */
    public async Task<TimeLog?> FinishTimeLogAsync(int id)
    {
        var timeLog = await _context.TimeLogs.FindAsync(id);
        if (timeLog is null) return null;

        if (timeLog.EndTime.HasValue)
            throw new InvalidOperationException("This timer has already been finished.");

        var now = DateTime.UtcNow;
        timeLog.EndTime = now;
        timeLog.Duration = (long)(now - timeLog.StartTime).TotalMilliseconds;
        timeLog.UpdatedAt = now;

        await _context.SaveChangesAsync();

        return timeLog;
    }

    private async Task EnsureNoRunningTimerAsync(int cardId)
    {
        var hasRunning = await _context.TimeLogs.AnyAsync(t => t.CardId == cardId && t.EndTime == null);
        if (hasRunning)
            throw new InvalidOperationException("A timer is already running on this card.");
    }

    private async Task EnsureBelowRunningLimitAsync()
    {
        var max = _options.MaxRunningTimers;
        var running = await _context.TimeLogs.CountAsync(t => t.EndTime == null);
        if (running >= max)
            throw new InvalidOperationException(
                $"Running timer limit reached ({max} at a time). Finish another timer first.");
    }

    private async Task EnsureBelowEntryLimitAsync(int cardId)
    {
        var max = _options.MaxEntriesPerCard;
        var count = await _context.TimeLogs.CountAsync(t => t.CardId == cardId);
        if (count >= max)
            throw new InvalidOperationException(
                $"Time log limit reached ({max} per card). Delete an entry to log more.");
    }
}
