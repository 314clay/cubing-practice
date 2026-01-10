# Troubleshooting

## Slow Page Loads (30+ seconds)

### Symptoms
- Stats page or other pages take 30+ seconds to load
- API endpoints return HTTP 500 errors
- All endpoints are uniformly slow (not just database-heavy ones)

### Diagnosis

Check what's listening on port 11000:
```bash
lsof -i :11000 -P
```

Test if the issue is the server or DNS resolution:
```bash
# Fast = server is fine, slow = server problem
curl -s -o /dev/null -w "Time: %{time_total}s\n" http://127.0.0.1:11000/api/health

# If localhost is slow but 127.0.0.1 is fast, it's DNS resolution
curl -s -o /dev/null -w "Time: %{time_total}s\n" http://localhost:11000/api/health
```

### Common Causes

#### 1. Stale/Zombie Server Process
A previous server process may be holding the port in a broken state.

**Fix:**
```bash
# Kill all node processes related to this project
pkill -f "node.*cubing-practice"

# Or kill by specific PID from lsof output
kill <PID>

# Restart the server
npm run dev
```

#### 2. IPv6 Resolution Issues
If `localhost` is slow but `127.0.0.1` is fast, the system is trying IPv6 first and timing out.

**Fix:** Use `127.0.0.1` instead of `localhost` in browser, or ensure the server binds to all interfaces.

### Prevention

- If the app suddenly becomes slow, first check for stale processes
- Use `nodemon` for development to auto-restart on crashes
- Monitor the terminal for server errors during development
