using System.Net;
using System.Net.Http.Json;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Controllers;

public class TimeLogsControllerTests : IDisposable
{
    private readonly ApiFactory _api = new(maxEntriesPerCard: 3, maxRunningTimers: 2);
    private readonly HttpClient _client;

    public TimeLogsControllerTests() => _client = _api.CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        _api.Dispose();
    }

    private static readonly DateTime Start = new(2026, 1, 1, 9, 0, 0, DateTimeKind.Utc);

    /* ---- Reads ---- */

    [Fact]
    public async Task GetSettings_ReflectsConfiguredLimits()
    {
        var data = await ApiAssert.Success(await _client.GetAsync("/api/timelogs/settings"));

        Assert.Equal(3, data.GetProperty("maxEntriesPerCard").GetInt32());
        Assert.Equal(2, data.GetProperty("maxRunningTimers").GetInt32());
    }

    [Fact]
    public async Task GetRunning_ReturnsRunningTimersWithCardTitle()
    {
        var card = _api.Db.AddCardWithParents("Alpha");
        _api.Db.AddTimeLog(card.Id, Start);

        var data = await ApiAssert.Success(await _client.GetAsync("/api/timelogs/running"));

        Assert.Equal(["Alpha"], data.EnumerateArray().Select(r => r.GetProperty("cardTitle").GetString()));
    }

    [Fact]
    public async Task GetById_ReturnsTimeLogWithItsCard()
    {
        // The included Card refers back to this entry through Card.TimeLogs; that
        // cycle used to throw during serialization and return a 500.
        var card = _api.Db.AddCardWithParents("Alpha");
        var log = _api.Db.AddTimeLog(card.Id, Start, Start.AddHours(1));

        var data = await ApiAssert.Success(await _client.GetAsync($"/api/timelogs/{log.Id}"));

        Assert.Equal(card.Id, data.GetProperty("cardId").GetInt32());
        Assert.Equal("Alpha", data.GetProperty("card").GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.GetAsync("/api/timelogs/999"), HttpStatusCode.NotFound);

        Assert.Equal("Time log not found.", message);
    }

    [Fact]
    public async Task GetById_NonNumericId_Returns404FromRouteConstraint()
    {
        // {id:int} doesn't match "abc", so no action is selected at all.
        var response = await _client.GetAsync("/api/timelogs/abc");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /* ---- Create ---- */

    [Fact]
    public async Task Create_MissingCardId_Returns400Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs", new { startTime = Start }), HttpStatusCode.BadRequest);

        Assert.Equal("Card ID is required.", message);
    }

    [Fact]
    public async Task Create_MissingStartTime_Returns400Envelope()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs", new { cardId = card.Id }), HttpStatusCode.BadRequest);

        Assert.Equal("Start time is required.", message);
    }

    [Fact]
    public async Task Create_EndBeforeStart_Returns400WithServiceMessage()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs",
                new { cardId = card.Id, startTime = Start, endTime = Start.AddHours(-1) }),
            HttpStatusCode.BadRequest);

        Assert.Equal("End time must be after start time.", message);
    }

    [Fact]
    public async Task Create_OverEntryLimit_Returns409()
    {
        var card = _api.Db.AddCardWithParents();
        for (var i = 0; i < 3; i++)
            _api.Db.AddTimeLog(card.Id, Start.AddHours(i), Start.AddHours(i).AddMinutes(30));

        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs",
                new { cardId = card.Id, startTime = Start.AddDays(1), endTime = Start.AddDays(1).AddHours(1) }),
            HttpStatusCode.Conflict);

        Assert.Contains("(3 per card)", message);
    }

    /* ---- Start / finish ---- */

    [Fact]
    public async Task Start_ReturnsCreatedRunningTimer()
    {
        var card = _api.Db.AddCardWithParents();

        var response = await _client.PostAsJsonAsync("/api/timelogs/start", new { cardId = card.Id });

        var data = await ApiAssert.Success(response, HttpStatusCode.Created);
        Assert.Equal(card.Id, data.GetProperty("cardId").GetInt32());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, data.GetProperty("endTime").ValueKind);
        Assert.NotNull(response.Headers.Location);
    }

    [Fact]
    public async Task Start_UnknownCard_Returns404WithServiceMessage()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs/start", new { cardId = 999 }), HttpStatusCode.NotFound);

        Assert.Equal("Card with ID 999 not found.", message);
    }

    [Fact]
    public async Task Start_AlreadyRunningOnCard_Returns409()
    {
        var card = _api.Db.AddCardWithParents();
        _api.Db.AddTimeLog(card.Id, Start);

        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs/start", new { cardId = card.Id }), HttpStatusCode.Conflict);

        Assert.Equal("A timer is already running on this card.", message);
    }

    [Fact]
    public async Task Start_OverRunningLimit_Returns409()
    {
        _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start);
        _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start);
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/timelogs/start", new { cardId = card.Id }), HttpStatusCode.Conflict);

        Assert.Contains("(2 at a time)", message);
    }

    [Fact]
    public async Task Finish_StampsEndTime()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start);

        var data = await ApiAssert.Success(await _client.PostAsync($"/api/timelogs/{log.Id}/finish", null));

        Assert.NotEqual(System.Text.Json.JsonValueKind.Null, data.GetProperty("endTime").ValueKind);
        Assert.True(data.GetProperty("duration").GetInt64() > 0);
    }

    [Fact]
    public async Task Finish_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsync("/api/timelogs/999/finish", null), HttpStatusCode.NotFound);

        Assert.Equal("Time log not found.", message);
    }

    [Fact]
    public async Task Finish_AlreadyFinished_Returns409()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start, Start.AddHours(1));

        var message = await ApiAssert.Failure(
            await _client.PostAsync($"/api/timelogs/{log.Id}/finish", null), HttpStatusCode.Conflict);

        Assert.Equal("This timer has already been finished.", message);
    }

    /* ---- Update / delete ---- */

    [Fact]
    public async Task Update_CorrectsTimesAndDuration()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start, Start.AddHours(1));

        var data = await ApiAssert.Success(
            await _client.PutAsJsonAsync($"/api/timelogs/{log.Id}", new { endTime = Start.AddHours(2) }));

        Assert.Equal((long)TimeSpan.FromHours(2).TotalMilliseconds, data.GetProperty("duration").GetInt64());
    }

    [Fact]
    public async Task Update_EndBeforeStart_Returns400WithServiceMessage()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start, Start.AddHours(1));

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/timelogs/{log.Id}", new { endTime = Start.AddHours(-1) }),
            HttpStatusCode.BadRequest);

        Assert.Equal("End time must be after start time.", message);
    }

    [Fact]
    public async Task Update_FutureTime_Returns400WithServiceMessage()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start, Start.AddHours(1));

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/timelogs/{log.Id}", new { endTime = DateTime.UtcNow.AddDays(1) }),
            HttpStatusCode.BadRequest);

        Assert.Equal("Time entries can't be in the future.", message);
    }

    [Fact]
    public async Task Update_EndOfRunningTimer_Returns409()
    {
        var log = _api.Db.AddTimeLog(_api.Db.AddCardWithParents().Id, Start);

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/timelogs/{log.Id}", new { endTime = Start.AddHours(1) }),
            HttpStatusCode.Conflict);

        Assert.Equal("Finish this timer before editing its end time.", message);
    }

    [Fact]
    public async Task Update_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync("/api/timelogs/999", new { startTime = Start }), HttpStatusCode.NotFound);

        Assert.Equal("Time log not found.", message);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.DeleteAsync("/api/timelogs/999"), HttpStatusCode.NotFound);

        Assert.Equal("Time log not found.", message);
    }
}
