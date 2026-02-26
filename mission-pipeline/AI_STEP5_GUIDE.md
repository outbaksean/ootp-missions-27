# AI Step 5 Guide (Mission Details)

## Goal
Create `output/mission_details_{uniqueId}.json` from expanded mission detail screenshots in `screenshots/missionDetails/`.

## UniqueId
- Use the same `{uniqueId}` that was generated in step 1 for this pipeline run.
- This keeps files paired for the run.
## Input
- Images: `screenshots/missionDetails/*.png`
- Each image shows a single mission expanded with its card list or mission list.

## Output Format
Top-level array of mission detail objects.

### Mission detail object fields
- `missionName`: Exact mission name shown.
- `category`: Category name if visible; otherwise omit or leave empty string.
- `type`: `count`, `points`, or `missions` if visible; otherwise omit.
- `entries`: Array of card or mission items.

### Entry object fields
- `kind`: `card` or `mission`.
- `title`: Card title or mission name exactly as shown.
- `points`: Number if shown for card points (only for points missions).

## Notes
- Do not include IDs; only names/titles.
- Preserve order shown in the UI.
- If points are not visible, omit the `points` field.
- If the mission is a missions-type, list the required mission names as `kind: "mission"`.
