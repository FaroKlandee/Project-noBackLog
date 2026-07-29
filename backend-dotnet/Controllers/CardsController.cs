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

    /*
     * GET /api/cards
     *
     * Optional query params:
     *   ?listId=1  — cards in one list
     *   ?boardId=1 — every card on a board, across all its lists
     *
     * boardId exists so a client can load a whole board's cards in one request,
     * chosen over the client issuing one request per list, because N lists
     * otherwise meant N round-trips per board load and forced the card fetch to
     * wait until the list fetch had resolved.
     */
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? listId, [FromQuery] int? boardId)
    {
        var cards = await _cardService.GetAllCardsAsync(listId, boardId);
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

	// PATCH /api/cards/{id}/reorder
    [HttpPatch("{id}/reorder")]
    public async Task<IActionResult> Patch( int id,[FromBody] CardReorderRequest request) {

			/*
			 * A ListId of 0 is the deserialised default for a missing or malformed
			 * field, not a list that failed to be found — so this is 400, matching the
			 * identical check in Create above. A list ID that is well-formed but does
			 * not exist still yields 404, raised as KeyNotFoundException by
			 * RepositionCardAsync and caught below.
			 */
			if (request.ListId == 0)
				return BadRequest(new { success = false, message = "List ID is required." });

			if (string.IsNullOrWhiteSpace(request.Position))
				return BadRequest(new { success = false, message = "Position is required." });

			try {
				var updated = await _cardService.RepositionCardAsync(id, request);
				if (updated is null)
				{
					return NotFound(new { success = false, message = "Reposition error" });
				}
				return Ok(new { success = true, message = "Card successfully repositioned.", data = updated });
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(new { success = false, message = ex.Message });
			}
    }
}
