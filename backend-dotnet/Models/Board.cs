using System.ComponentModel.DataAnnotations;

namespace NoBacklog.Api.Models;

public class Board
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<List> Lists { get; set; } = new List<List>();
}