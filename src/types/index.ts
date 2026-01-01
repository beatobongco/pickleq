export type PlayerStatus = 'not-here' | 'checked-in' | 'playing' | 'left';
export type SkillLevel = 1 | 2 | 3 | null;

export interface Player {
  id: string;
  name: string;
  skill: SkillLevel;
  status: PlayerStatus;
  gamesPlayed: number;
  wins: number;
  losses: number;
  lastPartner: string | null;
  courtsPlayed: number[];
  checkedInAt: number | null;
}

export interface Match {
  id: string;
  court: number;
  team1: [string, string];
  team2: [string, string];
  winner: 1 | 2 | null;
  startTime: number;
  endTime: number | null;
}

export interface Session {
  id: string;
  location: string;
  courts: number;
  players: Player[];
  matches: Match[];
  activeMatches: Match[];
  startTime: number | null;
  endTime: number | null;
}

export type AppScreen = 'setup' | 'play' | 'leaderboard' | 'global-leaderboard' | 'players';

export interface UndoAction {
  type: 'winner' | 'checkin' | 'checkout' | 'remove';
  data: unknown;
  timestamp: number;
}
