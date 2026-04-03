using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Data;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Services;

public class CardService : ICardService
{
    private readonly AppDbContext _context;

    public CardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Card>> GetAllCardsAsync(int? listId)
    {
        var query = _context.Cards.AsQueryable();

        if (listId.HasValue)
            query = query.Where(c => c.ListId == listId.Value);

        return await query
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
    }

    public async Task<Card?> GetCardByIdAsync(int id)
    {
        return await _context.Cards
            .Include(c => c.List)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Card> CreateCardAsync(Card card)
    {
        var listExists = await _context.Lists.AnyAsync(l => l.Id == card.ListId);
        if (!listExists)
            throw new KeyNotFoundException($"List with ID {card.ListId} not found.");

        card.CreatedAt = DateTime.UtcNow;
        card.UpdatedAt = DateTime.UtcNow;

        _context.Cards.Add(card);
        await _context.SaveChangesAsync();

        return card;
    }

    public async Task<Card?> UpdateCardAsync(int id, Card updated)
    {
        var card = await _context.Cards.FindAsync(id);
        if (card is null) return null;

        if (updated.ListId != 0 && updated.ListId != card.ListId)
        {
            var listExists = await _context.Lists.AnyAsync(l => l.Id == updated.ListId);
            if (!listExists)
                throw new KeyNotFoundException($"List with ID {updated.ListId} not found.");

            card.ListId = updated.ListId;
        }

        card.Title = updated.Title;
        card.Description = updated.Description;
        card.Priority = updated.Priority;
        card.TimeTracked = updated.TimeTracked;
        card.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return card;
    }

    public async Task<bool> DeleteCardAsync(int id)
    {
        var card = await _context.Cards.FindAsync(id);
        if (card is null) return false;

        _context.Cards.Remove(card);
        await _context.SaveChangesAsync();

        return true;
    }
}