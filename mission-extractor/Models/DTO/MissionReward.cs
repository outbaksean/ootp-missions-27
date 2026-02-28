using System.Text.Json.Serialization;

namespace MissionExtractor.dto;

/// <summary>
/// Represents a reward for completing a mission
/// </summary>
public class MissionReward
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("packType")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public PackType? PackType { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; }
}
