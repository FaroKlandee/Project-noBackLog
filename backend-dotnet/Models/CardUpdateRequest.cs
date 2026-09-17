using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

/*
 * Dedicated request DTO for PUT /api/cards/:id, mirroring CardReorderRequest's
 * pattern for PATCH .../reorder. Binding straight to the domain Card model
 * doesn't work here: Card.Position carries [Required], and [ApiController]'s
 * automatic model-state validation runs — and rejects the request — BEFORE the
 * controller action body ever executes, so a partial body that omits
 * "position" (which every caller of this endpoint does; card placement is
 * owned exclusively by the reorder endpoint) always 400'd regardless of what
 * the action or service tried to do with it.
 *
 * Every field here is optional, matching CardService.UpdateCardAsync's
 * "null/omitted = leave unchanged" contract — except Priority, which stays a
 * full replace (see that method's comment for why).
 */
public class CardUpdateRequest
{
    public int? ListId { get; set; }

    [MaxLength(100)]
    public string? Title { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;
}
