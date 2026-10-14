# Game Session API

A compact ASP.NET Core Minimal API that models multiplayer game sessions and player membership. It is a portfolio sample for C#/.NET web development: typed request contracts, SQLite persistence, validation, REST endpoints and unit tests.

## Features

- Create and list game sessions, optionally filtered by status
- Join a lobby with duplicate-player and capacity guards
- Transition a session between `Lobby`, `InProgress` and `Completed`
- SQLite persistence through Entity Framework Core
- JSON enum values and RFC 7807-style validation responses
- xUnit tests for request validation

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
# dotnet-game-session-api
