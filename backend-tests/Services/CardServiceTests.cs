using NoBacklog.Api.Models;
using NoBacklog.Api.Services;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Services;

public class CardServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private CardService CreateService() => new(_db.NewContext());

    [Fact]
    public async Task GetAllCards_FiltersByListAndOrdersByPosition()
    {
        var board = _db.AddBoard();
        var list = _db.AddList(board.Id);
        var other = _db.AddList(board.Id);
        _db.AddCard(list.Id, "C", position: "t");
        _db.AddCard(list.Id, "A", position: "a");
        _db.AddCard(other.Id, "Elsewhere", position: "b");
        _db.AddCard(list.Id, "B", position: "m");

        var cards = await CreateService().GetAllCardsAsync(list.Id, null);

        Assert.Equal(["A", "B", "C"], cards.Select(c => c.Title));
    }

    [Fact]
    public async Task GetAllCards_FiltersByBoardAcrossLists()
    {
        var board = _db.AddBoard();
        _db.AddCard(_db.AddList(board.Id).Id, "One");
        _db.AddCard(_db.AddList(board.Id).Id, "Two");
        _db.AddCard(_db.AddList(_db.AddBoard().Id).Id, "Other board");

        var cards = await CreateService().GetAllCardsAsync(null, board.Id);

        Assert.Equal(["One", "Two"], cards.Select(c => c.Title).Order());
    }

    [Fact]
    public async Task GetAllCards_SharedPosition_TieBreaksByCreatedAt()
    {
        // rank.js can hand out a colliding rank once a gap is exhausted.
        var list = _db.AddList(_db.AddBoard().Id);
        using (var context = _db.NewContext())
        {
            var now = DateTime.UtcNow;
            context.Cards.Add(new Card { ListId = list.Id, Title = "Newer", Position = "m", CreatedAt = now });
            context.Cards.Add(new Card { ListId = list.Id, Title = "Older", Position = "m", CreatedAt = now.AddMinutes(-1) });
            context.SaveChanges();
        }

        var cards = await CreateService().GetAllCardsAsync(list.Id, null);

        Assert.Equal(["Older", "Newer"], cards.Select(c => c.Title));
    }

    [Fact]
    public async Task GetCardById_IncludesList()
    {
        var list = _db.AddList(_db.AddBoard().Id, "Parent");
        var card = _db.AddCard(list.Id);

        var found = await CreateService().GetCardByIdAsync(card.Id);

        Assert.Equal("Parent", found!.List!.Name);
    }

    [Fact]
    public async Task GetCardById_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().GetCardByIdAsync(999));
    }

    [Fact]
    public async Task CreateCard_UnknownList_Throws()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().CreateCardAsync(new Card { ListId = 999, Title = "Orphan", Position = "m" }));
    }

    [Fact]
    public async Task CreateCard_ValidList_Persists()
    {
        var list = _db.AddList(_db.AddBoard().Id);

        var created = await CreateService().CreateCardAsync(
            new Card { ListId = list.Id, Title = "New", Position = "m", Priority = Priority.High });

        var reloaded = await CreateService().GetCardByIdAsync(created.Id);
        Assert.Equal("New", reloaded!.Title);
        Assert.Equal(Priority.High, reloaded.Priority);
    }

    [Fact]
    public async Task UpdateCard_OmittedFields_AreLeftUnchanged()
    {
        var card = _db.AddCardWithParents("Title");
        using (var context = _db.NewContext())
        {
            var seeded = context.Cards.Single();
            seeded.Description = "Keep me";
            seeded.TimeEstimate = "2h";
            context.SaveChanges();
        }

        await CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest { Priority = Priority.Low });

        var reloaded = await CreateService().GetCardByIdAsync(card.Id);
        Assert.Equal("Title", reloaded!.Title);
        Assert.Equal("Keep me", reloaded.Description);
        Assert.Equal("2h", reloaded.TimeEstimate);
        Assert.Equal(Priority.Low, reloaded.Priority);
        Assert.Equal(card.ListId, reloaded.ListId);
    }

    [Fact]
    public async Task UpdateCard_SuppliedFields_AreApplied()
    {
        var card = _db.AddCardWithParents("Old");

        await CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest
        {
            Title = "New",
            Description = "Details",
            Priority = Priority.High,
        });

        var reloaded = await CreateService().GetCardByIdAsync(card.Id);
        Assert.Equal("New", reloaded!.Title);
        Assert.Equal("Details", reloaded.Description);
        Assert.Equal(Priority.High, reloaded.Priority);
    }

    [Fact]
    public async Task UpdateCard_EmptyDescription_ClearsIt()
    {
        var list = _db.AddList(_db.AddBoard().Id);
        var card = _db.AddCard(list.Id, description: "Old text");

        await CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest { Description = "" });

        Assert.Equal("", (await CreateService().GetCardByIdAsync(card.Id))!.Description);
    }

    [Fact]
    public async Task UpdateCard_OmittedPriority_ResetsToMedium()
    {
        // Documented limitation: Priority is a full replace on PUT.
        var list = _db.AddList(_db.AddBoard().Id);
        var card = _db.AddCard(list.Id, priority: Priority.High);

        await CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest { Title = "Renamed" });

        Assert.Equal(Priority.Medium, (await CreateService().GetCardByIdAsync(card.Id))!.Priority);
    }

    [Fact]
    public async Task UpdateCard_MovesToAnotherList()
    {
        var board = _db.AddBoard();
        var card = _db.AddCard(_db.AddList(board.Id).Id);
        var target = _db.AddList(board.Id);

        await CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest { ListId = target.Id });

        Assert.Equal(target.Id, (await CreateService().GetCardByIdAsync(card.Id))!.ListId);
    }

    [Fact]
    public async Task UpdateCard_UnknownTargetList_ThrowsAndLeavesCardUnchanged()
    {
        var card = _db.AddCardWithParents("Keep");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().UpdateCardAsync(card.Id, new CardUpdateRequest { ListId = 999, Title = "Changed" }));

        var reloaded = await CreateService().GetCardByIdAsync(card.Id);
        Assert.Equal("Keep", reloaded!.Title);
        Assert.Equal(card.ListId, reloaded.ListId);
    }

    [Fact]
    public async Task UpdateCard_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().UpdateCardAsync(999, new CardUpdateRequest { Title = "X" }));
    }

    [Fact]
    public async Task DeleteCard_CascadesToTimeLogs()
    {
        var card = _db.AddCardWithParents();
        _db.AddTimeLog(card.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow);

        Assert.True(await CreateService().DeleteCardAsync(card.Id));

        using var context = _db.NewContext();
        Assert.Empty(context.Cards);
        Assert.Empty(context.TimeLogs);
    }

    [Fact]
    public async Task DeleteCard_UnknownId_ReturnsFalse()
    {
        Assert.False(await CreateService().DeleteCardAsync(999));
    }

    [Fact]
    public async Task RepositionCard_UpdatesListAndPosition()
    {
        var board = _db.AddBoard();
        var card = _db.AddCard(_db.AddList(board.Id).Id, position: "m");
        var target = _db.AddList(board.Id);

        var moved = await CreateService().RepositionCardAsync(
            card.Id, new CardReorderRequest { ListId = target.Id, Position = "c" });

        Assert.NotNull(moved);
        var reloaded = await CreateService().GetCardByIdAsync(card.Id);
        Assert.Equal(target.Id, reloaded!.ListId);
        Assert.Equal("c", reloaded.Position);
    }

    [Fact]
    public async Task RepositionCard_UnknownList_Throws()
    {
        var card = _db.AddCardWithParents();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().RepositionCardAsync(card.Id, new CardReorderRequest { ListId = 999, Position = "a" }));
    }

    [Fact]
    public async Task RepositionCard_UnknownCard_ReturnsNull()
    {
        var list = _db.AddList(_db.AddBoard().Id);

        Assert.Null(await CreateService().RepositionCardAsync(
            999, new CardReorderRequest { ListId = list.Id, Position = "a" }));
    }
}
