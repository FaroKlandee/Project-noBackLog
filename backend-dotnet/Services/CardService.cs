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

    /*
     * Filters by a single list, an entire board, or neither.
     *
     * boardId filters through the List navigation property, chosen over
     * denormalising BoardId onto Card, because a copied column would have to be
     * rewritten every time a card moves between lists — and the join is cheap at
     * board-sized row counts.
     *
     * Position ordering is tie-broken by CreatedAt, accepted deliberately over
     * ordering on Position alone, because two cards can still share a rank —
     * rows written before RebalanceListCardsAsync existed, when an exhausted
     * gap fell back to a colliding value, or two clients ranking at once — and
     * ordering on an all-identical column is non-deterministic in Postgres, so
     * rows with a shared rank would reshuffle after any unrelated UPDATE.
     */
    public async Task<IEnumerable<Card>> GetAllCardsAsync(int? listId, int? boardId)
    {
        var query = _context.Cards.AsQueryable();

        if (listId.HasValue)
            query = query.Where(c => c.ListId == listId.Value);

        if (boardId.HasValue)
            query = query.Where(c => c.List!.BoardId == boardId.Value);

        return await query
            .OrderBy(c => c.Position)
            .ThenBy(c => c.CreatedAt)
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

    public async Task<Card?> UpdateCardAsync(int id, CardUpdateRequest updated)
    {
        var card = await _context.Cards.FindAsync(id);
        if (card is null) return null;

        if (updated.ListId.HasValue && updated.ListId.Value != card.ListId)
        {
            var listExists = await _context.Lists.AnyAsync(l => l.Id == updated.ListId.Value);
            if (!listExists)
                throw new KeyNotFoundException($"List with ID {updated.ListId.Value} not found.");

            card.ListId = updated.ListId.Value;
        }

        /*
         * Null / omitted = leave unchanged, mirroring ListService.UpdateListAsync's
         * BoardId/Position guards — CardUpdateRequest's Title/Description are both
         * `string?` with no field initializer, so a key absent from the request
         * JSON leaves them null here, while an explicit "description": "" still
         * comes through as "" (System.Text.Json doesn't special-case empty
         * strings), letting a caller clear it. CardsController.Update 400s a
         * present-but-blank title before the service is ever called, so a null
         * Title here always means "not sent," never "sent blank."
         *
         * Priority stays a full replace: it's a non-nullable enum with no
         * sentinel for "not sent" (see CardUpdateRequest's own default), so a raw
         * PUT that omits it would silently reset priority to Medium. Accepted
         * because the only caller, CardEditDialog, always sends a valid value.
         */
        card.Title = updated.Title ?? card.Title;
        card.Description = updated.Description ?? card.Description;
        card.TimeEstimate = updated.TimeEstimate ?? card.TimeEstimate;
        card.Priority = updated.Priority;
        card.UpdatedAt = DateTime.UtcNow;
        /* TimeTracked is deliberately not read here — owned by the (future) time-log flow. */

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

    public async Task<Card?> RepositionCardAsync(int id, CardReorderRequest request)
    {
        var card = await _context.Cards.FindAsync(id);
        if (card is null) return null;

        var listExists = await _context.Lists.AnyAsync(l => l.Id == request.ListId);
        if (!listExists)
            throw new KeyNotFoundException($"List with ID {request.ListId} not found.");

        card.ListId = request.ListId;
        card.Position = request.Position;
        card.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return card;
    }

    /*
     * Rank format shared with frontend/src/features/cards/utils/rank.js —
     * fixed-width, zero-padded integers spaced RankGap apart. Must stay in sync
     * with RANK_WIDTH / RANK_GAP there, or rebalanced ranks and client-generated
     * ranks would stop sorting against each other.
     */
    private const int RankWidth = 8;
    private const int RankGap = 1000;

    /*
     * Rewrites every card rank in one list, evenly spaced, in the order given.
     *
     * Called by the client once rank.js reports that no integer rank is left
     * between two neighbors. The client sends the list's full intended order,
     * chosen over the server re-spacing the current stored order, because the
     * drop that triggered the rebalance hasn't been persisted yet — the
     * payload is the only place the new order exists.
     *
     * A card ID currently in another list is moved into this one, so a
     * cross-list drop that exhausts a gap is persisted in this single call
     * rather than a reposition followed by a rebalance.
     *
     * The payload must cover every card currently in the list. A card missing
     * from it means the client's view is stale (e.g. a card was added
     * elsewhere), and re-spacing only some cards would collide with the ranks
     * the others keep — so that is rejected as a conflict rather than guessed at.
     *
     * One SaveChangesAsync call, so the whole rewrite is a single transaction:
     * the list is never left with a mix of old and new ranks.
     */
    public async Task<IEnumerable<Card>> RebalanceListCardsAsync(int listId, IReadOnlyList<int> orderedCardIds)
    {
        var listExists = await _context.Lists.AnyAsync(l => l.Id == listId);
        if (!listExists)
            throw new KeyNotFoundException($"List with ID {listId} not found.");

        var cards = await _context.Cards
            .Where(c => c.ListId == listId || orderedCardIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id);

        var unknownIds = orderedCardIds.Where(id => !cards.ContainsKey(id)).ToList();
        if (unknownIds.Count > 0)
            throw new KeyNotFoundException($"Card with ID {unknownIds[0]} not found.");

        var requested = orderedCardIds.ToHashSet();
        if (cards.Values.Any(c => c.ListId == listId && !requested.Contains(c.Id)))
            throw new InvalidOperationException(
                "The card order is out of date — reload the board and try again.");

        var now = DateTime.UtcNow;
        var ordered = orderedCardIds.Select(id => cards[id]).ToList();

        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].ListId = listId;
            ordered[i].Position = ((i + 1) * RankGap).ToString().PadLeft(RankWidth, '0');
            ordered[i].UpdatedAt = now;
        }

        await _context.SaveChangesAsync();

        return ordered;
    }
}
