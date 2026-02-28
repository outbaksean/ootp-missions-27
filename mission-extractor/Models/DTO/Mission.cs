using System.Text.Json.Serialization;

namespace MissionExtractor.dto;

/// <summary>
/// Represents a single mission in OOTP
/// </summary>
public class Mission
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public MissionType Type { get; set; }

    [JsonPropertyName("requiredCount")]
    public int RequiredCount { get; set; }

    [JsonPropertyName("reward")]
    public string Reward { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("cards")]
    public List<MissionCard> Cards { get; set; } = new();

    [JsonPropertyName("totalPoints")]
    public int TotalPoints { get; set; }

    [JsonPropertyName("rewards")]
    public List<MissionReward> Rewards { get; set; } = new();
}
