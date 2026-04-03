using Microsoft.EntityFrameworkCore;
using NoBacklog.Api.Models;

namespace NoBacklog.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Board> Boards => Set<Board>();
    public DbSet<List> Lists => Set<List>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<TimeLog> TimeLogs => Set<TimeLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Board
        modelBuilder.Entity<Board>(entity =>
        {
            entity.ToTable("boards");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Id).HasColumnName("id");
            entity.Property(b => b.Name).HasColumnName("name").IsRequired().HasMaxLength(100);
            entity.Property(b => b.CreatedAt).HasColumnName("created_at");
            entity.Property(b => b.UpdatedAt).HasColumnName("updated_at");
        });

        // List
        modelBuilder.Entity<List>(entity =>
        {
            entity.ToTable("lists");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Id).HasColumnName("id");
            entity.Property(l => l.BoardId).HasColumnName("board_id");
            entity.Property(l => l.Name).HasColumnName("name").IsRequired().HasMaxLength(50);
            entity.Property(l => l.Position).HasColumnName("position");
            entity.Property(l => l.CreatedAt).HasColumnName("created_at");
            entity.Property(l => l.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(l => l.Board)
                  .WithMany(b => b.Lists)
                  .HasForeignKey(l => l.BoardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Card
        modelBuilder.Entity<Card>(entity =>
        {
            entity.ToTable("cards");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id");
            entity.Property(c => c.ListId).HasColumnName("list_id");
            entity.Property(c => c.Title).HasColumnName("title").IsRequired().HasMaxLength(100);
            entity.Property(c => c.Description).HasColumnName("description").HasMaxLength(2000);
            entity.Property(c => c.Priority).HasColumnName("priority").HasConversion<string>();
            entity.Property(c => c.TimeTracked).HasColumnName("time_tracked");
            entity.Property(c => c.CreatedAt).HasColumnName("created_at");
            entity.Property(c => c.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(c => c.List)
                  .WithMany(l => l.Cards)
                  .HasForeignKey(c => c.ListId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TimeLog
        modelBuilder.Entity<TimeLog>(entity =>
        {
            entity.ToTable("time_logs");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasColumnName("id");
            entity.Property(t => t.CardId).HasColumnName("card_id");
            entity.Property(t => t.StartTime).HasColumnName("start_time");
            entity.Property(t => t.EndTime).HasColumnName("end_time");
            entity.Property(t => t.Duration).HasColumnName("duration");
            entity.Property(t => t.CreatedAt).HasColumnName("created_at");
            entity.Property(t => t.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(t => t.Card)
                  .WithMany(c => c.TimeLogs)
                  .HasForeignKey(t => t.CardId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}