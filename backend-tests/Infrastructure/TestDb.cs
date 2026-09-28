using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;

namespace NoBacklog.Api.Tests.Infrastructure;

/*
 * One isolated in-memory SQLite database per test.
 *
 * SQLite in-memory was chosen over EF's InMemory provider because it is a real
 * relational engine: foreign keys and ON DELETE CASCADE are enforced, so the
 * cascade and referential-integrity tests mean something. It was chosen over a
 * Postgres Testcontainer to keep `dotnet test` free of a Docker dependency.
 *
 * Known gap vs. production: string ordering (Card.Position) uses SQLite's
 * binary collation, not the Postgres database collation.
 *
 * The database lives as long as the open connection, so the connection is held
 * for the lifetime of the test and every context shares it. Use NewContext()
 * for the "assert" step so results come from the database, not from the
 * change tracker of the context the service wrote through.
 */
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = NewContext();
        context.Database.EnsureCreated();
    }

    public AppDbContext NewContext() => new(_options);

    /* Seed helpers — each writes through its own context and returns the saved entity. */

    public Board AddBoard(string name = "Board")
    {
        using var context = NewContext();
        var board = new Board { Name = name };
        context.Boards.Add(board);
        context.SaveChanges();
        return board;
    }

    public List AddList(int boardId, string name = "List", int position = 0)
    {
        using var context = NewContext();
        var list = new List { BoardId = boardId, Name = name, Position = position };
        context.Lists.Add(list);
        context.SaveChanges();
        return list;
    }

    public Card AddCard(int listId, string title = "Card", string position = "m",
        Priority priority = Priority.Medium, string? description = null)
    {
        using var context = NewContext();
        var card = new Card
        {
            ListId = listId,
            Title = title,
            Position = position,
            Priority = priority,
            Description = description,
        };
        context.Cards.Add(card);
        context.SaveChanges();
        return card;
    }

    public TimeLog AddTimeLog(int cardId, DateTime startTime, DateTime? endTime = null)
    {
        using var context = NewContext();
        var timeLog = new TimeLog
        {
            CardId = cardId,
            StartTime = startTime,
            EndTime = endTime,
            Duration = endTime.HasValue ? (long)(endTime.Value - startTime).TotalMilliseconds : 0,
        };
        context.TimeLogs.Add(timeLog);
        context.SaveChanges();
        return timeLog;
    }

    /* Board → List → Card, for tests that only need "some card". */
    public Card AddCardWithParents(string title = "Card")
    {
        var board = AddBoard();
        var list = AddList(board.Id);
        return AddCard(list.Id, title);
    }

    public void Dispose() => _connection.Dispose();
}
