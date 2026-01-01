# PickleQ Authentication & Cloud Persistence Plan

## Overview

Add optional authentication to PickleQ, allowing users to either:
1. **Guest Mode** (current behavior) - Data stored in localStorage, single device only
2. **Logged In Mode** - Data synced to cloud, accessible across devices

## Recommended Stack

**Supabase** - Open-source Firebase alternative
- Built-in authentication (email/password, Google, etc.)
- PostgreSQL database
- Real-time subscriptions
- Generous free tier (50K monthly active users, 500MB database)
- Great TypeScript support

## User Flow

```
App Launch
    │
    ├─► Has saved auth token? ─► Yes ─► Auto-login ─► Cloud Mode
    │
    └─► No ─► Show welcome screen
                    │
                    ├─► "Continue as Guest" ─► localStorage Mode (current)
                    │
                    └─► "Sign In / Sign Up" ─► Auth flow ─► Cloud Mode
```

## Data Model

### Supabase Tables

```sql
-- Users (handled by Supabase Auth)

-- Organizations (optional, for shared access)
organizations (
  id uuid primary key,
  name text,
  created_at timestamp
)

-- Players (cloud version of SavedPlayer)
players (
  id uuid primary key,
  user_id uuid references auth.users,
  org_id uuid references organizations (nullable),
  name text,
  skill int (1-3 or null),
  lifetime_wins int,
  lifetime_losses int,
  lifetime_games int,
  last_played timestamp,
  created_at timestamp
)

-- Locations
locations (
  id uuid primary key,
  user_id uuid references auth.users,
  name text,
  courts int,
  created_at timestamp
)

-- Sessions (for history/analytics)
sessions (
  id uuid primary key,
  user_id uuid references auth.users,
  location_id uuid references locations,
  courts int,
  start_time timestamp,
  end_time timestamp,
  created_at timestamp
)

-- Matches
matches (
  id uuid primary key,
  session_id uuid references sessions,
  court int,
  team1_player1 uuid references players,
  team1_player2 uuid references players,
  team2_player1 uuid references players,
  team2_player2 uuid references players,
  winner int (1 or 2),
  start_time timestamp,
  end_time timestamp
)
```

## Implementation Phases

### Phase 1: Supabase Setup
1. Create Supabase project
2. Install `@supabase/supabase-js`
3. Create database tables with migrations
4. Set up Row Level Security (RLS) policies
5. Create `src/lib/supabase.ts` client

### Phase 2: Auth Context
1. Create `src/store/useAuth.ts` context
   - `user` - current user or null
   - `isGuest` - boolean for guest mode
   - `signIn(email, password)`
   - `signUp(email, password)`
   - `signInWithGoogle()`
   - `signOut()`
   - `continueAsGuest()`

2. Create `src/screens/WelcomeScreen.tsx`
   - App logo/branding
   - "Sign In" button
   - "Create Account" button
   - "Continue as Guest" button

3. Create `src/screens/AuthScreen.tsx`
   - Email/password form
   - Google sign-in button
   - Toggle between sign in/sign up

### Phase 3: Storage Abstraction
1. Create `src/utils/dataService.ts` - unified interface
   ```typescript
   interface DataService {
     // Players
     getPlayers(): Promise<SavedPlayer[]>
     savePlayer(player: SavedPlayer): Promise<void>
     updatePlayer(id: string, updates: Partial<SavedPlayer>): Promise<void>
     deletePlayer(id: string): Promise<void>

     // Locations
     getLocations(): Promise<SavedLocation[]>
     saveLocation(location: SavedLocation): Promise<void>

     // Sessions
     saveSession(session: Session): Promise<void>
     getSessionHistory(): Promise<Session[]>
   }
   ```

2. Create two implementations:
   - `src/utils/localDataService.ts` - wraps current localStorage functions
   - `src/utils/supabaseDataService.ts` - Supabase queries

3. Create `src/store/useDataService.ts` hook
   - Returns appropriate service based on auth state
   - Handles loading states and errors

### Phase 4: Migrate Components
1. Update `useSession.ts` to use DataService
2. Update `PlayersScreen.tsx` to use DataService
3. Update `GlobalLeaderboardScreen.tsx` to use DataService
4. Update `PlayerPicker.tsx` to use DataService

### Phase 5: Sync & Migration
1. Add "Link Account" option for guests
   - Migrate localStorage data to cloud on first login
2. Add offline support
   - Queue changes when offline
   - Sync when back online
3. Add account settings screen
   - Change password
   - Delete account
   - Export data

## File Structure

```
src/
├── lib/
│   └── supabase.ts              # Supabase client
├── store/
│   ├── useAuth.ts               # Auth context
│   ├── useDataService.ts        # Data service hook
│   └── useSession.ts            # (existing, updated)
├── utils/
│   ├── storage.ts               # (existing localStorage)
│   ├── dataService.ts           # Interface definition
│   ├── localDataService.ts      # localStorage implementation
│   └── supabaseDataService.ts   # Supabase implementation
├── screens/
│   ├── WelcomeScreen.tsx        # New - mode selection
│   ├── AuthScreen.tsx           # New - sign in/up
│   └── ...existing screens
└── types/
    └── index.ts                 # Add User type
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Users can only read/write their own data
   - Org members can read shared org data

2. **API Keys**
   - Only anon key exposed to client
   - Service key stays server-side only

3. **Auth Tokens**
   - Stored securely by Supabase
   - Auto-refresh handled by SDK

## Future Enhancements

1. **Organizations/Teams**
   - Multiple staff can manage same player pool
   - Shared locations and history

2. **Player Self-Registration**
   - QR code to join session
   - Players manage own profiles

3. **Analytics Dashboard**
   - Session history
   - Player statistics over time
   - Peak hours analysis

4. **Real-time Sync**
   - Multiple tablets managing same session
   - Live leaderboard display

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Supabase Setup | 2-3 hours |
| Phase 2: Auth Context | 3-4 hours |
| Phase 3: Storage Abstraction | 3-4 hours |
| Phase 4: Migrate Components | 2-3 hours |
| Phase 5: Sync & Migration | 4-5 hours |
| **Total** | **14-19 hours** |
