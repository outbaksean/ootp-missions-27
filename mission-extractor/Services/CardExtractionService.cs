namespace mission_extractor.Services;

using mission_extractor.Models;

/// <summary>
/// Service for extracting card information from OCR results using fixed grid detection
/// </summary>
public class CardExtractionService
{
    private const double CardWidth = 130;  // Width to collect words for each card
    private const double CardHeight = 75;  // Height to collect words for each card
    private const double ExpectedCardSpacing = 250;  // Expected horizontal spacing between cards
    private const double RowSpacing = 124;  // Expected vertical spacing between rows

    /// <summary>
    /// Extract card titles from OCR words using grid detection
    /// </summary>
    public List<CardInfo> ExtractCards(List<OcrWordInfo> ocrWords)
    {
        if (ocrWords.Count == 0)
            return new List<CardInfo>();

        // Filter out header words
        var minY = ocrWords.Min(w => w.Top);
        var gridWords = ocrWords.Where(w => w.Top > minY + 180).ToList();
        
        Console.WriteLine($"Filtered to {gridWords.Count} words in grid area");

        // Detect the grid structure from actual word positions
        var gridStructure = DetectGridStructure(gridWords);
        
        if (gridStructure.RowPositions.Count == 0 || gridStructure.ColumnPositions.Count == 0)
        {
            Console.WriteLine("Could not detect grid structure");
            return new List<CardInfo>();
        }

        Console.WriteLine($"Detected grid: {gridStructure.RowPositions.Count} rows x {gridStructure.ColumnPositions.Count} columns");

        // Extract cards at each grid position
        var cards = new List<CardInfo>();
        var usedWords = new HashSet<OcrWordInfo>();

        for (int row = 0; row < gridStructure.RowPositions.Count; row++)
        {
            for (int col = 0; col < gridStructure.ColumnPositions.Count; col++)
            {
                var centerX = gridStructure.ColumnPositions[col];
                var centerY = gridStructure.RowPositions[row];

                var cardWords = GetWordsNearPosition(centerX, centerY, gridWords, usedWords);

                if (cardWords.Count == 0)
                    continue;

                foreach (var word in cardWords)
                {
                    usedWords.Add(word);
                }

                var sortedWords = cardWords.OrderBy(w => w.Top).ThenBy(w => w.Left).ToList();
                var cardText = string.Join(" ", sortedWords.Select(w => w.Text));

                var left = cardWords.Min(w => w.Left);
                var top = cardWords.Min(w => w.Top);
                var right = cardWords.Max(w => w.Right);
                var bottom = cardWords.Max(w => w.Bottom);

                cards.Add(new CardInfo
                {
                    Title = cardText,
                    Left = left,
                    Top = top,
                    Width = right - left,
                    Height = bottom - top,
                    Row = row,
                    Column = col
                });
            }
        }

        return cards;
    }

    private class GridStructure
    {
        public List<double> RowPositions { get; set; } = new();
        public List<double> ColumnPositions { get; set; } = new();
    }

    /// <summary>
    /// Detect the grid structure by finding regular spacing in word positions
    /// </summary>
    private GridStructure DetectGridStructure(List<OcrWordInfo> words)
    {
        var grid = new GridStructure();

        // Find row positions by looking for Y-coordinates with many words
        var yPositions = words.Select(w => w.Top).OrderBy(y => y).ToList();
        var yGroups = new List<List<double>>();
        var currentGroup = new List<double> { yPositions[0] };

        for (int i = 1; i < yPositions.Count; i++)
        {
            if (yPositions[i] - currentGroup.Last() < 30) // Within 30px is same row
            {
                currentGroup.Add(yPositions[i]);
            }
            else
            {
                if (currentGroup.Count >= 10) // Row should have many words
                {
                    yGroups.Add(currentGroup);
                }
                currentGroup = new List<double> { yPositions[i] };
            }
        }
        if (currentGroup.Count >= 10)
        {
            yGroups.Add(currentGroup);
        }

        // Take the top Y of each group as row position
        grid.RowPositions = yGroups.Select(g => g.Min()).ToList();

        // Find column positions by detecting clusters of words in the first row
        if (grid.RowPositions.Count > 0)
        {
            var firstRowY = grid.RowPositions[0];
            // Get words in the top line of the first row (just the category text like "MLB 2025 Live")
            var firstRowWords = words.Where(w => w.Top >= firstRowY && w.Top < firstRowY + 20)
                .OrderBy(w => w.Left).ToList();

            if (firstRowWords.Count == 0)
                return grid;

            // Group words into clusters (cards) based on horizontal gaps
            var cardClusters = new List<List<OcrWordInfo>>();
            var currentCluster = new List<OcrWordInfo> { firstRowWords[0] };

            for (int i = 1; i < firstRowWords.Count; i++)
            {
                var prevWord = firstRowWords[i - 1];
                var currWord = firstRowWords[i];

                // If gap between words is large (>70px), it's a new card
                if (currWord.Left - prevWord.Right > 70)
                {
                    cardClusters.Add(currentCluster);
                    currentCluster = new List<OcrWordInfo> { currWord };
                }
                else
                {
                    currentCluster.Add(currWord);
                }
            }
            cardClusters.Add(currentCluster);

            // Calculate center X for each cluster
            grid.ColumnPositions = cardClusters
                .Select(cluster => (cluster.Min(w => w.Left) + cluster.Max(w => w.Right)) / 2)
                .ToList();

            Console.WriteLine($"Detected {grid.ColumnPositions.Count} columns at X: {string.Join(", ", grid.ColumnPositions.Select(x => x.ToString("F0")))}");
        }

        return grid;
    }

    /// <summary>
    /// Get all words near a specific position (within card bounds)
    /// </summary>
    private List<OcrWordInfo> GetWordsNearPosition(double centerX, double centerY, List<OcrWordInfo> allWords, HashSet<OcrWordInfo> usedWords)
    {
        var cardLeft = centerX - CardWidth / 2;
        var cardRight = centerX + CardWidth / 2;
        var cardTop = centerY;
        var cardBottom = centerY + CardHeight;

        return allWords.Where(w =>
            !usedWords.Contains(w) &&
            w.CenterX >= cardLeft && w.CenterX <= cardRight &&
            w.Top >= cardTop && w.Bottom <= cardBottom
        ).ToList();
    }
}
