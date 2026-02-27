namespace mission_extractor.Models;

/// <summary>
/// Represents a word detected by OCR with its bounding box
/// </summary>
public class OcrWordInfo
{
    public string Text { get; set; } = string.Empty;
    public double Left { get; set; }
    public double Top { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    
    public double Right => Left + Width;
    public double Bottom => Top + Height;
    public double CenterX => Left + Width / 2;
    public double CenterY => Top + Height / 2;
}
