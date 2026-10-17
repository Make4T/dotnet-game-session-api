import { type FormEvent, useEffect, useMemo, useState } from "react";
import { gameSessionApi } from "./api";
import type { CreateSessionInput, GameSession, SessionStatus } from "./types";

type Filter = "All" | SessionStatus;
type Activity = { id: number; label: string; timestamp: Date; tone: "success" | "info" | "error" };

const filters: Filter[] = ["All", "Lobby", "InProgress", "Completed"];
const defaultSession: CreateSessionInput = { name: "Northern Lights", region: "EU", maxPlayers: 4 };
const statusLabel: Record<SessionStatus, string> = { Lobby: "Lobby", InProgress: "In progress", Completed: "Completed" };

function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function App() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [connection, setConnection] = useState<"checking" | "online" | "offline">("checking");
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateSessionInput>(defaultSession);
  const [playerId, setPlayerId] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);

  const addActivity = (label: string, tone: Activity["tone"] = "info") => {
    setActivity((current) => [{ id: Date.now(), label, timestamp: new Date(), tone }, ...current].slice(0, 5));
  };

  const refresh = async (preferredSessionId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [health, sessionList] = await Promise.all([gameSessionApi.health(), gameSessionApi.listSessions()]);
      setConnection(health.status === "ok" ? "online" : "offline");
      setSessions(sessionList);
      setSelectedId((current) => preferredSessionId ?? current ?? sessionList[0]?.id ?? null);
    } catch (requestError) {
      setConnection("offline");
      setError(requestError instanceof Error ? requestError.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const visibleSessions = useMemo(() => sessions.filter((session) => filter === "All" || session.status === filter), [filter, sessions]);
  const selected = sessions.find((session) => session.id === selectedId) ?? visibleSessions[0] ?? null;
  const activeLobbies = sessions.filter((session) => session.status === "Lobby").length;
  const playersOnline = sessions.reduce((total, session) => total + session.playerCount, 0);
  const activeMatches = sessions.filter((session) => session.status === "InProgress").length;

  const createSession = async (event: FormEvent) => {
    event.preventDefault();
    setActionPending(true); setError(null);
    try {
      const created = await gameSessionApi.createSession({ ...createForm, name: createForm.name.trim(), region: createForm.region.trim() });
      addActivity(`Created ${created.name} in ${created.region}.`, "success");
      await refresh(created.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create the session.");
    } finally { setActionPending(false); }
  };

  const joinSelected = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setActionPending(true); setError(null);
    try {
      await gameSessionApi.joinSession(selected.id, playerId.trim());
      addActivity(`${playerId.trim()} joined ${selected.name}.`, "success");
      setPlayerId("");
      await refresh(selected.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join the session.");
    } finally { setActionPending(false); }
  };

  const changeStatus = async (status: SessionStatus) => {
    if (!selected || selected.status === status) return;
    setActionPending(true); setError(null);
    try {
      await gameSessionApi.updateStatus(selected.id, status);
      addActivity(`${selected.name} moved to ${statusLabel[status]}.`);
      await refresh(selected.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update the session state.");
    } finally { setActionPending(false); }
  };

  return (
    <main className="app-shell">
      <div className="backdrop backdrop-one" /><div className="backdrop backdrop-two" />
      <section className="command-center" aria-label="Game Session Command Center">
        <header className="topbar">
          <div><p className="eyebrow">Portfolio interface / React + TypeScript + .NET</p><h1>Game Session <span>Command Center</span></h1><p className="subtitle">Live lobby control built on top of the ASP.NET Core Minimal API.</p></div>
          <div className={`connection ${connection}`} aria-live="polite"><i />{connection === "checking" ? "Checking API" : connection === "online" ? "API online" : "API offline"}</div>
        </header>

        <section className="metrics" aria-label="Session metrics">
          <Metric label="Open lobbies" value={activeLobbies} accent="cyan" /><Metric label="Players online" value={playersOnline} accent="violet" /><Metric label="Matches in progress" value={activeMatches} accent="amber" />
          <button className="refresh-button" type="button" onClick={() => void refresh(selected?.id)} disabled={loading}>{loading ? "Synchronizing..." : "Refresh data"}</button>
        </section>
        {error && <div className="alert" role="alert">{error}</div>}

        <section className="workspace">
          <aside className="panel session-panel">
            <div className="panel-heading"><div><p className="section-kicker">Discover</p><h2>Sessions</h2></div><span className="count-badge">{visibleSessions.length}</span></div>
            <div className="filter-row" aria-label="Filter sessions by status">{filters.map((item) => <button key={item} type="button" className={filter === item ? "filter active" : "filter"} onClick={() => setFilter(item)}>{item === "All" ? "All" : statusLabel[item]}</button>)}</div>
            <div className="session-list">
              {visibleSessions.map((session) => <button key={session.id} type="button" className={selected?.id === session.id ? "session-card selected" : "session-card"} onClick={() => setSelectedId(session.id)}><span className={`status-dot ${session.status}`} /><span className="session-name">{session.name}</span><span className="session-meta">{session.region} · {session.playerCount}/{session.maxPlayers}</span></button>)}
              {!loading && visibleSessions.length === 0 && <p className="empty-list">No sessions match this filter.</p>}
            </div>
          </aside>

          <section className="panel details-panel">
            {selected ? <>
              <div className="panel-heading detail-heading"><div><p className="section-kicker">Selected session</p><h2>{selected.name}</h2></div><span className={`status-pill ${selected.status}`}>{statusLabel[selected.status]}</span></div>
              <div className="session-summary"><div><span>Region</span><strong>{selected.region}</strong></div><div><span>Created</span><strong>{formatTime(selected.createdAtUtc)}</strong></div><div><span>Capacity</span><strong>{selected.playerCount} / {selected.maxPlayers}</strong></div></div>
              <div className="capacity-track" aria-label={`${selected.playerCount} of ${selected.maxPlayers} player slots occupied`}><div style={{ width: `${Math.max(5, (selected.playerCount / selected.maxPlayers) * 100)}%` }} /></div>
              <div className="member-section"><div className="subheading"><h3>Connected players</h3><span>{selected.members.length} member{selected.members.length === 1 ? "" : "s"}</span></div>{selected.members.length > 0 ? <ul className="member-list">{selected.members.map((member) => <li key={member.playerId}><span className="avatar">{member.playerId.slice(0, 1).toUpperCase()}</span><span>{member.playerId}</span><time>{formatTime(member.joinedAtUtc)}</time></li>)}</ul> : <p className="muted">No players have joined this lobby yet.</p>}</div>
              <div className="action-grid"><form className="join-form" onSubmit={joinSelected}><label htmlFor="player-id">Join as player</label><div><input id="player-id" value={playerId} onChange={(event) => setPlayerId(event.target.value)} placeholder="e.g. player_01" minLength={1} required disabled={selected.status !== "Lobby" || actionPending} /><button className="primary" type="submit" disabled={selected.status !== "Lobby" || actionPending}>{selected.status === "Lobby" ? "Join lobby" : "Lobby closed"}</button></div></form><div className="status-actions"><span>Match state</span><div>{(["Lobby", "InProgress", "Completed"] as SessionStatus[]).map((status) => <button key={status} type="button" onClick={() => void changeStatus(status)} disabled={actionPending || selected.status === status} className={selected.status === status ? "state-button active" : "state-button"}>{statusLabel[status]}</button>)}</div></div></div>
            </> : <div className="empty-state"><p className="section-kicker">No selection</p><h2>Create your first session</h2><p>Use the control panel to add a lobby and begin demonstrating the API flow.</p></div>}
          </section>

          <aside className="side-stack">
            <form className="panel create-panel" onSubmit={createSession}><div className="panel-heading"><div><p className="section-kicker">Control</p><h2>Create lobby</h2></div></div><label htmlFor="session-name">Session name<input id="session-name" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} minLength={3} maxLength={80} required /></label><div className="field-pair"><label htmlFor="region">Region<input id="region" value={createForm.region} onChange={(event) => setCreateForm({ ...createForm, region: event.target.value })} minLength={2} maxLength={16} required /></label><label htmlFor="capacity">Capacity<input id="capacity" type="number" min="1" max="16" value={createForm.maxPlayers} onChange={(event) => setCreateForm({ ...createForm, maxPlayers: Number(event.target.value) })} required /></label></div><button className="primary create-button" type="submit" disabled={actionPending}>{actionPending ? "Sending command..." : "Create session"}</button></form>
            <section className="panel activity-panel"><div className="panel-heading"><div><p className="section-kicker">Local feed</p><h2>Activity</h2></div></div>{activity.length > 0 ? <ul className="activity-list">{activity.map((entry) => <li key={entry.id}><span className={`activity-icon ${entry.tone}`}>•</span><span>{entry.label}<time>{formatTime(entry.timestamp)}</time></span></li>)}</ul> : <p className="muted">Actions you take will be recorded here for this browser session.</p>}</section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) { return <div className={`metric ${accent}`}><span>{label}</span><strong>{value.toString().padStart(2, "0")}</strong></div>; }
export default App;
