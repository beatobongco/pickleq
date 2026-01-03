export type PlayerStatus = 'not-here' | 'checked-in' | 'playing' | 'left';
export type SkillLevel = 1 | 2 | 3 | null;
export type GameMode = 'doubles' | 'singles';

export interface Player {
  id: string;
  name: string;
  skill: SkillLevel;
  status: PlayerStatus;
  gamesPlayed: number;
  wins: number;
  losses: number;
  lastPartner: string | null;
  lockedPartnerId: string | null;
  courtsPlayed: number[];
  checkedInAt: number | null;
  lastMatchId: string | null; // ID of most recent match for variety in matching
}

export interface Match {
  id: string;
  court: number;
  team1: string[]; // 2 players for doubles, 1 for singles
  team2: string[]; // 2 players for doubles, 1 for singles
  winner: 1 | 2 | null;
  startTime: number;
  endTime: number | null;
}

export interface Session {
  id: string;
  location: string;
  courts: number;
  gameMode: GameMode;
  players: Player[];
  matches: Match[];
  activeMatches: Match[];
  startTime: number | null;
  endTime: number | null;
}

export type AppScreen = 'setup' | 'play' | 'leaderboard' | 'global-leaderboard' | 'players' | 'venue-setup';

export interface UndoAction {
  type: 'winner' | 'checkin' | 'checkout' | 'remove';
  data: unknown;
  timestamp: number;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  passwordHash?: string;
}

export interface VenuePlayer {
  id: string;
  venueId: string;
  name: string;
  skill: SkillLevel;
  lifetimeWins: number;
  lifetimeLosses: number;
  lifetimeGames: number;
  lastPlayedAt: string | null;
}

// Session types for shareable session URLs
export interface VenueSession {
  id: string;
  venueId: string;
  location: string;
  courts: number;
  totalGames: number;
  startedAt: string | null;
  endedAt: string;
}

export interface SessionPlayer {
  id: string;
  sessionId: string;
  playerName: string;
  skill: SkillLevel;
  wins: number;
  losses: number;
  gamesPlayed: number;
}
