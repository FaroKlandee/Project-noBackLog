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

    [Required(ErrorMessage = "Position is required.")]
    public string Position { get; set; } = string.Empty;

    [Required(ErrorMessage = "Card title is required.")]
    [MaxLength(100, ErrorMessage = "Card title must be 100 characters or fewer.")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000, ErrorMessage = "Description must be 2000 characters or fewer.")]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;

    [MaxLength(50, ErrorMessage = "Time estimate must be 50 characters or fewer.")]
    public string? TimeEstimate { get; set; }

    public int TimeTracked { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ListId))]
    public List? List { get; set; }

    public ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
}
