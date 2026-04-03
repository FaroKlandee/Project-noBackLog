using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NoBacklog.Api.Models;

public enum Priority
{
    Low,
    Medium,
    High
}

public class Card
{
    public int Id { get; set; }

    [Required]
    public int ListId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;

    public int TimeTracked { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ListId))]
    public List List { get; set; } = null!;

    public ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
}