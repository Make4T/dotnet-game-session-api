using GameSessionApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace GameSessionApi.Data;

public sealed class GameSessionDbContext(DbContextOptions<GameSessionDbContext> options) : DbContext(options)
{
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<SessionMember> SessionMembers => Set<SessionMember>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GameSession>(entity =>
        {
            entity.HasKey(session => session.Id);
            entity.Property(session => session.Name).HasMaxLength(80).IsRequired();
            entity.Property(session => session.Region).HasMaxLength(16).IsRequired();
            entity.HasMany(session => session.Members)
                .WithOne()
                .HasForeignKey(member => member.GameSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SessionMember>(entity =>
        {
            entity.HasKey(member => member.Id);
            entity.Property(member => member.PlayerId).HasMaxLength(64).IsRequired();
            entity.HasIndex(member => new { member.GameSessionId, member.PlayerId }).IsUnique();
        });
    }
}
