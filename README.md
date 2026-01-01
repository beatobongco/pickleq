# PickleQ

The free, easy-to-use app for managing pickleball open play sessions. Handle check-ins, match players by skill, and keep courts rotating smoothly.

## Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| Fair player rotation | Fewest games played = next up |
| Skill-based matching | High+Low vs High+Low team balancing |
| Multi-court support | 1-10 courts |
| Track wins/losses | Per-session + lifetime stats |
| Shareable results | Public URLs + downloadable stats cards |
| QR codes | Players scan to view/share their own stats |
| Works offline | localStorage-first, syncs when online |
| Multi-device sync | Venue password system + cloud sync |
| Zero signup friction | Staff can start immediately |

### Delight Features

- Voice announcements for matches and winners
- 10-second undo for accidental winner taps
- Auto-substitute when someone leaves mid-match
- Players waiting too long get flagged (yellow alert)
- One-tap sharing with generated stats cards

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Storage**: localStorage + Supabase (PostgreSQL)
- **Build**: Vite
- **Deployment**: GitHub Pages

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

For cloud sync features, add these to your environment:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Without these, the app works fully offline with localStorage.

## Supabase Setup

If using cloud sync, create these tables:

```sql
-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  skill INTEGER,
  lifetime_wins INTEGER DEFAULT 0,
  lifetime_losses INTEGER DEFAULT 0,
  lifetime_games INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, name)
);

-- Locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  courts INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, name)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  location TEXT,
  courts INTEGER,
  total_games INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Session players table
CREATE TABLE session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  player_name TEXT NOT NULL,
  skill INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0
);

-- Atomic stats update function (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_player_stats(
  p_venue_id UUID,
  p_name TEXT,
  p_skill INTEGER,
  p_wins INTEGER,
  p_losses INTEGER,
  p_games INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO players (venue_id, name, skill, lifetime_wins, lifetime_losses, lifetime_games, last_played_at)
  VALUES (p_venue_id, p_name, p_skill, p_wins, p_losses, p_games, NOW())
  ON CONFLICT (venue_id, name)
  DO UPDATE SET
    skill = COALESCE(EXCLUDED.skill, players.skill),
    lifetime_wins = players.lifetime_wins + EXCLUDED.lifetime_wins,
    lifetime_losses = players.lifetime_losses + EXCLUDED.lifetime_losses,
    lifetime_games = players.lifetime_games + EXCLUDED.lifetime_games,
    last_played_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

## User Flows

### Staff Workflow

1. **Setup**: Add location, set court count, add players with skill levels
2. **Start Play**: Courts auto-fill with balanced teams
3. **During Session**: Tap winner when game ends, next 4 auto-assigned
4. **End Session**: View leaderboard, players scan QR to share their stats

### Player Workflow

1. See QR code at end of session (or posted at venue)
2. Scan with phone camera
3. Find name in leaderboard
4. Tap to generate shareable stats card

## Project Structure

```
src/
├── App.tsx                 # Routing + landing page logic
├── types/index.ts          # TypeScript interfaces
├── store/useSession.tsx    # Session state management
├── utils/
│   ├── matching.ts         # Player matching algorithm
│   ├── storage.ts          # localStorage helpers
│   ├── supabase.ts         # Cloud sync
│   └── speech.ts           # Voice announcements
├── components/
│   ├── Button.tsx
│   ├── PlayerCard.tsx
│   ├── CourtCard.tsx
│   ├── QRCode.tsx
│   └── ...
└── screens/
    ├── LandingScreen.tsx       # Marketing/onboarding
    ├── SetupScreen.tsx         # Pre-session setup
    ├── PlayScreen.tsx          # Active play management
    ├── LeaderboardScreen.tsx   # Post-session results
    ├── VenueSetupScreen.tsx    # Cloud sync config
    ├── PublicLeaderboardScreen.tsx  # Public venue stats
    └── PublicSessionScreen.tsx      # Shareable session results
```

## Future Enhancements

Nice-to-haves not yet implemented:

- Session history view
- CSV import/export for player rosters
- Player photos/avatars
- Analytics and performance trends
- Tournament/bracket mode

## License

MIT

---

Made for the pickleball community by [Beato Bongco](https://beatobongco.com).
