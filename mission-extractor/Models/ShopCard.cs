namespace mission_extractor.Models;

/// <summary>
/// DTO for shop card data extracted from screen
/// </summary>
public class ShopCard
{
    public string CardId { get; set; } = string.Empty;
    public string CardName { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public List<string> Attributes { get; set; } = new();
}
