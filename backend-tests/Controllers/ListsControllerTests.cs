using System.Net;
using System.Net.Http.Json;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Controllers;

public class ListsControllerTests : IDisposable
{
    private readonly ApiFactory _api = new();
    private readonly HttpClient _client;

    public ListsControllerTests() => _client = _api.CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        _api.Dispose();
    }

    /* ---- Reads ---- */

    [Fact]
    public async Task GetAll_FiltersByBoard()
    {
        var board = _api.Db.AddBoard();
        var other = _api.Db.AddBoard();
        _api.Db.AddList(board.Id, "Mine");
        _api.Db.AddList(other.Id, "Theirs");

        var data = await ApiAssert.Success(await _client.GetAsync($"/api/lists?boardId={board.Id}"));

        Assert.Equal(["Mine"], data.EnumerateArray().Select(l => l.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.GetAsync("/api/lists/999"), HttpStatusCode.NotFound);

        Assert.Equal("List not found.", message);
    }

    /* ---- Create ---- */

    [Fact]
    public async Task Create_ReturnsCreatedList()
    {
        var board = _api.Db.AddBoard();

        var data = await ApiAssert.Success(
            await _client.PostAsJsonAsync("/api/lists", new { boardId = board.Id, name = " To do " }),
            HttpStatusCode.Created);

        Assert.Equal("To do", data.GetProperty("name").GetString());
        Assert.Equal(board.Id, data.GetProperty("boardId").GetInt32());
    }

    [Fact]
    public async Task Create_MissingBoardId_Returns400Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/lists", new { name = "To do" }), HttpStatusCode.BadRequest);

        Assert.Equal("Board ID is required.", message);
    }

    [Fact]
    public async Task Create_UnknownBoard_Returns404WithServiceMessage()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/lists", new { boardId = 999, name = "To do" }),
            HttpStatusCode.NotFound);

        Assert.Equal("Board with ID 999 not found.", message);
    }

    [Fact]
    public async Task Create_NameOverMaxLength_ReturnsValidationProblem()
    {
        var board = _api.Db.AddBoard();

        var errors = await ApiAssert.ValidationProblem(
            await _client.PostAsJsonAsync("/api/lists", new { boardId = board.Id, name = new string('x', 51) }));

        Assert.True(errors.TryGetProperty("Name", out _));
    }

    /* ---- Update / delete ---- */

    [Fact]
    public async Task Update_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync("/api/lists/999", new { name = "Renamed" }), HttpStatusCode.NotFound);

        Assert.Equal("List not found.", message);
    }

    [Fact]
    public async Task Update_UnknownBoard_Returns404WithServiceMessage()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/lists/{list.Id}", new { name = "Renamed", boardId = 999 }),
            HttpStatusCode.NotFound);

        Assert.Equal("Board with ID 999 not found.", message);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.DeleteAsync("/api/lists/999"), HttpStatusCode.NotFound);

        Assert.Equal("List not found.", message);
    }

    /* ---- Reorder ---- */

    [Fact]
    public async Task Reorder_WritesZeroBasedPositions()
    {
        var board = _api.Db.AddBoard();
        var a = _api.Db.AddList(board.Id, "A", 0);
        var b = _api.Db.AddList(board.Id, "B", 1);

        await ApiAssert.Success(await _client.PatchAsJsonAsync("/api/lists/reorder", new[] { b.Id, a.Id }));

        using var context = _api.Db.NewContext();
        Assert.Equal(0, context.Lists.Single(l => l.Id == b.Id).Position);
        Assert.Equal(1, context.Lists.Single(l => l.Id == a.Id).Position);
    }

    [Fact]
    public async Task Reorder_EmptyPayload_Returns400Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync("/api/lists/reorder", Array.Empty<int>()), HttpStatusCode.BadRequest);

        Assert.Equal("Reorder payload cannot be empty.", message);
    }

    [Fact]
    public async Task Reorder_UnknownId_IsSkippedNot404()
    {
        // ReorderListsAsync skips IDs it can't find rather than throwing, so the
        // controller's KeyNotFoundException → 404 branch is never reached.
        var list = _api.Db.AddList(_api.Db.AddBoard().Id, position: 3);

        await ApiAssert.Success(await _client.PatchAsJsonAsync("/api/lists/reorder", new[] { 999, list.Id }));

        using var context = _api.Db.NewContext();
        Assert.Equal(1, context.Lists.Single().Position);
    }
}
