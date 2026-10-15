# Game Session API

A compact ASP.NET Core Minimal API that models multiplayer game sessions and player membership. It is a portfolio sample for C#/.NET web development: typed request contracts, SQLite persistence, validation, REST endpoints and automated tests.

## Features

- Create and list game sessions, optionally filtered by status
- Join a lobby with duplicate-player and capacity guards
- Transition a session between `Lobby`, `InProgress` and `Completed`
- SQLite persistence through Entity Framework Core
- JSON enum values and RFC 7807-style validation responses
- xUnit tests for request validation

## API design

```text
HTTP client
    │ JSON request contracts
    ▼
ASP.NET Core Minimal API
    │ validation and session rules
    ▼
Entity Framework Core → SQLite
```

The server is responsible for the rules that protect a session: only lobby sessions accept new players, player IDs are unique inside a session and membership cannot exceed the configured capacity.

## Endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `GET` | `/api/sessions?status=Lobby` | List sessions, optionally filtered by status |
| `GET` | `/api/sessions/{id}` | Get a single session and its members |
| `POST` | `/api/sessions` | Create a session |
| `POST` | `/api/sessions/{id}/members` | Join a lobby session |
| `PATCH` | `/api/sessions/{id}/status` | Change status to `Lobby`, `InProgress` or `Completed` |

## Run locally

```powershell
dotnet restore
dotnet run --project src/GameSessionApi
```

The API creates `game-sessions.db` locally on first startup.

## Example request

```http
POST /api/sessions
Content-Type: application/json

{
  "name": "Northern Lights",
  "region": "eu",
  "maxPlayers": 4
}
```

## Test

```powershell
dotnet test
```

## What this project demonstrates

- Minimal API endpoint design with typed C# request and response contracts
- Validation responses through RFC 7807-compatible problem details
- Persisting game session and member relationships using EF Core
- Enforcing multiplayer session rules in the backend
- Unit-testing validation logic with xUnit
