# Map Structured Rewards

- The Reward string is currently captured from ocr and set in the "Reward" property of the Mission dto
- The intent is to parse that in to structured rewards in the "Rewards" field in the Mission dto
- This should be done on "Transform" and on "Load and Clean Verified Missions"
- A validation error should happen for reward if it cannot be parsed.
- There will never be a comma in the reward, it is only a separater
- There are 3 reward types, card, pack, and park
- There can be any number of rewards in any combination of types except each reward will contain at most one card and at most one pack type
- Cards are in the reward string as titles and should be mapped to card ids in the structured reward
- Packs should have the type and count in the structured reward. Pack type must be within a set of available packs
- Parks stay as a string

## Sample reward structure

Athletics Live 2 - Unsung Heroes SS Walt Weiss OAK 1990, Silver Pack, Park: Sutter Health Park
PT Elite 2 SP Cristopher Sanchez PHI, Park: 1940 Braves Field
Park: 1954 Griffith Stadium. Standard Pack
Mixed Bag Missions - Rookie Sensation CL Edwin Diaz SEA 2016, 3x Historical Silver Pack
2x Rainbow Pack
Rainbow Pack
Park: 1949 Polo Grounds, Park: 1939 Polo Grounds, Park: 1979 Candlestick Park
Park: 1877 Louisville Baseball Park
Launch Deck Mission - Snapshot SP Nolan Ryan TEX 1991
