using System.Text.Json.Serialization;

namespace MissionExtractor.dto;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MissionType
{
    Count,
    Points,
    Mission
}
