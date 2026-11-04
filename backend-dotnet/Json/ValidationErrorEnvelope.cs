using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace NoBacklog.Api.Json;

/*
 * Response for requests [ApiController] rejects before an action runs: model
 * validation ([Required], [MaxLength]), unreadable JSON, unknown enum values and
 * non-numeric route ids. Registered as InvalidModelStateResponseFactory in
 * Program.cs.
 *
 * The default is ValidationProblemDetails, which has no `message`, so the
 * frontend's api.js fell back to "HTTP error: 400 Bad Request". This returns
 * the same { success: false, message } envelope the controllers return by hand,
 * plus the per-field `errors` for anything that wants the detail.
 */
public static class ValidationErrorEnvelope
{
    public static IActionResult Create(ActionContext context)
    {
        var invalid = context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .ToList();

        var errors = invalid.ToDictionary(
            entry => entry.Key,
            entry => entry.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

        return new BadRequestObjectResult(new { success = false, message = MessageFor(invalid), errors });
    }

    /*
     * One human-readable message. A System.Text.Json failure is keyed by its JSON
     * path ("$.priority") and comes with a "The <param> field is required." for
     * the body that couldn't be bound, so the JSON error is preferred: it names
     * the actual problem.
     */
    private static string MessageFor(List<KeyValuePair<string, ModelStateEntry?>> invalid)
    {
        var jsonError = invalid.FirstOrDefault(entry => entry.Key.StartsWith('$'));
        if (jsonError.Key is { } path)
            return path.StartsWith("$.") ? $"Invalid value for '{path[2..]}'." : "The request body is not valid JSON.";

        return invalid.Count > 0
            ? invalid[0].Value!.Errors[0].ErrorMessage
            : "The request is invalid.";
    }
}
