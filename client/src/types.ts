export type SessionStatus = "Lobby" | "InProgress" | "Completed";

export interface SessionMember {
  playerId: string;
  joinedAtUtc: string;
}

export interface GameSession {
  id: string;
  name: string;
  region: string;
  status: SessionStatus;
  maxPlayers: number;
  playerCount: number;
  createdAtUtc: string;
  members: SessionMember[];
}

export interface CreateSessionInput {
  name: string;
  region: string;
  maxPlayers: number;
}
