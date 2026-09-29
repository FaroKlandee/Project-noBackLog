using System.Text.Json;
using System.Text.Json.Serialization;

namespace NoBacklog.Api.Json;

/// <summary>
/// Trims leading and trailing whitespace from every string value while a request
/// body is being deserialised.
///
/// Registered globally in <c>Program.cs</c>, so it applies to all string
/// properties on all controller payloads. Running at deserialisation time — before
/// model validation — is deliberate: a value like <c>"Backlog" + trailing spaces</c>
/// is trimmed back under the <c>[MaxLength]</c> limit rather than being rejected for
/// a length it only exceeds because of padding. It also means the controllers'
/// <c>IsNullOrWhiteSpace</c> guards see a whitespace-only field as <c>""</c>.
///
/// A JSON <c>null</c> is passed through unchanged (returned as <c>null</c>), so
/// "field omitted / explicitly null" stays distinguishable from "empty string".
/// </summary>
public sealed class TrimmingStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => reader.GetString()?.Trim();

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        => writer.WriteStringValue(value);
}
