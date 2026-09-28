using Microsoft.Extensions.Options;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Services;

public class TimeLogServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private TimeLogService CreateService(int maxEntriesPerCard = 5, int maxRunningTimers = 2) =>
        new(_db.NewContext(), Options.Create(new TimeTrackingOptions
        {
            MaxEntriesPerCard = maxEntriesPerCard,
            MaxRunningTimers = maxRunningTimers,
        }));

    private static readonly DateTime Start = new(2026, 1, 1, 9, 0, 0, DateTimeKind.Utc);

    /* ---- Settings / queries ---- */

    [Fact]
    public void GetSettings_ReturnsConfiguredLimits()
    {
        var settings = CreateService(maxEntriesPerCard: 7, maxRunningTimers: 3).GetSettings();

        Assert.Equal(7, settings.MaxEntriesPerCard);
        Assert.Equal(3, settings.MaxRunningTimers);
    }

    [Fact]
    public async Task GetAllTimeLogs_FiltersByCardAndOrdersByStartTime()
    {
        var card = _db.AddCardWithParents();
        var other = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, Start.AddHours(2), Start.AddHours(3));
        _db.AddTimeLog(other.Id, Start, Start.AddHours(1));
        _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        var logs = (await CreateService().GetAllTimeLogsAsync(card.Id)).ToList();

        Assert.All(logs, l => Assert.Equal(card.Id, l.CardId));
        Assert.Equal([Start, Start.AddHours(2)], logs.Select(l => l.StartTime));
    }

    [Fact]
    public async Task GetRunningTimers_ReturnsOnlyRunningWithCardTitle()
    {
        var a = _db.AddCardWithParents("Alpha");
        var b = _db.AddCardWithParents("Beta");
        _db.AddTimeLog(a.Id, Start, Start.AddHours(1));
        _db.AddTimeLog(b.Id, Start.AddHours(2));
        _db.AddTimeLog(a.Id, Start.AddHours(1));

        var running = (await CreateService().GetRunningTimersAsync()).ToList();

        Assert.Equal(["Alpha", "Beta"], running.Select(r => r.CardTitle));
    }

    /* ---- Start ---- */

    [Fact]
    public async Task StartTimeLog_StampsServerTimeAndLeavesEndOpen()
    {
        var card = _db.AddCardWithParents();
        var before = DateTime.UtcNow;

        var log = await CreateService().StartTimeLogAsync(card.Id);

        Assert.True(log.Id > 0);
        Assert.InRange(log.StartTime, before, DateTime.UtcNow);
        Assert.Null(log.EndTime);
        Assert.Equal(0, log.Duration);
    }

    [Fact]
    public async Task StartTimeLog_UnknownCard_Throws()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() => CreateService().StartTimeLogAsync(999));
    }

    [Fact]
    public async Task StartTimeLog_CardAlreadyRunning_Throws()
    {
        var card = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, Start);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService().StartTimeLogAsync(card.Id));

        Assert.Contains("already running", ex.Message);
    }

    [Fact]
    public async Task StartTimeLog_OneBelowEntryLimit_Succeeds()
    {
        var card = _db.AddCardWithParents();
        for (var i = 0; i < 2; i++)
            _db.AddTimeLog(card.Id, Start.AddHours(i), Start.AddHours(i).AddMinutes(30));

        var log = await CreateService(maxEntriesPerCard: 3).StartTimeLogAsync(card.Id);

        Assert.Null(log.EndTime);
    }

    [Fact]
    public async Task StartTimeLog_AtEntryLimit_Throws()
    {
        var card = _db.AddCardWithParents();
        for (var i = 0; i < 3; i++)
            _db.AddTimeLog(card.Id, Start.AddHours(i), Start.AddHours(i).AddMinutes(30));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateService(maxEntriesPerCard: 3).StartTimeLogAsync(card.Id));

        Assert.Contains("3 per card", ex.Message);
    }

    [Fact]
    public async Task StartTimeLog_EntryLimitIsPerCard()
    {
        var full = _db.AddCardWithParents();
        var empty = _db.AddCardWithParents();
        for (var i = 0; i < 3; i++)
            _db.AddTimeLog(full.Id, Start.AddHours(i), Start.AddHours(i).AddMinutes(30));

        var log = await CreateService(maxEntriesPerCard: 3).StartTimeLogAsync(empty.Id);

        Assert.Equal(empty.Id, log.CardId);
    }

    [Fact]
    public async Task StartTimeLog_OneBelowRunningLimit_Succeeds()
    {
        _db.AddTimeLog(_db.AddCardWithParents().Id, Start);
        var card = _db.AddCardWithParents();

        var log = await CreateService(maxRunningTimers: 2).StartTimeLogAsync(card.Id);

        Assert.Null(log.EndTime);
    }

    [Fact]
    public async Task StartTimeLog_AtGlobalRunningLimit_Throws()
    {
        _db.AddTimeLog(_db.AddCardWithParents().Id, Start);
        _db.AddTimeLog(_db.AddCardWithParents().Id, Start);
        var card = _db.AddCardWithParents();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateService(maxRunningTimers: 2).StartTimeLogAsync(card.Id));

        Assert.Contains("2 at a time", ex.Message);
    }

    [Fact]
    public async Task StartTimeLog_FinishedTimersDoNotCountTowardRunningLimit()
    {
        _db.AddTimeLog(_db.AddCardWithParents().Id, Start, Start.AddHours(1));
        _db.AddTimeLog(_db.AddCardWithParents().Id, Start, Start.AddHours(1));
        var card = _db.AddCardWithParents();

        var log = await CreateService(maxRunningTimers: 1).StartTimeLogAsync(card.Id);

        Assert.Null(log.EndTime);
    }

    /* ---- Finish ---- */

    [Fact]
    public async Task FinishTimeLog_StampsEndAndComputesDuration()
    {
        var card = _db.AddCardWithParents();
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var running = _db.AddTimeLog(card.Id, startedAt);

        var finished = await CreateService().FinishTimeLogAsync(running.Id);

        Assert.NotNull(finished!.EndTime);
        Assert.Equal((long)(finished.EndTime!.Value - startedAt).TotalMilliseconds, finished.Duration);
        Assert.InRange(finished.Duration, 5 * 60_000, 6 * 60_000);
    }

    [Fact]
    public async Task FinishTimeLog_AlreadyFinished_Throws()
    {
        var card = _db.AddCardWithParents();
        var done = _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService().FinishTimeLogAsync(done.Id));
    }

    [Fact]
    public async Task FinishTimeLog_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().FinishTimeLogAsync(999));
    }

    [Fact]
    public async Task FinishThenStart_FreesTheRunningSlot()
    {
        var card = _db.AddCardWithParents();
        var service = CreateService(maxRunningTimers: 1);

        var first = await service.StartTimeLogAsync(card.Id);
        await service.FinishTimeLogAsync(first.Id);
        var second = await service.StartTimeLogAsync(card.Id);

        Assert.NotEqual(first.Id, second.Id);
        Assert.Null(second.EndTime);
    }

    /* ---- Create (raw POST) ---- */

    [Fact]
    public async Task CreateTimeLog_Finished_ComputesDuration()
    {
        var card = _db.AddCardWithParents();

        var log = await CreateService().CreateTimeLogAsync(
            new TimeLog { CardId = card.Id, StartTime = Start, EndTime = Start.AddMinutes(90) });

        Assert.Equal(90 * 60_000, log.Duration);
    }

    [Fact]
    public async Task CreateTimeLog_EndEqualToStart_Throws()
    {
        var card = _db.AddCardWithParents();

        await Assert.ThrowsAsync<ArgumentException>(() => CreateService().CreateTimeLogAsync(
            new TimeLog { CardId = card.Id, StartTime = Start, EndTime = Start }));
    }

    [Fact]
    public async Task CreateTimeLog_UnknownCard_Throws()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() => CreateService().CreateTimeLogAsync(
            new TimeLog { CardId = 999, StartTime = Start }));
    }

    [Fact]
    public async Task CreateTimeLog_RunningEntry_RespectsRunningGuards()
    {
        var card = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, Start);

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService().CreateTimeLogAsync(
            new TimeLog { CardId = card.Id, StartTime = Start.AddHours(1) }));
    }

    [Fact]
    public async Task CreateTimeLog_FinishedEntry_IgnoresRunningGuards()
    {
        // A backfilled, already-finished entry doesn't occupy a running slot.
        var card = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, Start);

        var log = await CreateService(maxRunningTimers: 1).CreateTimeLogAsync(
            new TimeLog { CardId = card.Id, StartTime = Start.AddHours(-2), EndTime = Start.AddHours(-1) });

        Assert.True(log.Id > 0);
    }

    [Fact]
    public async Task CreateTimeLog_AtEntryLimit_Throws()
    {
        var card = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService(maxEntriesPerCard: 1).CreateTimeLogAsync(
            new TimeLog { CardId = card.Id, StartTime = Start.AddHours(2), EndTime = Start.AddHours(3) }));
    }

    /* ---- Update ---- */

    [Fact]
    public async Task UpdateTimeLog_NewEndTime_RecomputesDuration()
    {
        var card = _db.AddCardWithParents();
        var log = _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        var updated = await CreateService().UpdateTimeLogAsync(log.Id, new TimeLog { EndTime = Start.AddHours(2) });

        Assert.Equal(Start, updated!.StartTime);
        Assert.Equal(2 * 3_600_000, updated.Duration);
    }

    [Fact]
    public async Task UpdateTimeLog_StartAfterExistingEnd_Throws()
    {
        var card = _db.AddCardWithParents();
        var log = _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            CreateService().UpdateTimeLogAsync(log.Id, new TimeLog { StartTime = Start.AddHours(2) }));
    }

    [Fact]
    public async Task UpdateTimeLog_UnknownTargetCard_Throws()
    {
        var card = _db.AddCardWithParents();
        var log = _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().UpdateTimeLogAsync(log.Id, new TimeLog { CardId = 999 }));
    }

    [Fact]
    public async Task UpdateTimeLog_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().UpdateTimeLogAsync(999, new TimeLog()));
    }

    /* ---- Delete ---- */

    [Fact]
    public async Task DeleteTimeLog_RemovesEntryAndFreesEntrySlot()
    {
        var card = _db.AddCardWithParents();
        var log = _db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        Assert.True(await CreateService().DeleteTimeLogAsync(log.Id));

        var restarted = await CreateService(maxEntriesPerCard: 1).StartTimeLogAsync(card.Id);
        Assert.Equal(card.Id, restarted.CardId);
    }

    [Fact]
    public async Task DeleteTimeLog_UnknownId_ReturnsFalse()
    {
        Assert.False(await CreateService().DeleteTimeLogAsync(999));
    }
}
