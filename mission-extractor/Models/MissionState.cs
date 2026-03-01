using MissionExtractor.dto;

namespace mission_extractor.Models;

public class MissionState
{
    private readonly List<Mission> _missions = new();

    public IReadOnlyList<Mission> Missions => _missions.AsReadOnly();

    public int Count => _missions.Count;

    public int NextId() => _missions.Count > 0 ? _missions.Max(m => m.Id) + 1 : 1;

    public void Add(Mission mission) => _missions.Add(mission);

    public void Replace(IEnumerable<Mission> missions)
    {
        _missions.Clear();
        _missions.AddRange(missions);
    }
}
