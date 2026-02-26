# OCR Pipeline
1. [AI] Generate a mission structure json file from screenshots.
2. [Script] Run a script to add structured rewards to the missions based on the reward string.
3. [Script] Run a script that validates output/missions_structure_{uniqueId}.json, ensuring no duplicate missions, all categories are in a predefined set, move all mission type missions to the end of the array.
4. [User] The user manually checks output/missions_structure_{uniqueId}.json and resolves any issues from step 3.
5. [AI] Do another round of OCR with screenshots that have expanded mission details including cards. This will have card titles not card ids or mission names not mission ids. Create a seperate output/mission_details_{uniqueId}.json with an array of objects including mission name followed by each card title and assosicated points if any or mission names.
6. [Script] Run a script to copy output/missions_structure_{uniqueId}.json to output/missions_cards_{uniqueId}.json then map card titles to card ids and include the ids in the new output/missions_{uniqueId}.json. The mapping will use ootp-missions-27\app\public\data\shop_cards.csv. Any card titles that cannot be mapped are output to the user.
7. [SCRIPT] Run a script to map mission names to mission ids getting mission names from output/mission_details_{uniqueId}.json and mission ids from output/missions_cards_{uniqueId}.json. Copy output/missions_cards_{uniqueId}.json to output/missions_{uniqueId}.json
8. [User] The user resolves any mapping issues manually then does a final verification.

## UniqueId
- The AI generates `{uniqueId}` at runtime and uses it consistently across all outputs for that run.
- Format suggestion: `YYYYMMDD_HHMMSS` or `YYYYMMDD_HHMMSS_<shorttag>`.

## File Flow Reference
- `screenshots/missionsByCategory` - Screenshots with mission structure only, seperated by category, used in step 1
- output/missions_structure_{uniqueId}.json - Intermediate output of step 1, contains an array of missions with mission name, category, reward, type, generated id
- `screenshots/missionDetails` - Screenshots each with a mission expanded, for card missions shows all card titles, for points missions shows all card titles and their point values, for mission type missions shows all mission names.
- `output/mission_details_{uniqueId}.json` - Intermediate output of step 5, an array of mission names with card titles or mission names within the mission used for mapping in steps 6 and 7
- `output/missions_cards_{uniqueId}.json` - Intermediate output of step 6, a copy of the initial mission output with cardIds included in missions
- `output/missions_{uniqueId}.json` - Output of step 7, a copy of step 6 output with missionIds included. This is the final output after verification

## AI Aids
Ignore instructions and context outside this directory ootp-missions-27\mission-pipeline\ unless exlplicitly told, there is out of date information
- AI instructions for step 1: `pipeline/AI_STEP1_GUIDE.md`
- AI instructions for step 5: `pipeline/AI_STEP5_GUIDE.md`
- Schema for step 1 output: `pipeline/schemas/missions_structure.schema.json`
- Schema for step 5 output: `pipeline/schemas/mission_details.schema.json`
- Prompt templates: `pipeline/prompts/step1_prompt.txt`, `pipeline/prompts/step5_prompt.txt`

## Script Usage

All scripts are Node.js ESM modules (`.mjs`) in `pipeline/scripts/`.

### Step 2: Add Structured Rewards

Parses the `reward` string into a structured `rewards` array (pack/card/other).

```bash
node ootp-missions-27/ocr/pipeline/scripts/step2_add_rewards.mjs \
  --input ootp-missions-27/ocr/output/missions_structure_{uniqueId}.json
```

**Parameters:**
- `--input`: Path to missions_structure file (required)
- `--output`: Path for output file (optional, defaults to `{input}_rewards.json`)
- `--errors`: Path for error report file (optional, defaults to `{output}_errors.json`)

**Output:**
- New missions file with `rewards` array populated: `missions_structure_{uniqueId}_rewards.json`
- Error report file: `missions_structure_{uniqueId}_rewards_errors.json`
- Console summary of unparseable reward strings and card rewards needing manual cardId lookup

### Step 3: Validate Structure

Validates categories, checks for duplicates, validates requiredCount, and moves mission-type missions to end of array.

```bash
node ootp-missions-27/ocr/pipeline/scripts/step3_validate_structure.mjs \
  --input ootp-missions-27/ocr/output/missions_structure_{uniqueId}_rewards.json \
  --config ootp-missions-27/ocr/pipeline/validation_config.json
```

