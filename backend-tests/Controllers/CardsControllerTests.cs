using System.Net;
using System.Net.Http.Json;
using NoBacklog.Api.Models;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Controllers;

public class CardsControllerTests : IDisposable
{
    private readonly ApiFactory _api = new();
    private readonly HttpClient _client;

    public CardsControllerTests() => _client = _api.CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        _api.Dispose();
    }

    /* ---- Reads ---- */

    [Fact]
    public async Task GetAll_ByBoard_ReturnsCardsAcrossListsWithPriorityAsString()
    {
        var board = _api.Db.AddBoard();
        var todo = _api.Db.AddList(board.Id);
        var done = _api.Db.AddList(board.Id);
        _api.Db.AddCard(todo.Id, "A", "a", Priority.High);
        _api.Db.AddCard(done.Id, "B", "b");
        _api.Db.AddCardWithParents("Elsewhere");

        var data = await ApiAssert.Success(await _client.GetAsync($"/api/cards?boardId={board.Id}"));

        var cards = data.EnumerateArray().ToList();
        Assert.Equal(["A", "B"], cards.Select(c => c.GetProperty("title").GetString()));
        Assert.Equal("High", cards[0].GetProperty("priority").GetString());
    }

    [Fact]
    public async Task GetById_ReturnsCardWithItsList()
    {
        // The included List refers back to this card through List.Cards; that
        // cycle used to throw during serialization and return a 500.
        var card = _api.Db.AddCardWithParents("Alpha");

        var data = await ApiAssert.Success(await _client.GetAsync($"/api/cards/{card.Id}"));

        Assert.Equal("Alpha", data.GetProperty("title").GetString());
        Assert.Equal("List", data.GetProperty("list").GetProperty("name").GetString());
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.GetAsync("/api/cards/999"), HttpStatusCode.NotFound);

        Assert.Equal("Card not found.", message);
    }

    /* ---- Create ---- */

    [Fact]
    public async Task Create_ReturnsCreatedCard()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        var data = await ApiAssert.Success(
            await _client.PostAsJsonAsync("/api/cards",
                new { listId = list.Id, title = "Write tests", position = "m", priority = "Low" }),
            HttpStatusCode.Created);

        Assert.Equal("Write tests", data.GetProperty("title").GetString());
        Assert.Equal("Low", data.GetProperty("priority").GetString());
    }

    [Fact]
    public async Task Create_MissingListId_Returns400Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/cards", new { title = "T", position = "m" }),
            HttpStatusCode.BadRequest);

        Assert.Equal("List ID is required.", message);
    }

    [Fact]
    public async Task Create_BlankTitleOrPosition_Returns400EnvelopeWithEachField()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        var (message, errors) = await ApiAssert.ValidationFailure(
            await _client.PostAsJsonAsync("/api/cards", new { listId = list.Id, title = " ", position = "" }));

        Assert.Contains(message, new[] { "Card title is required.", "Position is required." });
        Assert.True(errors.TryGetProperty("Title", out _));
        Assert.True(errors.TryGetProperty("Position", out _));
    }

    [Fact]
    public async Task Create_UnknownPriority_Returns400EnvelopeNamingTheField()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        var (message, _) = await ApiAssert.ValidationFailure(
            await _client.PostAsJsonAsync("/api/cards",
                new { listId = list.Id, title = "T", position = "m", priority = "Urgent" }));

        Assert.Equal("Invalid value for 'priority'.", message);
    }

    [Fact]
    public async Task Create_UnknownList_Returns404WithServiceMessage()
    {
        var message = await ApiAssert.Failure(
            await _client.PostAsJsonAsync("/api/cards", new { listId = 999, title = "T", position = "m" }),
            HttpStatusCode.NotFound);

        Assert.Equal("List with ID 999 not found.", message);
    }

    /* ---- Update ---- */

    [Fact]
    public async Task Update_OmittedFieldsAreUnchanged()
    {
        var card = _api.Db.AddCardWithParents("Keep me");

        var data = await ApiAssert.Success(
            await _client.PutAsJsonAsync($"/api/cards/{card.Id}", new { description = "Notes" }));

        Assert.Equal("Keep me", data.GetProperty("title").GetString());
        Assert.Equal("Notes", data.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Update_BlankTitle_Returns400Envelope()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/cards/{card.Id}", new { title = "  " }), HttpStatusCode.BadRequest);

        Assert.Equal("Card title cannot be empty.", message);
    }

    [Fact]
    public async Task Update_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync("/api/cards/999", new { title = "T" }), HttpStatusCode.NotFound);

        Assert.Equal("Card not found.", message);
    }

    [Fact]
    public async Task Update_UnknownList_Returns404WithServiceMessage()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PutAsJsonAsync($"/api/cards/{card.Id}", new { listId = 999 }), HttpStatusCode.NotFound);

        Assert.Equal("List with ID 999 not found.", message);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404Envelope()
    {
        var message = await ApiAssert.Failure(await _client.DeleteAsync("/api/cards/999"), HttpStatusCode.NotFound);

        Assert.Equal("Card not found.", message);
    }

    /* ---- Reorder ---- */

    [Fact]
    public async Task Reorder_MovesCardToAnotherList()
    {
        var board = _api.Db.AddBoard();
        var from = _api.Db.AddList(board.Id);
        var to = _api.Db.AddList(board.Id);
        var card = _api.Db.AddCard(from.Id);

        var data = await ApiAssert.Success(
            await _client.PatchAsJsonAsync($"/api/cards/{card.Id}/reorder", new { listId = to.Id, position = "c" }));

        Assert.Equal(to.Id, data.GetProperty("listId").GetInt32());
        Assert.Equal("c", data.GetProperty("position").GetString());
    }

    [Fact]
    public async Task Reorder_MissingListId_Returns400Envelope()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/cards/{card.Id}/reorder", new { position = "c" }),
            HttpStatusCode.BadRequest);

        Assert.Equal("List ID is required.", message);
    }

    [Fact]
    public async Task Reorder_UnknownList_Returns404WithServiceMessage()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/cards/{card.Id}/reorder", new { listId = 999, position = "c" }),
            HttpStatusCode.NotFound);

        Assert.Equal("List with ID 999 not found.", message);
    }

    [Fact]
    public async Task Reorder_UnknownCard_Returns404Envelope()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        await ApiAssert.Failure(
            await _client.PatchAsJsonAsync("/api/cards/999/reorder", new { listId = list.Id, position = "c" }),
            HttpStatusCode.NotFound);
    }

    /* ---- Rebalance ---- */

    [Fact]
    public async Task Rebalance_RewritesRanksInRequestedOrder()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);
        var a = _api.Db.AddCard(list.Id, "A", "a");
        var b = _api.Db.AddCard(list.Id, "B", "b");

        var data = await ApiAssert.Success(
            await _client.PatchAsJsonAsync($"/api/lists/{list.Id}/cards/rebalance", new[] { b.Id, a.Id }));

        var positions = data.EnumerateArray()
            .ToDictionary(c => c.GetProperty("id").GetInt32(), c => c.GetProperty("position").GetString()!);
        Assert.True(string.CompareOrdinal(positions[b.Id], positions[a.Id]) < 0);
    }

    [Fact]
    public async Task Rebalance_EmptyPayload_Returns400Envelope()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/lists/{list.Id}/cards/rebalance", Array.Empty<int>()),
            HttpStatusCode.BadRequest);

        Assert.Equal("Rebalance payload cannot be empty.", message);
    }

    [Fact]
    public async Task Rebalance_DuplicateIds_Returns400Envelope()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/lists/{card.ListId}/cards/rebalance", new[] { card.Id, card.Id }),
            HttpStatusCode.BadRequest);

        Assert.Equal("Rebalance payload contains duplicate card IDs.", message);
    }

    [Fact]
    public async Task Rebalance_UnknownCard_Returns404WithServiceMessage()
    {
        var card = _api.Db.AddCardWithParents();

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/lists/{card.ListId}/cards/rebalance", new[] { card.Id, 999 }),
            HttpStatusCode.NotFound);

        Assert.Equal("Card with ID 999 not found.", message);
    }

    [Fact]
    public async Task Rebalance_OmittedCardInList_Returns409()
    {
        var list = _api.Db.AddList(_api.Db.AddBoard().Id);
        var a = _api.Db.AddCard(list.Id, "A", "a");
        _api.Db.AddCard(list.Id, "B", "b");

        var message = await ApiAssert.Failure(
            await _client.PatchAsJsonAsync($"/api/lists/{list.Id}/cards/rebalance", new[] { a.Id }),
            HttpStatusCode.Conflict);

        Assert.Contains("out of date", message);
    }
}
