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

        public CaptureRegionConfig GetTitle(int rowIndex)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.TitleLeft,
                Top = _missionRowBoundries.TopRow + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.TitleRight - _missionRowBoundries.TitleLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetReward(int rowIndex)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.RewardLeft,
                Top = _missionRowBoundries.TopRow + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.RewardRight - _missionRowBoundries.RewardLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetStatus(int rowIndex)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.StatusLeft,
                Top = _missionRowBoundries.TopRow + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.StatusRight - _missionRowBoundries.StatusLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetDetail(int row, int column)
        {
            if (column < 0 || column >= _missionRowBoundries.DetailColumns)
            {
                throw new ArgumentOutOfRangeException(nameof(column), "Column index is out of range.");
            }
            int top = 0;
            int bottom = 0;
            switch(row)
            {
                case 0:
                    top = _missionRowBoundries.DetailTop1;
                    bottom = _missionRowBoundries.DetailBottom1;
                    break;
                case 1:
                    top = _missionRowBoundries.DetailTop2;
                    bottom = _missionRowBoundries.DetailBottom2;
                    break;
                case 2:
                    top = _missionRowBoundries.DetailTop3;
                    bottom = _missionRowBoundries.DetailBottom3;
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(row), "Row index is out of range.");
                }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.DetailLeft + (column * _missionRowBoundries.DetailWidth),
                Top = top,
                Width = _missionRowBoundries.DetailWidth,
                Height = bottom - top
            };
        }

        public int MaxRowIndex => _missionRowBoundries.NumRows - 1;
        public int MaxColumnIndex => _missionRowBoundries.DetailColumns - 1;
    }
}
