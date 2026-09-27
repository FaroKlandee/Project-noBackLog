using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

/*
 * Request DTO for POST /api/timelogs/start. Only the card is supplied — the
 * start time is always stamped by the server so the log can't be backdated.
 */
public class TimeLogStartRequest
{
    [Required]
    public int CardId { get; set; }
}
