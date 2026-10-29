using System.Net;
using System.Net.Http.Json;
using System.Text;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Controllers;

public class BoardsControllerTests : IDisposable
{
    private readonly ApiFactory _api = new();
    private readonly HttpClient _client;

    public BoardsControllerTests() => _client = _api.CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        _api.Dispose();
    }

    /* ---- Reads ---- */

    [Fact]
    public async Task GetAll_ReturnsBoardsInEnvelope()
    {
        _api.Db.AddBoard("Alpha");
        _api.Db.AddBoard("Beta");

        var data = await ApiAssert.Success(await _client.GetAsync("/api/boards"));

        Assert.Equal(["Alpha", "Beta"], data.EnumerateArray().Select(b => b.GetProperty("name").GetString()).Order());
    }

    [Fact]
    public async Task GetById_ReturnsBoard()
    {
        var board = _api.Db.AddBoard("Alpha");

        var data = await ApiAssert.Success(await _client.GetAsync($"/api/boards/{board.Id}"));

        Assert.Equal(board.Id, data.GetProperty("id").GetInt32());
        Assert.Equal("Alpha", data.GetProperty("name").GetString());
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.GetAsync("/api/boards/999"), HttpStatusCode.NotFound);

        Assert.Equal("Board not found.", message);
    }

    [Fact]
    public async Task GetById_NonNumericId_Returns400Envelope()
    {
        var (message, errors) = await ApiAssert.ValidationFailure(await _client.GetAsync("/api/boards/abc"));

        Assert.Equal("The value 'abc' is not valid.", message);
        Assert.True(errors.TryGetProperty("id", out _));
    }

    /* ---- Create ---- */

    [Fact]
    public async Task Create_ReturnsCreatedWithLocationAndTrimmedName()
    {
        var response = await _client.PostAsJsonAsync("/api/boards", new { name = "  Roadmap  " });

        var data = await ApiAssert.Success(response, HttpStatusCode.Created);
        var id = data.GetProperty("id").GetInt32();
        Assert.Equal("Roadmap", data.GetProperty("name").GetString());
        Assert.EndsWith($"/api/boards/{id}", response.Headers.Location!.ToString(), StringComparison.OrdinalIgnoreCase);

        using var context = _api.Db.NewContext();
        Assert.Equal("Roadmap", context.Boards.Single().Name);
    }

    [Fact]
    public async Task Create_WhitespaceName_Returns400Envelope()
    {
        // The name is trimmed to "" before validation, so [Required] rejects it
        // ahead of the controller's own blank-name check, with the same message.
        var (message, errors) = await ApiAssert.ValidationFailure(
            await _client.PostAsJsonAsync("/api/boards", new { name = "   " }));

        Assert.Equal("Board name is required.", message);
        Assert.True(errors.TryGetProperty("Name", out _));
    }

    [Fact]
    public async Task Create_NameOverMaxLength_Returns400Envelope()
    {
        var (message, _) = await ApiAssert.ValidationFailure(
            await _client.PostAsJsonAsync("/api/boards", new { name = new string('x', 101) }));

        Assert.Equal("Board name must be 100 characters or fewer.", message);
    }

    [Fact]
    public async Task Create_MalformedJson_Returns400Envelope()
    {
        var content = new StringContent("{ \"name\": ", Encoding.UTF8, "application/json");

        var (message, _) = await ApiAssert.ValidationFailure(await _client.PostAsync("/api/boards", content));

        Assert.Equal("Invalid value for 'name'.", message);

        using var context = _api.Db.NewContext();
        Assert.Empty(context.Boards);
    }

    /* ---- Update / delete ---- */

    [Fact]
    public async Task Update_RenamesBoard()
    {
        var board = _api.Db.AddBoard("Old");

        var data = await ApiAssert.Success(
            await _client.PutAsJsonAsync($"/api/boards/{board.Id}", new { name = "New" }));

        Assert.Equal("New", data.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Update_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync("/api/boards/999", new { name = "New" }), HttpStatusCode.NotFound);

        Assert.Equal("Board not found.", message);
    }

    [Fact]
    public async Task Delete_RemovesBoard()
    {
        var board = _api.Db.AddBoard();

        await ApiAssert.Success(await _client.DeleteAsync($"/api/boards/{board.Id}"));

        using var context = _api.Db.NewContext();
        Assert.Empty(context.Boards);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.DeleteAsync("/api/boards/999"), HttpStatusCode.NotFound);

        Assert.Equal("Board not found.", message);
    }
}
