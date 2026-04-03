using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Services;

public class ListService : IListService
{
    private readonly AppDbContext _context;

    public ListService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<List>> GetAllListsAsync(int? boardId)
    {
        var query = _context.Lists.AsQueryable();

        if (boardId.HasValue)
            query = query.Where(l => l.BoardId == boardId.Value);

        return await query
            .OrderBy(l => l.Position)
            .ToListAsync();
    }

    public async Task<List?> GetListByIdAsync(int id)
    {
        return await _context.Lists
            .Include(l => l.Board)
            .FirstOrDefaultAsync(l => l.Id == id);
    }

    public async Task<List> CreateListAsync(List list)
    {
        var boardExists = await _context.Boards.AnyAsync(b => b.Id == list.BoardId);
        if (!boardExists)
            throw new KeyNotFoundException($"Board with ID {list.BoardId} not found.");

        list.CreatedAt = DateTime.UtcNow;
        list.UpdatedAt = DateTime.UtcNow;

        _context.Lists.Add(list);
        await _context.SaveChangesAsync();

        return list;
    }

    public async Task<List?> UpdateListAsync(int id, List updated)
    {
        var list = await _context.Lists.FindAsync(id);
        if (list is null) return null;

        if (updated.BoardId != 0 && updated.BoardId != list.BoardId)
        {
            var boardExists = await _context.Boards.AnyAsync(b => b.Id == updated.BoardId);
            if (!boardExists)
                throw new KeyNotFoundException($"Board with ID {updated.BoardId} not found.");

            list.BoardId = updated.BoardId;
        }

        list.Name = updated.Name;
        list.Position = updated.Position;
        list.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return list;
    }

    public async Task<bool> DeleteListAsync(int id)
    {
        var list = await _context.Lists.FindAsync(id);
        if (list is null) return false;

        _context.Lists.Remove(list);
        await _context.SaveChangesAsync();

        return true;
    }
}