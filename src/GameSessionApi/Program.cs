using System.Text.Json.Serialization;
using GameSessionApi.Contracts;
using GameSessionApi.Data;
using GameSessionApi.Domain;
using GameSessionApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<GameSessionDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("GameSessions")));
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("CommandCenter", policy =>
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseCors("CommandCenter");
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Game Session API v1");
        options.DocumentTitle = "Game Session API — OpenAPI";
    });
}
else
{
    app.UseExceptionHandler();
}

using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<GameSessionDbContext>();
    await database.Database.EnsureCreatedAsync();
}

app.MapGet("/", () => Results.Ok(new
{
    service = "Game Session API",
    endpoints = new[] { "/health", "/api/sessions" }
}));

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).WithTags("System");

var sessions = app.MapGroup("/api/sessions").WithTags("Sessions");

sessions.MapGet("/", async (GameSessionDbContext database, SessionStatus? status, CancellationToken cancellationToken) =>
{
    var query = database.GameSessions
        .AsNoTracking()
        .Include(session => session.Members)
        .OrderByDescending(session => session.CreatedAtUtc)
        .AsQueryable();

    if (status is not null)
    {
        query = query.Where(session => session.Status == status);
    }

    var sessionList = await query.ToListAsync(cancellationToken);
    return Results.Ok(sessionList.Select(session => session.ToResponse()));
});

sessions.MapGet("/{id:guid}", async (Guid id, GameSessionDbContext database, CancellationToken cancellationToken) =>
{
    var session = await database.GameSessions
        .AsNoTracking()
        .Include(candidate => candidate.Members)
        .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

    return session is null ? Results.NotFound() : Results.Ok(session.ToResponse());
}).WithName("GetSession");

sessions.MapPost("/", async (CreateGameSessionRequest request, GameSessionDbContext database, CancellationToken cancellationToken) =>
{
    var errors = SessionRequestValidator.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var session = new GameSession
    {
        Id = Guid.NewGuid(),
        Name = request.Name!.Trim(),
        Region = request.Region!.Trim().ToUpperInvariant(),
        MaxPlayers = request.MaxPlayers,
        Status = SessionStatus.Lobby,
        CreatedAtUtc = DateTime.UtcNow
    };

    database.GameSessions.Add(session);
    await database.SaveChangesAsync(cancellationToken);

    return Results.CreatedAtRoute("GetSession", new { id = session.Id }, session.ToResponse());
});

sessions.MapPost("/{id:guid}/members", async (Guid id, JoinSessionRequest request, GameSessionDbContext database, CancellationToken cancellationToken) =>
{
    var playerId = request.PlayerId?.Trim();
    if (string.IsNullOrWhiteSpace(playerId))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["playerId"] = ["Player ID is required."]
        });
    }

    var session = await database.GameSessions
        .Include(candidate => candidate.Members)
        .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

    if (session is null)
    {
        return Results.NotFound();
    }

    if (session.Status is not SessionStatus.Lobby)
    {
        return Results.Conflict(new { message = "Only lobby sessions accept new players." });
    }

    if (session.Members.Count >= session.MaxPlayers)
    {
        return Results.Conflict(new { message = "The session is full." });
    }

    if (session.Members.Any(member => member.PlayerId.Equals(playerId, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.Conflict(new { message = "The player has already joined this session." });
    }

    var member = new SessionMember
    {
        Id = Guid.NewGuid(),
        GameSessionId = session.Id,
        PlayerId = playerId,
        JoinedAtUtc = DateTime.UtcNow
    };
    database.SessionMembers.Add(member);
    await database.SaveChangesAsync(cancellationToken);

    return Results.Ok(session.ToResponse() with
    {
        PlayerCount = session.Members.Count + 1,
        Members = session.Members
            .Append(member)
            .OrderBy(existingMember => existingMember.JoinedAtUtc)
            .Select(existingMember => new SessionMemberResponse(existingMember.PlayerId, existingMember.JoinedAtUtc))
            .ToList()
    });
});

sessions.MapPatch("/{id:guid}/status", async (Guid id, UpdateSessionStatusRequest request, GameSessionDbContext database, CancellationToken cancellationToken) =>
{
    if (!Enum.IsDefined(request.Status))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["status"] = ["Status must be Lobby, InProgress or Completed."]
        });
    }

    var session = await database.GameSessions.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
    if (session is null)
    {
        return Results.NotFound();
    }

    session.Status = request.Status;
    await database.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
});

app.Run();

public partial class Program { }
