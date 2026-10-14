using GameSessionApi.Contracts;

namespace GameSessionApi.Services;

public static class SessionRequestValidator
{
    public static Dictionary<string, string[]> Validate(CreateGameSessionRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length is < 3 or > 80)
        {
            errors["name"] = ["Name must contain 3 to 80 characters."];
        }

        if (string.IsNullOrWhiteSpace(request.Region) || request.Region.Trim().Length is < 2 or > 16)
        {
            errors["region"] = ["Region must contain 2 to 16 characters."];
        }

        if (request.MaxPlayers is < 1 or > 16)
        {
            errors["maxPlayers"] = ["MaxPlayers must be between 1 and 16."];
        }

        return errors;
    }
}
