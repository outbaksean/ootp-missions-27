namespace mission_extractor.Services;

public record CardEntry(int CardId, int CardValue);

public class CardMappingService
{
    private readonly Dictionary<string, CardEntry> _cards;

    public CardMappingService(string csvPath)
    {
        if (!File.Exists(csvPath))
            throw new FileNotFoundException($"shop_cards.csv not found at: {csvPath}");

        _cards = new Dictionary<string, CardEntry>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in File.ReadAllLines(csvPath))
        {
            if (line.TrimStart().StartsWith("//"))
                continue;

            var parts = line.Split(',');
            if (parts.Length < 3)
                continue;

            var title = parts[0].Trim();
            if (!int.TryParse(parts[1].Trim(), out int cardId))
                continue;
            if (!int.TryParse(parts[2].Trim(), out int cardValue))
                continue;

            _cards[title] = new CardEntry(cardId, cardValue);
        }

        Console.WriteLine($"Loaded {_cards.Count} card entries from shop_cards.csv.");
    }

    public IReadOnlyDictionary<string, CardEntry> Cards => _cards;

    public bool TryLookup(string title, out CardEntry entry) =>
        _cards.TryGetValue(title.Trim(), out entry!);
}
