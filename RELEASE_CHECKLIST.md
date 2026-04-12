# OOTP 27 Release Checklist

Steps to complete once OOTP 27 is available and mission/card data can be exported.

1. [Done] Export card shop data to csv
2. [Done] Transform raw card shop data to shop_cards.csv
    - Run `node ootp-missions-27/scripts/import-shop-cards.mjs "C:\Users\seane\Documents\Out of the Park Developments\OOTP Baseball 27\online_data\pt_card_list.csv"` to produce `app/public/data/shop_cards.csv`
3. [Done] Generate new missions.json (see details below)
4. [Done] Add new release features (see details below)
5. [Done] Test with new missions.json and shop_cards.csv
6. [Done] Update release text (see details below)
7. Deploy with a normal pr merge

# Generate new missions.json
- Load new shop_cards.csv into mission extractor
- Generate live level 1 and live level 2 missions
    - Add new Generate Live Level missions and Add Live Level missions to state buttons
    - Generate Live Level missions puts the json mission list on screen like it does for pt elite as described below
    - Add Live Level to State does the same thing as add PT Elite to state but for the live level missions
    - live level 1 - per abbreviation, similar to what the dropdown does now but all at once like pt elite now
        - name: `Live Level 1 - {team name}` (can use abbreviation is there isn't a team name mapping)
        - type: `count`
        - requiredCount: 20
        - reward: `1x Standard Pack, Park: {abbreviation} park`
        - category: `Live Series`
        - Cards: Each card with type live and the abbreviation as the last part of the title, e.g. "MLB 2026 Live RP Ryan Zeferjahn LAA" is inclded in the LAA live mission
        - totalPoints: length of cards array
    - live level 2 - the same as live level one with these differences
        - name: `Live Level 2 - {team name}` (can use abbreviation is there isn't a team name mapping)
        - requiredCount: 21
    - Insert rewards through the manage missions page, not OCR
- Use OCR to capture live mission type missions
- USE OCR to capture Launch Deck missions
- Run transform and load clean to check for errors
- Review mission title spelling
- Save final format json

# Add new release features
- [Done] Add Artifact pack type and default values
- [Done] Add Artifact reward type and default value
- [Done] When Use Sell Price is not selected and there is no last 10 price but there is a sell price, use the sell price

# Update release text
- [Done] Remove PreRelease modal
- [Done] Update Mission Notes modal
- [Done] Verify Help and Upload Help sections are accurate
- [Done] Update default pack prices. Double them?
- [Done] Remove wip banner
