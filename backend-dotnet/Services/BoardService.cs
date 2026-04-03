using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Services;

public class BoardService : IBoardService
{
    private readonly AppDbContext _context;

    public BoardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Board>> GetAllBoardsAsync()
    {
        return await _context.Boards
            .OrderBy(b => b.CreatedAt)
            .ToListAsync();
    }

    public async Task<Board?> GetBoardByIdAsync(int id)
    {
        return await _context.Boards.FindAsync(id);
    }

    public async Task<Board> CreateBoardAsync(Board board)
    {
        board.CreatedAt = DateTime.UtcNow;
        board.UpdatedAt = DateTime.UtcNow;

        _context.Boards.Add(board);
        await _context.SaveChangesAsync();

        return board;
    }

    public async Task<Board?> UpdateBoardAsync(int id, Board updated)
    {
        var board = await _context.Boards.FindAsync(id);
        if (board is null) return null;

        board.Name = updated.Name;
        board.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return board;
    }

    public async Task<bool> DeleteBoardAsync(int id)
    {
        var board = await _context.Boards.FindAsync(id);
        if (board is null) return false;

        _context.Boards.Remove(board);
        await _context.SaveChangesAsync();

        return true;
    }
}