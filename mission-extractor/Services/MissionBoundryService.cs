using mission_extractor.Models;

namespace mission_extractor.Services
{
    public class MissionBoundryService
    {

        private readonly MissionRowBoundries _missionRowBoundries;
        public MissionBoundryService(MissionRowBoundries missionRowBoundries)
        {
            _missionRowBoundries = missionRowBoundries;
        }

        public CaptureRegionConfig GetCategory(int rowIndex)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.CategoryLeft,
                Top = _missionRowBoundries.TopRow + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.CategoryRight - _missionRowBoundries.CategoryLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }
    }
}
