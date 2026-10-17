import type { CreateSessionInput, GameSession, SessionStatus } from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5274").replace(/\/$/, "");

interface ProblemDetails {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    let problem: ProblemDetails | undefined;
    try {
      problem = (await response.json()) as ProblemDetails;
    } catch {
      // API errors are usually ProblemDetails; retain a useful fallback otherwise.
    }
    const validationMessages = problem?.errors ? Object.values(problem.errors).flat().join(" ") : undefined;
    throw new Error(validationMessages ?? problem?.message ?? problem?.detail ?? problem?.title ?? `Request failed (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const gameSessionApi = {
  health: () => request<{ status: string }>("/health"),
  listSessions: () => request<GameSession[]>("/api/sessions"),
  createSession: (input: CreateSessionInput) => request<GameSession>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  joinSession: (sessionId: string, playerId: string) => request<GameSession>(`/api/sessions/${sessionId}/members`, { method: "POST", body: JSON.stringify({ playerId }) }),
  updateStatus: (sessionId: string, status: SessionStatus) => request<void>(`/api/sessions/${sessionId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
