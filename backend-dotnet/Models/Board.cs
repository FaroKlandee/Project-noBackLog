using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

public class Board
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Board name is required.")]
    [MaxLength(100, ErrorMessage = "Board name must be 100 characters or fewer.")]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<List> Lists { get; set; } = new List<List>();
}