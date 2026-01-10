# ZBLL Algorithm Data Source

## Overview

This document describes the research and setup for obtaining ZBLL (Zborowski-Bruchem Last Layer) algorithm data for the trainer application.

## Research Summary

### Initial Investigation: SpeedCubeDB

We first investigated [SpeedCubeDB](https://www.speedcubedb.com/a/3x3/ZBLL) as a potential data source.

**Findings:**
- SpeedCubeDB embeds algorithm data directly in client-side JavaScript
- No public API available
- Data structure uses a `searchdata` array for indexing
- Scraping would require navigating 7 subsets × ~72 cases each
- No explicit license for data reuse

**Structure discovered:**
- 7 ZBLL subsets: U, L, T, H, Pi, S, AS (Anti-Sune)
- Each subset has sub-groups (e.g., U1, U2, U3, U4, U5, U6 with 12 cases each)
- Individual case pages contain multiple algorithm variations

### Alternative: BestSiteEver.net (Roman Strakhov)

We discovered that [bestsiteever.net](https://bestsiteever.net) by Roman Strakhov already has a well-structured ZBLL trainer with open-source code.

**GitHub Repository:** [github.com/Roman-/zbll](https://github.com/Roman-/zbll)

**Key findings:**
- Vue.js application with bundled algorithm data
- All data stored as static JSON/JS files
- No external API calls - data is compiled at build time
- **No license specified** (defaults to "all rights reserved")

**Data files found:**
| File | Size | Contents |
|------|------|----------|
| `zbll_map_next.json` | 1.49MB | Main algorithm database |
| `algs_classification.js` | 157KB | Case classifications |
| `zbll_scrambles.js` | 1.3MB | Pre-generated scrambles |

### Decision

We chose to use Roman's data from GitHub because:
1. Already well-structured JSON format
2. Contains multiple algorithm variations per case
3. Includes pre-generated scrambles for practice
4. Open source repository (will request explicit permission before public release)

**Contact info for permission:**
- Telegram: @roman_strakhov
- Email: roman@bestsiteever.net
- GitHub: [Roman-](https://github.com/Roman-)

---

## Data Structure

### Source File

Downloaded from:
```
https://raw.githubusercontent.com/Roman-/zbll/master/src/assets/zbll_map_next.json
```

Local copy: `zbll_data.json` (1.49MB)

### JSON Schema

```json
{
  "H BBFF AsA": {
    "key": "H BBFF AsA",
    "algs": [
      "R U R' U R U' R' U R U' R' U R' U' R2 U' R' U R' U R",
      "F U R' F R F' R U' R' U R' F R F' R U' R' F'",
      ...
    ],
    "scrambles": {
      "15": [
        "R' B U' R' B2 U2 R U2 B R' U B R2 U2 B'",
        "F U2 F' U2 F2 L D F R' F2 R D' L' U F",
        ...
      ]
    }
  }
}
```

**Key format:** `{SET} {SUBSET} {CASE_TYPE}`
- SET: H, U, T, L, Pi, S, aS
- SUBSET: Pattern identifier (e.g., BBFF, LFRF, FFLR)
- CASE_TYPE: Variation (e.g., AsA, AsC, AsO, CsA, CsC, etc.)

### Statistics

| Metric | Count |
|--------|-------|
| Total cases | 472 |
| Total algorithms | 3,084 |
| Total scrambles | 25,975 |

**Cases per ZBLL set:**

| Set | Cases | Algorithms |
|-----|-------|------------|
| U | 72 | 743 |
| T | 72 | 692 |
| L | 72 | 408 |
| Pi | 72 | 386 |
| S | 72 | 368 |
| aS | 72 | 262 |
| H | 40 | 225 |

---

## Database Schema

Data is stored in the `cubing` schema in PostgreSQL (ConnectingServices database).

### Tables

#### `cubing.zbll_cases`

Master table for all ZBLL cases.

```sql
CREATE TABLE cubing.zbll_cases (
    id SERIAL PRIMARY KEY,
    case_key VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "H BBFF AsA"
    zbll_set VARCHAR(10) NOT NULL,          -- H, U, T, L, Pi, S, aS
    subset VARCHAR(20),                      -- e.g., "BBFF"
    case_type VARCHAR(20),                   -- e.g., "AsA", "AsC", "AsO"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zbll_cases_set ON cubing.zbll_cases(zbll_set);
```

#### `cubing.zbll_algorithms`

Multiple algorithms per case, ranked by popularity/efficiency.

```sql
CREATE TABLE cubing.zbll_algorithms (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cubing.zbll_cases(id) ON DELETE CASCADE,
    algorithm TEXT NOT NULL,
    position INTEGER NOT NULL,              -- order/rank (1 = most popular)
    move_count INTEGER,                     -- optional: calculated move count
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zbll_algs_case ON cubing.zbll_algorithms(case_id);
```

#### `cubing.zbll_scrambles`

Pre-generated scrambles for practice sessions.

```sql
CREATE TABLE cubing.zbll_scrambles (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES cubing.zbll_cases(id) ON DELETE CASCADE,
    scramble TEXT NOT NULL,
    move_count INTEGER NOT NULL,            -- scramble length (14, 15, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zbll_scrambles_case ON cubing.zbll_scrambles(case_id);
```

### Relationship to Existing Tables

The `cubing` schema also contains:
- `cubing.solves` - Competition/practice solve reconstructions
- `cubing.zbll_practice` - Practice session tracking (times per case)

---

## Example Queries

### Get all algorithms for a specific case

```sql
SELECT a.position, a.algorithm
FROM cubing.zbll_algorithms a
JOIN cubing.zbll_cases c ON a.case_id = c.id
WHERE c.case_key = 'T BBFF AsA'
ORDER BY a.position;
```

### Get a random scramble for a specific set

```sql
SELECT c.case_key, s.scramble, s.move_count
FROM cubing.zbll_scrambles s
JOIN cubing.zbll_cases c ON s.case_id = c.id
WHERE c.zbll_set = 'T'
ORDER BY RANDOM()
LIMIT 1;
```

### Count algorithms per set

```sql
SELECT c.zbll_set,
       COUNT(DISTINCT c.id) as cases,
       COUNT(a.id) as total_algorithms
FROM cubing.zbll_cases c
JOIN cubing.zbll_algorithms a ON a.case_id = c.id
GROUP BY c.zbll_set
ORDER BY c.zbll_set;
```

### Find cases with the most algorithm variations

```sql
SELECT c.case_key, COUNT(a.id) as alg_count
FROM cubing.zbll_cases c
JOIN cubing.zbll_algorithms a ON a.case_id = c.id
GROUP BY c.case_key
ORDER BY alg_count DESC
LIMIT 10;
```

### Get practice scramble for specific subset

```sql
SELECT c.case_key, c.subset, c.case_type, s.scramble
FROM cubing.zbll_scrambles s
JOIN cubing.zbll_cases c ON s.case_id = c.id
WHERE c.zbll_set = 'U' AND c.subset = 'BFFB'
ORDER BY RANDOM()
LIMIT 1;
```

---

## Data Import Script

Python script used to import the JSON data:

```python
import json
import psycopg2

with open('zbll_data.json', 'r') as f:
    data = json.load(f)

conn = psycopg2.connect(
    host='localhost',
    port=5433,
    user='clayarnold',
    dbname='connectingservices'
)
cur = conn.cursor()

for case_key, case_data in data.items():
    parts = case_key.split()
    zbll_set = parts[0]
    subset = parts[1] if len(parts) > 1 else None
    case_type = parts[2] if len(parts) > 2 else None

    cur.execute("""
        INSERT INTO cubing.zbll_cases (case_key, zbll_set, subset, case_type)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (case_key) DO UPDATE SET zbll_set = EXCLUDED.zbll_set
        RETURNING id
    """, (case_key, zbll_set, subset, case_type))
    case_id = cur.fetchone()[0]

    for pos, alg in enumerate(case_data.get('algs', []), 1):
        cur.execute("""
            INSERT INTO cubing.zbll_algorithms (case_id, algorithm, position)
            VALUES (%s, %s, %s)
        """, (case_id, alg, pos))

    for move_count, scrambles in case_data.get('scrambles', {}).items():
        for scramble in scrambles:
            cur.execute("""
                INSERT INTO cubing.zbll_scrambles (case_id, scramble, move_count)
                VALUES (%s, %s, %s)
            """, (case_id, scramble, int(move_count)))

conn.commit()
conn.close()
```

---

## License Considerations

**Current status:** No explicit license on Roman's repository.

**Before public release:**
1. Contact Roman Strakhov for permission
2. Add attribution in application
3. Consider contributing back improvements

**Algorithms themselves are not copyrightable** - they are mathematical sequences/facts. However, the specific compilation and curation may have thin copyright protection, and the code is copyrighted.

---

## Future Enhancements

1. **Add move count calculation** - Parse algorithms and count HTM/STM/ETM
2. **Algorithm fingerprinting** - Detect duplicate/equivalent algorithms
3. **User algorithm preferences** - Let users mark preferred algorithms per case
4. **Sync with SpeedCubeDB** - Compare and merge algorithm sets
5. **Generate more scrambles** - Use cube simulation to generate additional practice scrambles
