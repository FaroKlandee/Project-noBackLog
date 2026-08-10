using NoBacklog.Api.Models;

namespace NoBacklog.Api.Services.Interfaces;

public interface ICardService
{
    Task<IEnumerable<Card>> GetAllCardsAsync(int? listId, int? boardId);
    Task<Card?> GetCardByIdAsync(int id);
    Task<Card> CreateCardAsync(Card card);
    Task<Card?> UpdateCardAsync(int id, Card card);
    Task<bool> DeleteCardAsync(int id);
    Task<Card?> RepositionCardAsync(int id, CardReorderRequest request);
}