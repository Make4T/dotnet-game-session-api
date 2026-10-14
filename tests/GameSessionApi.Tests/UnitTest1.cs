using GameSessionApi.Contracts;
using GameSessionApi.Services;

namespace GameSessionApi.Tests;

public class SessionRequestValidatorTests
{
    [Fact]
    public void Validate_returns_no_errors_for_a_valid_session_request()
    {
        var errors = SessionRequestValidator.Validate(new CreateGameSessionRequest("Northern Lights", "eu", 4));

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("", "eu", 4, "name")]
    [InlineData("Ok", "", 4, "region")]
    [InlineData("Northern Lights", "eu", 0, "maxPlayers")]
    [InlineData("Northern Lights", "eu", 17, "maxPlayers")]
    public void Validate_returns_field_errors_for_invalid_values(string name, string region, int maxPlayers, string expectedField)
    {
        var errors = SessionRequestValidator.Validate(new CreateGameSessionRequest(name, region, maxPlayers));

        Assert.Contains(expectedField, errors.Keys);
    }
}
