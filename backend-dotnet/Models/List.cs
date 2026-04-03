using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NoBacklog.Api.Models;

public class List
{
    public int Id { get; set; }

    [Required]
    public int BoardId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    public int Position { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(BoardId))]
    public Board Board { get; set; } = null!;

    public ICollection<Card> Cards { get; set; } = new List<Card>();
}