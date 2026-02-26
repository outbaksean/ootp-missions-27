# AI Step 1 Guide (Mission Structure)

## Goal
Create `output/missions_structure_{uniqueId}.json` from the mission list screenshots in `screenshots/missionsByCategory/`.

## UniqueId
- Generate a `{uniqueId}` at runtime and use it consistently in output paths for this run.
- Format suggestion: `YYYYMMDD_HHMMSS` or `YYYYMMDD_HHMMSS_<shorttag>`.

## Input
- Images: `screenshots/missionsByCategory/*.png`
- Each image contains a list of missions for a category.

## Output Format
Top-level object with a `version` string and a `missions` array.

### Mission object fields
- `id`: Sequential integer starting at 1 (order is category order, then row order).
- `name`: Mission name from the row.
- `type`: `count`, `points`, or `missions`.
- `requiredCount`: Denominator required to complete.
- `reward`: Reward text exactly as shown (best-effort cleanup).
- `category`: Category name.
- `cards`: Empty array `[]` for step 1.
- `missionIds`: Only for `type: "missions"` (set to empty array `[]`).

## Type Detection Rules
- If progress shows `X / Y points`, then `type = "points"`, `requiredCount = Y`.
- If progress shows `X / Y Missions`, then `type = "missions"`, `requiredCount = Y`.
- If progress shows `X / any Y out of Z` or `X / Y out of Z`, then `type = "count"`, `requiredCount = Z`.

## Category Names
Use the category in the row or the screenshot filename. Expected categories:
- Future Legends
- World Series Start
- Holiday Times
- PT Elite
- Bonus Rewards
- Final Mission Set

## Notes
- Do not infer or add card IDs.
- Keep rewards as plain strings. Structured rewards are added later by script.
- If a row is unreadable, make a best-effort guess and keep the string close to the screenshot.
