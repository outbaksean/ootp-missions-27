var projectDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
var rootDir = Directory.GetParent(projectDir)!.FullName;

var inputFileDir = Path.Combine(rootDir, "screenshots");
var outputFileDir = Path.Combine(rootDir, "output");
var engineFilePath = Path.Combine(rootDir, "tesseract");

string[] inputFiles = Directory.GetFiles(inputFileDir, "*.png");
using (var ocrEngine = new Tesseract.TesseractEngine(engineFilePath, "eng", Tesseract.EngineMode.Default))
{
    foreach (var inputFile in inputFiles)
    {
        using (var img = Tesseract.Pix.LoadFromFile(inputFile))
        {
            using (var page = ocrEngine.Process(img))
            {
                var text = page.GetText();
                var outputFilePath = Path.Combine(outputFileDir, Path.GetFileNameWithoutExtension(inputFile) + ".txt");
                File.WriteAllText(outputFilePath, text);
                Console.WriteLine($"Processed {inputFile} and saved output to {outputFilePath}");
            }
        }
    }
}


