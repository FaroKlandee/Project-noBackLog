using System.Net;
using System.Text.Json;

namespace NoBacklog.Api.Tests.Infrastructure;

/*
 * Assertions for the response envelope every endpoint returns:
 *   { success: bool, message?: string, data?: ... }
 *
 * Failures caught by [ApiController] before a controller runs (malformed JSON,
 * [Required]/[MaxLength], a non-numeric route id) use the same envelope plus a
 * per-field `errors` object (ValidationErrorEnvelope), so they have their own helper.
 */
public static class ApiAssert
{
    /* Asserts the status and success: true, and returns the envelope's data. */
    public static async Task<JsonElement> Success(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        var body = await ReadJson(response);
        Assert.Equal(expected, response.StatusCode);
        Assert.True(body.GetProperty("success").GetBoolean());
        return body.TryGetProperty("data", out var data) ? data : default;
    }

    /* Asserts the status and success: false, and returns the envelope's message. */
    public static async Task<string> Failure(HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await ReadJson(response);
        Assert.Equal(expected, response.StatusCode);
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.False(body.TryGetProperty("data", out _));
        return body.GetProperty("message").GetString()!;
    }

    /* Asserts a model-validation 400 envelope and returns its message and errors object. */
    public static async Task<(string Message, JsonElement Errors)> ValidationFailure(HttpResponseMessage response)
    {
        var body = await ReadJson(response);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(body.GetProperty("success").GetBoolean());
        return (body.GetProperty("message").GetString()!, body.GetProperty("errors"));
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        Assert.False(string.IsNullOrEmpty(json), $"Expected a JSON body, got an empty {(int)response.StatusCode} response.");
        return JsonDocument.Parse(json).RootElement;
    }
}