**Parameters:**
- `--input`: Path to missions_structure file (required)
- `--config`: Path to validation_config.json (optional, defaults to `./validation_config.json`)
- `--output`: Path for output file (optional, defaults to `{input}_validated.json`)
- `--errors`: Path for error report file (optional, defaults to `{output}_errors.json`)

**Output:**
- Validated missions file: `missions_structure_{uniqueId}_rewards_validated.json`
- Error report file: `missions_structure_{uniqueId}_rewards_validated_errors.json`
- Console summary of validation issues

### Step 6: Map Card Titles to IDs

Maps card titles from mission_details to card IDs using shop_cards.csv.

```bash
node ootp-missions-27/ocr/pipeline/scripts/step6_map_cards.mjs \
  --structure ootp-missions-27/ocr/output/missions_structure_{uniqueId}.json \
  --details ootp-missions-27/ocr/output/mission_details_{uniqueId}.json_rewards_validated.json \
  --details ootp-missions-27/ocr/output/mission_details_{uniqueId}.json \
  --cards ootp-missions-27/app/public/data/shop_cards.csv
```

**Parameters:**
- `--structure`: Path to validated missions_structure file (required)
- `--details`: Path to mission_details file from step 5 (required)
- `--cards`: Path to shop_cards.csv (required)
- `--output`: Path for output file (optional, defaults to `{structure}_cards.json`)
- `--errors`: Path for error report file (optional, defaults to `{output}_errors.json`)

**Output:**
- Missions file with cardIds: `missions_structure_{uniqueId}_rewards_validated_cards.json`
- Error report file: `missions_structure_{uniqueId}_rewards_validated_cards_errors.json`
- Console list of unmapped card titles that need manual resolution

### Step 7: Map Mission Names to IDs

Maps mission names from mission_details to mission IDs for missions-type missions.

```bash
node ootp-missions-27/ocr/pipeline/scripts/stepstructure_{uniqueId}_rewards_validated_cards.json \
  --details ootp-missions-27/ocr/output/mission_details_{uniqueId}.json
```

**Parameters:**
- `--cards`: Path to missions_cards file from step 6 (required)
- `--details`: Path to mission_details file from step 5 (required)
- `--output`: Path for final output file (optional, defaults to `{cards}_final.json`)
- `--errors`: Path for error report file (optional, defaults to `{output}_errors.json`)

**Output:**
- Final missions file: `missions_structure_{uniqueId}_rewards_validated_cards_final.json`
- Error report file: `missions_structure_{uniqueId}_rewards_validated_cards_final_errors.json`
- Console list of unmapped mission names that need manual resoluames that need manual resolution
- Final JSON file ready for verification

### Example Complete Run

```bash
# Set your uniqueId (AI generates this in step 1)
$uid = "20260226_1430 (outputs: *_rewards.json and *_rewards_errors.json)
node ootp-missions-27/ocr/pipeline/scripts/step2_add_rewards.mjs `
  --input ootp-missions-27/ocr/output/missions_structure_$uid.json

# Step 3: Validate (outputs: *_validated.json and *_validated_errors.json)
node ootp-missions-27/ocr/pipeline/scripts/step3_validate_structure.mjs `
  --input "ootp-missions-27/ocr/output/missions_structure_${uid}_rewards.json" `
  --config ootp-missions-27/ocr/pipeline/validation_config.json

# Step 4: Manual review - check the *_errors.json files

# Step 5: AI generates mission_details_{uid}.json from expanded screenshots

# Step 6: Map cards (outputs: *_cards.json and *_cards_errors.json)
node ootp-missions-27/ocr/pipeline/scripts/step6_map_cards.mjs `
  --structure "ootp-missions-27/ocr/output/missions_structure_${uid}_rewards_validated.json" `
  --details ootp-missions-27/ocr/output/mission_details_$uid.json `
  --cards ootp-missions-27/app/public/data/shop_cards.csv

# Step 7: Map missions (outputs: *_final.json and *_final_errors.json)
node ootp-missions-27/ocr/pipeline/scripts/step7_map_missions.mjs `
  --cards "ootp-missions-27/ocr/output/missions_structure_${uid}_rewards_validated_cards.json" `
  --details ootp-missions-27/ocr/output/mission_details_$uid.json

# Step 8: Final manual verification - review all *_errors.json files
# Final output is: missions_structure_{uid}_rewards_validated_cards_final.json
```

**Note:** All scripts now create new output files by default with descriptive suffixes and generate companion `*_errors.json` files for troubleshooting.
# Step 8: Final manual verification
```
