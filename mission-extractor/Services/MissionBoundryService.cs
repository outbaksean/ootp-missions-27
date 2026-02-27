using mission_extractor.Models;
using System.Drawing;
using System.Drawing.Imaging;

namespace mission_extractor.Services
{
    public class MissionBoundryService
    {

        private readonly MissionRowBoundries _missionRowBoundries;

        public MissionBoundryService(MissionRowBoundries missionRowBoundries)
        {
            _missionRowBoundries = missionRowBoundries;
        }

        /// <summary>
        /// Detects the anchor point (first horizontal bar) and calculates the row offset.
        /// This should be called when you need to account for scrolling within the table.
        /// </summary>
        /// <param name="screenshot">The bitmap screenshot to analyze</param>
        /// <param name="searchStartPixel">The pixel height to start searching from (typically TopRow)</param>
        /// <param name="searchHeight">The pixel height range to search within</param>
        /// <returns>The calculated offset in pixels from the expected position</returns>
        public async Task<int> CalculateRowOffset()
        {
            var region = new CaptureRegionConfig
            {
                Left = _missionRowBoundries.CategoryLeft,
                Top = _missionRowBoundries.TopRow,
                Width = _missionRowBoundries.TitleRight,
                Height = _missionRowBoundries.RowHeight * 3
            };
            using var bitmap = new Bitmap(region.Width, region.Height, PixelFormat.Format32bppArgb);
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.CopyFromScreen(region.Left, region.Top, 0, 0, new Size(region.Width, region.Height));
            }
            var debugPath = Path.Combine(AppContext.BaseDirectory, "debugImages");
            var fileName = $"row_offset_search.png";
            bitmap.Save(Path.Combine(debugPath, fileName), ImageFormat.Png);

            int anchorY = FindHorizontalBarAnchor(bitmap);

            if (anchorY == _missionRowBoundries.RowHeight)
            {
                return 0;
            }

            var rowOffsetPixels = anchorY - _missionRowBoundries.TopRow;
            return rowOffsetPixels;
        }

        /// <summary>
        /// Finds the first horizontal bar (row divider) within the specified pixel range.
        /// A horizontal bar is detected by scanning for rows with consistent dark pixels across the width.
        /// </summary>
        private int FindHorizontalBarAnchor(Bitmap screenshot)
        {
            const int darkThreshold = 100; // Threshold for considering a pixel "dark"
            const int minConsecutiveDarkPixels = 50; // Minimum dark pixels needed in a row

            for (int y = 0; y < screenshot.Height; y++)
            {
                int darkPixelCount = 0;

                // Scan horizontally across the width to detect a dark line
                for (int x = 0; x < screenshot.Width; x++)
                {
                    Color pixelColor = screenshot.GetPixel(x, y);
                    
                    // Calculate brightness (luminance)
                    int brightness = (pixelColor.R + pixelColor.G + pixelColor.B) / 3;

                    if (brightness < darkThreshold)
                    {
                        darkPixelCount++;
                    }
                }

                // If we found enough consecutive dark pixels, this is likely our anchor
                if (darkPixelCount >= minConsecutiveDarkPixels)
                {
                    return y;
                }
            }

            throw new Exception("Failed to find horizontal bar anchor within the specified region.");
        }

        public CaptureRegionConfig GetCategory(int rowIndex, int rowOffset)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.CategoryLeft,
                Top = _missionRowBoundries.TopRow + rowOffset + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.CategoryRight - _missionRowBoundries.CategoryLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetTitle(int rowIndex, int rowOffset)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.TitleLeft,
                Top = _missionRowBoundries.TopRow + rowOffset + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.TitleRight - _missionRowBoundries.TitleLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetReward(int rowIndex, int rowOffset)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.RewardLeft,
                Top = _missionRowBoundries.TopRow + rowOffset + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.RewardRight - _missionRowBoundries.RewardLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetStatus(int rowIndex, int rowOffset)
        {
            if (rowIndex < 0 || rowIndex >= _missionRowBoundries.NumRows)
            {
                throw new ArgumentOutOfRangeException(nameof(rowIndex), "Row index is out of range.");
            }
            return new CaptureRegionConfig
            {
                Left = _missionRowBoundries.StatusLeft,
                Top = _missionRowBoundries.TopRow + rowOffset + (rowIndex * _missionRowBoundries.RowHeight),
                Width = _missionRowBoundries.StatusRight - _missionRowBoundries.StatusLeft,
                Height = _missionRowBoundries.RowHeight
            };
        }

        public CaptureRegionConfig GetDetail(int row, int column, int rowOffset)
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
                    top = _missionRowBoundries.DetailTop1 + rowOffset;
                    bottom = _missionRowBoundries.DetailBottom1 + rowOffset;
                    break;
                case 1:
                    top = _missionRowBoundries.DetailTop2 + rowOffset;
                    bottom = _missionRowBoundries.DetailBottom2 + rowOffset;
                    break;
                case 2:
                    top = _missionRowBoundries.DetailTop3 + rowOffset;
                    bottom = _missionRowBoundries.DetailBottom3 + rowOffset;
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
