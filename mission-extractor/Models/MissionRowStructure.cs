namespace mission_extractor.Models;

/// <summary>
/// DTO for mission row structure extracted from screen
/// </summary>
public class MissionRowStructure
{
    public string MissionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Rewards { get; set; } = new();
}
