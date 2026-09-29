using NoBacklog.Api.Models;
using NoBacklog.Api.Services;
using NoBacklog.Api.Tests.Infrastructure;

namespace NoBacklog.Api.Tests.Services;

public class ListServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private ListService CreateService() => new(_db.NewContext());

    [Fact]
    public async Task GetAllLists_FiltersByBoardAndOrdersByPosition()
    {
        var board = _db.AddBoard();
        var other = _db.AddBoard("Other");
        _db.AddList(board.Id, "Done", position: 2);
        _db.AddList(board.Id, "Todo", position: 0);
        _db.AddList(other.Id, "Elsewhere", position: 1);
        _db.AddList(board.Id, "Doing", position: 1);

        var lists = await CreateService().GetAllListsAsync(board.Id);

        Assert.Equal(["Todo", "Doing", "Done"], lists.Select(l => l.Name));
    }

    [Fact]
    public async Task GetAllLists_NoFilter_ReturnsEveryBoardsLists()
    {
        _db.AddList(_db.AddBoard().Id);
        _db.AddList(_db.AddBoard().Id);

        Assert.Equal(2, (await CreateService().GetAllListsAsync(null)).Count());
    }

    [Fact]
    public async Task GetListById_IncludesBoard()
    {
        var board = _db.AddBoard("Parent");
        var list = _db.AddList(board.Id);

        var found = await CreateService().GetListByIdAsync(list.Id);

        Assert.Equal("Parent", found!.Board!.Name);
    }

    [Fact]
    public async Task GetListById_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().GetListByIdAsync(999));
    }

    [Fact]
    public async Task CreateList_UnknownBoard_Throws()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().CreateListAsync(new List { BoardId = 999, Name = "Orphan" }));

        Assert.Empty(_db.NewContext().Lists);
    }

    [Fact]
    public async Task CreateList_ValidBoard_Persists()
    {
        var board = _db.AddBoard();

        var created = await CreateService().CreateListAsync(new List { BoardId = board.Id, Name = "Todo" });

        Assert.True(created.Id > 0);
        Assert.Equal(board.Id, (await CreateService().GetListByIdAsync(created.Id))!.BoardId);
    }

    [Fact]
    public async Task UpdateList_RenameOnly_KeepsPositionAndBoard()
    {
        // A rename sends just { name }, so BoardId and Position deserialise to 0.
        var board = _db.AddBoard();
        var list = _db.AddList(board.Id, "Old", position: 3);

        await CreateService().UpdateListAsync(list.Id, new List { Name = "New" });

        var reloaded = await CreateService().GetListByIdAsync(list.Id);
        Assert.Equal("New", reloaded!.Name);
        Assert.Equal(3, reloaded.Position);
        Assert.Equal(board.Id, reloaded.BoardId);
    }

    [Fact]
    public async Task UpdateList_NonZeroPosition_IsApplied()
    {
        var list = _db.AddList(_db.AddBoard().Id, position: 1);

        await CreateService().UpdateListAsync(list.Id, new List { Name = "List", Position = 4 });

        Assert.Equal(4, (await CreateService().GetListByIdAsync(list.Id))!.Position);
    }

    [Fact]
    public async Task UpdateList_MovesToAnotherBoard()
    {
        var list = _db.AddList(_db.AddBoard().Id);
        var target = _db.AddBoard("Target");

        await CreateService().UpdateListAsync(list.Id, new List { Name = "List", BoardId = target.Id });

        Assert.Equal(target.Id, (await CreateService().GetListByIdAsync(list.Id))!.BoardId);
    }

    [Fact]
    public async Task UpdateList_UnknownTargetBoard_ThrowsAndLeavesListUnchanged()
    {
        var board = _db.AddBoard();
        var list = _db.AddList(board.Id, "Keep");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            CreateService().UpdateListAsync(list.Id, new List { Name = "Changed", BoardId = 999 }));

        var reloaded = await CreateService().GetListByIdAsync(list.Id);
        Assert.Equal("Keep", reloaded!.Name);
        Assert.Equal(board.Id, reloaded.BoardId);
    }

    [Fact]
    public async Task UpdateList_UnknownId_ReturnsNull()
    {
        Assert.Null(await CreateService().UpdateListAsync(999, new List { Name = "X" }));
    }

    [Fact]
    public async Task DeleteList_CascadesToCards()
    {
        var list = _db.AddList(_db.AddBoard().Id);
        _db.AddCard(list.Id);

        Assert.True(await CreateService().DeleteListAsync(list.Id));

        using var context = _db.NewContext();
        Assert.Empty(context.Lists);
        Assert.Empty(context.Cards);
    }

    [Fact]
    public async Task DeleteList_UnknownId_ReturnsFalse()
    {
        Assert.False(await CreateService().DeleteListAsync(999));
    }

    [Fact]
    public async Task ReorderLists_AssignsZeroBasedIndexesInGivenOrder()
    {
        var board = _db.AddBoard();
        var a = _db.AddList(board.Id, "A", position: 0);
        var b = _db.AddList(board.Id, "B", position: 1);
        var c = _db.AddList(board.Id, "C", position: 2);

        Assert.True(await CreateService().ReorderListsAsync([c.Id, a.Id, b.Id]));

        var lists = await CreateService().GetAllListsAsync(board.Id);
        Assert.Equal(["C", "A", "B"], lists.Select(l => l.Name));
        Assert.Equal([0, 1, 2], lists.Select(l => l.Position));
    }

    [Fact]
    public async Task ReorderLists_SkipsUnknownIdsButKeepsTheirSlot()
    {
        // The index is taken from the id's place in the request, so an unknown
        // id still consumes a position — the remaining lists are not compacted.
        var board = _db.AddBoard();
        var a = _db.AddList(board.Id, "A");
        var b = _db.AddList(board.Id, "B");

        Assert.True(await CreateService().ReorderListsAsync([b.Id, 999, a.Id]));

        var lists = await CreateService().GetAllListsAsync(board.Id);
        Assert.Equal([("B", 0), ("A", 2)], lists.Select(l => (l.Name, l.Position)));
    }
}
