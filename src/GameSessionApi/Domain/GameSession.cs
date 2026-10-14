namespace GameSessionApi.Domain;

public enum SessionStatus
{
    Lobby,
    InProgress,
    Completed
}

public sealed class GameSession
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public SessionStatus Status { get; set; }
    public int MaxPlayers { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public List<SessionMember> Members { get; set; } = [];
}

public sealed class SessionMember
{
    public Guid Id { get; set; }
    public Guid GameSessionId { get; set; }
    public string PlayerId { get; set; } = string.Empty;
    public DateTime JoinedAtUtc { get; set; }
}
