## OOTP Settings

- Light Mode
- Font: Roboto
- Font Size: High as possible

## Plan

- Get better screenshots on widescreen
    - Define pixel boundries of rows and columns using paint
- Use OpenCVSharp to get cell data instead of row data
- Consider upscaling as part of preprocessing
- Configure Tesseract PSM
    - 7 for single line, 8 for single word, 4 for column, 6 for multi-line paragraph
- Possibly Whitelist characters in tesseract
- As I process missions, create mission DTOs, fill them in as data is extracted
- Validate the dto data: card id, reward, category, etc
    - Automatically fix easy ocr errors and flag the rest
    - Consider fuzzy search for card title to card id mapping
- After processing serialize the list to json and save to missions.json and the flagged missions to a separate json.
- Consider doing the whole process per category and appending missions.json if manual checking is needed.
