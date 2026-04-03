using Microsoft.AspNetCore.Mvc;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Controllers;

[ApiController]
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardService _cardService;

    public CardsController(ICardService cardService)
    {
        _cardService = cardService;
    }

    // GET /api/cards
    // Optional query param: ?listId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? listId)
    {
        var cards = await _cardService.GetAllCardsAsync(listId);
        return Ok(new { success = true, data = cards });
    }

    // GET /api/cards/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var card = await _cardService.GetCardByIdAsync(id);
        if (card is null)
            return NotFound(new { success = false, message = "Card not found." });

        return Ok(new { success = true, data = card });
    }

    // POST /api/cards
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Card card)
    {
        if (string.IsNullOrWhiteSpace(card.Title))
            return BadRequest(new { success = false, message = "Card title is required." });

        if (card.ListId == 0)
            return BadRequest(new { success = false, message = "List ID is required." });

        try
        {
            var created = await _cardService.CreateCardAsync(card);
            return CreatedAtAction(nameof(GetById), new { id = created.Id },
                new { success = true, message = "Card successfully created.", data = created });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // PUT /api/cards/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Card card)
    {
        if (card.Title is not null && string.IsNullOrWhiteSpace(card.Title))
            return BadRequest(new { success = false, message = "Card title cannot be empty." });

        try
        {
            var updated = await _cardService.UpdateCardAsync(id, card);
            if (updated is null)
                return NotFound(new { success = false, message = "Card not found." });

            return Ok(new { success = true, message = "Card successfully updated.", data = updated });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // DELETE /api/cards/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _cardService.DeleteCardAsync(id);
        if (!deleted)
            return NotFound(new { success = false, message = "Card not found." });

        return Ok(new { success = true, message = "Card successfully deleted." });
    }
}