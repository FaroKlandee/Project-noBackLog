using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

public class CardReorderRequest {

	[Required]
	public int ListId { get; set; }

	[Required]
	public string Position { get; set; } = string.Empty;
}
