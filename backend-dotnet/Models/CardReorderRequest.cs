using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

public class CardReorderRequest {

	[Required]
	public int ListId { get; set; }

	[Required(ErrorMessage = "Position is required.")]
	public string Position { get; set; } = string.Empty;
}
