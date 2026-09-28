using NoBacklog.Api.Models;
using NoBacklog.Api.Services;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Services;

public class BoardServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private BoardService CreateService() => new(_db.NewContext());

    [Fact]
    public async Task GetAllBoards_ReturnsBoardsOrderedByCreatedAt()
    {
        // Inserted newest-first, so id order and CreatedAt order disagree.
        using (var context = _db.NewContext())
        {
            var now = DateTime.UtcNow;
            context.Boards.Add(new Board { Name = "Second", CreatedAt = now });
            context.Boards.Add(new Board { Name = "First", CreatedAt = now.AddMinutes(-1) });
            context.SaveChanges();
        }

        var boards = await CreateService().GetAllBoardsAsync();

        Assert.Equal(["First", "Second"], boards.Select(b => b.Name));
    }

    [Fact]
    public async Task GetAllBoards_Empty_ReturnsEmpty()
    {
        var boards = await CreateService().GetAllBoardsAsync();

        Assert.Empty(boards);
    }

    [Fact]
    public async Task GetBoardById_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().GetBoardByIdAsync(999));
    }

    [Fact]
    public async Task CreateBoard_StampsTimestampsAndPersists()
    {
        var before = DateTime.UtcNow;
        var stale = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var created = await CreateService().CreateBoardAsync(
            new Board { Name = "Roadmap", CreatedAt = stale, UpdatedAt = stale });

        Assert.True(created.Id > 0);
        Assert.True(created.CreatedAt >= before);
        Assert.True(created.UpdatedAt >= before);

        var reloaded = await CreateService().GetBoardByIdAsync(created.Id);
        Assert.Equal("Roadmap", reloaded!.Name);
    }

    [Fact]
    public async Task UpdateBoard_RenamesAndBumpsUpdatedAt()
    {
        var board = _db.AddBoard("Old");

        var updated = await CreateService().UpdateBoardAsync(board.Id, new Board { Name = "New" });

        Assert.NotNull(updated);
        Assert.True(updated.UpdatedAt > board.UpdatedAt);
        Assert.Equal("New", (await CreateService().GetBoardByIdAsync(board.Id))!.Name);
    }

    [Fact]
    public async Task UpdateBoard_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().UpdateBoardAsync(999, new Board { Name = "X" }));
    }

    [Fact]
    public async Task DeleteBoard_UnknownId_ReturnsFalse()
    {
        Assert.False(await CreateService().DeleteBoardAsync(999));
    }

    [Fact]
    public async Task DeleteBoard_CascadesToListsCardsAndTimeLogs()
    {
        var board = _db.AddBoard();
        var card = _db.AddCard(_db.AddList(board.Id).Id);
        _db.AddTimeLog(card.Id, DateTime.UtcNow.AddHours(-1), DateTime.UtcNow);

        Assert.True(await CreateService().DeleteBoardAsync(board.Id));

        using var context = _db.NewContext();
        Assert.Empty(context.Boards);
        Assert.Empty(context.Lists);
        Assert.Empty(context.Cards);
        Assert.Empty(context.TimeLogs);
    }
}
