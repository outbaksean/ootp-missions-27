namespace mission_extractor.Models;

/// <summary>
/// Represents a card with its position and text content
/// </summary>
public class CardInfo
{
    public string Title { get; set; } = string.Empty;
    public double Left { get; set; }
    public double Top { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public int Row { get; set; }
    public int Column { get; set; }
}
