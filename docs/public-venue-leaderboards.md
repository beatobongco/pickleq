# Future Feature: Public Venue Leaderboards

## Problem
The app runs on staff's device (tablet at front desk). Players never touch the app directly, so they can't share their own stats. Current sharing implementation requires staff to manually share each player's stats - not practical.

## Solution: Public Venue Leaderboard URLs
Each venue gets a public URL like `pickleq.app/venue/manila-pickleball-club` that players can access from their own phones to view and share their stats.

## User Flow

### Staff Flow (existing app)
1. Staff sets up venue with a unique slug (one-time setup)
2. Staff runs sessions as normal
3. At session end, stats automatically sync to Supabase
4. No change to staff workflow

### Player Flow (new)
1. Player sees venue URL posted at the gym (sign, QR code, etc.)
2. Player visits URL on their phone anytime
3. Player finds their name in the leaderboard
4. Player taps their row → generates shareable stats card
5. Player shares to social media directly from their phone

## Architecture

### Supabase Tables

```sql
-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- e.g., "manila-pickleball-club"
  name TEXT NOT NULL,                   -- Display name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table (venue-scoped lifetime stats)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  skill INTEGER,                        -- 1, 2, 3, or NULL
  lifetime_wins INTEGER DEFAULT 0,
  lifetime_losses INTEGER DEFAULT 0,
  lifetime_games INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, name)                -- Same name per venue = same player
);

-- Sessions table (for shareable session links)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  location TEXT,
  courts INTEGER,
  total_games INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session players table (per-session stats for sharing)
CREATE TABLE session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  skill INTEGER,                        -- 1, 2, 3, or NULL
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Public read session_players" ON session_players FOR SELECT USING (true);
CREATE POLICY "Anon insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert session_players" ON session_players FOR INSERT WITH CHECK (true);
```

### New Files to Create

| File | Purpose |
|------|---------|
| `src/utils/supabase.ts` | Supabase client + sync functions |
| `src/screens/VenueSetupScreen.tsx` | One-time venue slug configuration |
| `src/screens/PublicLeaderboardScreen.tsx` | Public-facing leaderboard (no auth) |

### Modified Files

| File | Changes |
|------|---------|
| `src/store/useSession.ts` | Add sync to Supabase on session end |
| `src/screens/SetupScreen.tsx` | Add venue settings link |
| `src/App.tsx` | Add route for `/venue/:slug` |
| `src/types/index.ts` | Add Venue type |

## Implementation Steps

### Phase 1: Supabase Setup
1. Create Supabase project
2. Create venues and players tables
3. Set up Row Level Security (RLS) - public read, authenticated write
4. Install `@supabase/supabase-js`

### Phase 2: Venue Configuration
5. Create VenueSetupScreen with slug input + validation
6. Store venue config in localStorage + Supabase
7. Add "Venue Settings" link to SetupScreen header

### Phase 3: Sync Logic
8. Create `syncSessionToSupabase()` function
9. Call sync at session end (after localStorage save)
10. Handle offline gracefully - queue for retry

### Phase 4: Public Leaderboard
11. Create PublicLeaderboardScreen (read-only, no auth)
12. Fetch players by venue slug from Supabase
13. Reuse existing leaderboard UI components
14. Add share button that generates PlayerStatsCard

### Phase 5: Routing
15. Add `/venue/:slug` route to App.tsx
16. Detect if URL has slug → show public leaderboard
17. Otherwise → show normal staff app

## Key Decisions

- **No player accounts**: Players are identified by name within a venue
- **Name matching**: Same name at same venue = same player (simple, may have edge cases)
- **Public read**: Anyone with the URL can view the leaderboard
- **Staff write**: Only the staff app can update stats (via anon key with RLS)
- **Offline-first**: Staff app works offline, syncs when online

## Cost Estimate (Supabase Free Tier)
- 500MB database storage
- 2GB bandwidth
- 50,000 monthly active users
- Should easily cover dozens of venues with thousands of players

## Future Enhancements (not in initial scope)
- QR code generator for venue URL
- Session history view
- Head-to-head records between players
- Weekly/monthly leaderboards
- Player profile pages with detailed stats

---

# Deployment: GitHub Pages + Custom Domain

## Infrastructure Cost

| What | Cost | Purpose |
|------|------|---------|
| GitHub Pages | Free | Host the static React app |
| Supabase | Free tier | Database for venue leaderboards |
| Domain | ~$12/year | `pickleq.app` or similar |

**Total: ~$12/year**

## Architecture

```
pickleq.app (GitHub Pages)
    │
    ├── /                    → Staff app (offline-capable, localStorage)
    │
    └── /venue/:slug         → Public leaderboard (fetches from Supabase)
```

## GitHub Pages Setup

### 1. Build Configuration

Add to `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/',  // Use custom domain, not /repo-name/
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
```

### 2. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### 3. SPA Routing Fix

GitHub Pages returns 404 for client-side routes. Fix with `public/404.html`:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>PickleQ</title>
    <script>
      // Redirect to index.html with the path as a query param
      const path = window.location.pathname;
      window.location.replace('/' + '?p=' + encodeURIComponent(path));
    </script>
  </head>
  <body></body>
</html>
```

And handle in `main.tsx`:
```typescript
// Handle GitHub Pages SPA redirect
const params = new URLSearchParams(window.location.search);
const redirectPath = params.get('p');
if (redirectPath) {
  window.history.replaceState(null, '', redirectPath);
}
```

### 4. Custom Domain

Create `public/CNAME`:
```
pickleq.app
```

### 5. DNS Configuration

At your domain registrar, add:
```
Type: A
Name: @
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153

Type: CNAME
Name: www
Value: <username>.github.io
```

## Environment Variables

For Supabase credentials, use GitHub Secrets + Vite env:

1. Add secrets in GitHub repo settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Update workflow to inject:
```yaml
- run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

3. Access in code:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## Supabase Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);

-- Anon insert/update (staff app uses anon key)
CREATE POLICY "Anon insert venues" ON venues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon upsert players" ON players FOR ALL USING (true);
```

## Deployment Checklist

- [ ] Create Supabase project
- [ ] Run SQL to create tables + RLS policies
- [ ] Copy Supabase URL and anon key
- [ ] Add secrets to GitHub repo
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Create `public/404.html` for SPA routing
- [ ] Create `public/CNAME` with domain
- [ ] Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
- [ ] Buy domain and configure DNS
- [ ] Wait for DNS propagation (~10 min to 24 hours)
- [ ] Enable HTTPS in GitHub Pages settings
