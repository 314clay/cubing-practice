# ZBLL Stats Scraper

Automated tools to track your ZBLL practice from [bestsiteever.net/zbll](https://bestsiteever.net/zbll/#/timer).

## Quick Start (Automated)

### 1. Start the receiver server

```bash
cd scripts/zbll-scraper
npm run server
```

### 2. Install the Chrome extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 3. Practice!

Now when you practice on bestsiteever.net/zbll:
- Stats sync automatically every 5 minutes
- Stats sync when you close/leave the tab
- Stats sync on page load

Data saves to `scripts/zbll-scraper/data/zbll-stats-latest.json`

---

## Auto-Start Server on Mac

To have the server run automatically:

```bash
# Copy the launchd plist
cp com.zbll-stats.server.plist ~/Library/LaunchAgents/

# Edit the plist to fix the node path if needed
# Check your node path with: which node

# Load and start
launchctl load ~/Library/LaunchAgents/com.zbll-stats.server.plist

# To stop:
launchctl unload ~/Library/LaunchAgents/com.zbll-stats.server.plist
```

---

## Data Structure

Each solve in `zbll_stats_array`:
```json
{
  "i": 0,
  "key": "T-1-3",
  "scramble": "R U R' U' ...",
  "ms": 2340
}
```

| Field | Description |
|-------|-------------|
| `i` | Solve index |
| `key` | Case ID: `{Set}-{Subcategory}-{Case}` |
| `scramble` | The scramble used |
| `ms` | Solve time in milliseconds |

---

## Analyze Your Stats

```bash
node analyze.js data/zbll-stats-latest.json
```

Output includes:
- Overall stats (avg, best, worst, ao5, ao12)
- Stats by ZBLL set (T, U, L, H, Pi, S, AS)
- Weakest cases (slowest averages)
- Strongest cases (fastest averages)
- Progress over time

---

## Manual Export Options

### Browser Console (one-time)

```javascript
const stats = JSON.parse(localStorage.getItem('zbll_stats_array') || '[]');
const blob = new Blob([JSON.stringify({stats}, null, 2)], {type: 'application/json'});
const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
a.download = 'zbll-stats.json'; a.click();
```

### Bookmarklet

Create a bookmark with this URL (from `bookmarklet.js`):
```javascript
javascript:(function(){const stats=JSON.parse(localStorage.getItem('zbll_stats_array')||'[]');const store=JSON.parse(localStorage.getItem('zbll_store')||'{}');const data={stats,store,exportedAt:new Date().toISOString(),totalSolves:stats.length};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='zbll-stats-'+new Date().toISOString().split('T')[0]+'.json';a.click();alert('Exported '+stats.length+' solves!')})();
```

---

## API Endpoints

When the server is running:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/zbll-stats` | POST | Receive stats from extension |
| `/zbll-stats` | GET | Get latest stats |
| `/health` | GET | Health check |

---

## Files

```
zbll-scraper/
├── server.js              # Receiver server
├── analyze.js             # Stats analyzer
├── scrape.js              # Puppeteer scraper (manual)
├── bookmarklet.js         # One-click export
├── com.zbll-stats.server.plist  # macOS auto-start
├── chrome-extension/
│   ├── manifest.json
│   ├── content.js         # Auto-sync script
│   └── background.js
└── data/
    ├── zbll-stats-latest.json
    └── history/           # Timestamped backups
```
