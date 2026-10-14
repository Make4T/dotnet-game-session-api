using GameSessionApi.Domain;

namespace GameSessionApi.Contracts;

public sealed record CreateGameSessionRequest(string? Name, string? Region, int MaxPlayers);
public sealed record JoinSessionRequest(string? PlayerId);
public sealed record UpdateSessionStatusRequest(SessionStatus Status);

public sealed record SessionMemberResponse(string PlayerId, DateTime JoinedAtUtc);

public sealed record GameSessionResponse(
    Guid Id,
    string Name,
    string Region,
    SessionStatus Status,
    int MaxPlayers,
    int PlayerCount,
    DateTime CreatedAtUtc,
    IReadOnlyList<SessionMemberResponse> Members);

public static class GameSessionMappings
{
    public static GameSessionResponse ToResponse(this GameSession session) => new(
        session.Id,
        session.Name,
        session.Region,
        session.Status,
        session.MaxPlayers,
        session.Members.Count,
        session.CreatedAtUtc,
        session.Members
            .OrderBy(member => member.JoinedAtUtc)
            .Select(member => new SessionMemberResponse(member.PlayerId, member.JoinedAtUtc))
            .ToList());
}
