import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Player, Session, Match } from '../types';
import { sessionReducer, type SessionState, type SessionAction } from './useSession';

// Mock the storage module to avoid localStorage issues in tests
vi.mock('../utils/storage', () => ({
  saveSession: vi.fn(),
  loadSession: vi.fn(() => null),
  clearSession: vi.fn(),
  generateId: () => Math.random().toString(36).slice(2),
  saveLocation: vi.fn(),
  updatePlayerStats: vi.fn(),
  getSavedLocations: vi.fn(() => []),
}));

// Mock the supabase module
vi.mock('../utils/supabase', () => ({
  createSessionAndSync: vi.fn(),
  processSyncQueue: vi.fn(),
  getLocalVenue: vi.fn(() => null),
}));

// Helper to create test players
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Test Player',
    skill: null,
    status: 'checked-in',
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    lastPartner: null,
    lockedPartnerId: null,
    courtsPlayed: [],
    checkedInAt: Date.now(),
    lastMatchId: null,
    ...overrides,
  };
}

// Helper to create a test session
function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session-id',
    location: 'Test Location',
    courts: 2,
    gameMode: 'doubles',
    players: [],
    matches: [],
    activeMatches: [],
    startTime: null,
    endTime: null,
    ...overrides,
  };
}

// Helper to create initial state
function createState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    session: createSession(),
    screen: 'setup',
    undoAction: null,
    syncedSessionId: null,
    ...overrides,
  };
}

// Helper to create a match
function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: Math.random().toString(36).slice(2),
    court: 1,
    team1: [],
    team2: [],
    winner: null,
    startTime: Date.now(),
    endTime: null,
    ...overrides,
  };
}

describe('sessionReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RECORD_WINNER', () => {
    it('updates wins correctly for winning team', () => {
      const player1 = createPlayer({ id: 'p1', name: 'Winner1', gamesPlayed: 0, wins: 0 });
      const player2 = createPlayer({ id: 'p2', name: 'Winner2', gamesPlayed: 0, wins: 0 });
      const player3 = createPlayer({ id: 'p3', name: 'Loser1', gamesPlayed: 0, wins: 0 });
      const player4 = createPlayer({ id: 'p4', name: 'Loser2', gamesPlayed: 0, wins: 0 });

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4],
          activeMatches: [match],
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 1 };
      const newState = sessionReducer(state, action);

      // Team 1 should have 1 win each
      const winner1 = newState.session.players.find(p => p.id === 'p1')!;
      const winner2 = newState.session.players.find(p => p.id === 'p2')!;
      expect(winner1.wins).toBe(1);
      expect(winner1.gamesPlayed).toBe(1);
      expect(winner2.wins).toBe(1);
      expect(winner2.gamesPlayed).toBe(1);
    });

    it('updates losses correctly for losing team', () => {
      const player1 = createPlayer({ id: 'p1', name: 'Winner1' });
      const player2 = createPlayer({ id: 'p2', name: 'Winner2' });
      const player3 = createPlayer({ id: 'p3', name: 'Loser1', gamesPlayed: 0, losses: 0 });
      const player4 = createPlayer({ id: 'p4', name: 'Loser2', gamesPlayed: 0, losses: 0 });

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4],
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 1 };
      const newState = sessionReducer(state, action);

      // Team 2 should have 1 loss each
      const loser1 = newState.session.players.find(p => p.id === 'p3')!;
      const loser2 = newState.session.players.find(p => p.id === 'p4')!;
      expect(loser1.losses).toBe(1);
      expect(loser1.gamesPlayed).toBe(1);
      expect(loser2.losses).toBe(1);
      expect(loser2.gamesPlayed).toBe(1);
    });

    it('returns all players to queue after match', () => {
      const player1 = createPlayer({ id: 'p1', status: 'playing' });
      const player2 = createPlayer({ id: 'p2', status: 'playing' });
      const player3 = createPlayer({ id: 'p3', status: 'playing' });
      const player4 = createPlayer({ id: 'p4', status: 'playing' });

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4],
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 1 };
      const newState = sessionReducer(state, action);

      // All players should be back in queue
      newState.session.players.forEach(p => {
        expect(p.status).toBe('checked-in');
      });
    });

    it('moves match from activeMatches to matches', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'playing' }),
        createPlayer({ id: 'p2', status: 'playing' }),
        createPlayer({ id: 'p3', status: 'playing' }),
        createPlayer({ id: 'p4', status: 'playing' }),
      ];

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players,
          activeMatches: [match],
          matches: [],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 2 };
      const newState = sessionReducer(state, action);

      expect(newState.session.activeMatches).toHaveLength(0);
      expect(newState.session.matches).toHaveLength(1);
      expect(newState.session.matches[0].winner).toBe(2);
    });

    it('creates undo action with match data', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'playing' }),
        createPlayer({ id: 'p2', status: 'playing' }),
        createPlayer({ id: 'p3', status: 'playing' }),
        createPlayer({ id: 'p4', status: 'playing' }),
      ];

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players,
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 1 };
      const newState = sessionReducer(state, action);

      expect(newState.undoAction).not.toBeNull();
      expect(newState.undoAction?.type).toBe('winner');
      expect((newState.undoAction?.data as { matchId: string }).matchId).toBe('match1');
    });

    it('handles team 2 winning correctly', () => {
      const players = [
        createPlayer({ id: 'p1', name: 'Team1A', gamesPlayed: 0, wins: 0, losses: 0 }),
        createPlayer({ id: 'p2', name: 'Team1B', gamesPlayed: 0, wins: 0, losses: 0 }),
        createPlayer({ id: 'p3', name: 'Team2A', gamesPlayed: 0, wins: 0, losses: 0 }),
        createPlayer({ id: 'p4', name: 'Team2B', gamesPlayed: 0, wins: 0, losses: 0 }),
      ];

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players,
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 2 };
      const newState = sessionReducer(state, action);

      // Team 2 should have wins
      expect(newState.session.players.find(p => p.id === 'p3')!.wins).toBe(1);
      expect(newState.session.players.find(p => p.id === 'p4')!.wins).toBe(1);
      // Team 1 should have losses
      expect(newState.session.players.find(p => p.id === 'p1')!.losses).toBe(1);
      expect(newState.session.players.find(p => p.id === 'p2')!.losses).toBe(1);
    });
  });

  describe('LOCK_PARTNERS', () => {
    it('sets lockedPartnerId on both players', () => {
      const player1 = createPlayer({ id: 'p1', name: 'Player1' });
      const player2 = createPlayer({ id: 'p2', name: 'Player2' });
      const player3 = createPlayer({ id: 'p3', name: 'Player3' });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3],
        }),
      });

      const action: SessionAction = { type: 'LOCK_PARTNERS', player1Id: 'p1', player2Id: 'p2' };
      const newState = sessionReducer(state, action);

      const updatedP1 = newState.session.players.find(p => p.id === 'p1')!;
      const updatedP2 = newState.session.players.find(p => p.id === 'p2')!;
      const updatedP3 = newState.session.players.find(p => p.id === 'p3')!;

      expect(updatedP1.lockedPartnerId).toBe('p2');
      expect(updatedP2.lockedPartnerId).toBe('p1');
      expect(updatedP3.lockedPartnerId).toBeNull(); // Unaffected
    });
  });

  describe('UNLOCK_PARTNER', () => {
    it('clears lockedPartnerId on both players', () => {
      const player1 = createPlayer({ id: 'p1', lockedPartnerId: 'p2' });
      const player2 = createPlayer({ id: 'p2', lockedPartnerId: 'p1' });
      const player3 = createPlayer({ id: 'p3', lockedPartnerId: null });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3],
        }),
      });

      const action: SessionAction = { type: 'UNLOCK_PARTNER', playerId: 'p1' };
      const newState = sessionReducer(state, action);

      const updatedP1 = newState.session.players.find(p => p.id === 'p1')!;
      const updatedP2 = newState.session.players.find(p => p.id === 'p2')!;

      expect(updatedP1.lockedPartnerId).toBeNull();
      expect(updatedP2.lockedPartnerId).toBeNull();
    });

    it('works when unlocking from either partner', () => {
      const player1 = createPlayer({ id: 'p1', lockedPartnerId: 'p2' });
      const player2 = createPlayer({ id: 'p2', lockedPartnerId: 'p1' });

      const state = createState({
        session: createSession({
          players: [player1, player2],
        }),
      });

      // Unlock from player2's side
      const action: SessionAction = { type: 'UNLOCK_PARTNER', playerId: 'p2' };
      const newState = sessionReducer(state, action);

      expect(newState.session.players.find(p => p.id === 'p1')!.lockedPartnerId).toBeNull();
      expect(newState.session.players.find(p => p.id === 'p2')!.lockedPartnerId).toBeNull();
    });
  });

  describe('CHECK_OUT_PLAYER', () => {
    it('sets player status to left', () => {
      const player = createPlayer({ id: 'p1', status: 'checked-in' });

      const state = createState({
        session: createSession({
          players: [player],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'CHECK_OUT_PLAYER', playerId: 'p1' };
      const newState = sessionReducer(state, action);

      expect(newState.session.players[0].status).toBe('left');
    });
  });

  describe('REMOVE_FROM_COURT', () => {
    it('marks removed player as left', () => {
      const player1 = createPlayer({ id: 'p1', status: 'playing', skill: 2 });
      const player2 = createPlayer({ id: 'p2', status: 'playing' });
      const player3 = createPlayer({ id: 'p3', status: 'playing' });
      const player4 = createPlayer({ id: 'p4', status: 'playing' });
      const substitute = createPlayer({ id: 'sub1', status: 'checked-in', skill: 2 });

      const match = createMatch({
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4, substitute],
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'REMOVE_FROM_COURT', playerId: 'p1', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      expect(newState.session.players.find(p => p.id === 'p1')!.status).toBe('left');
    });

    it('substitutes with player from queue', () => {
      const player1 = createPlayer({ id: 'p1', status: 'playing', skill: 2 });
      const player2 = createPlayer({ id: 'p2', status: 'playing' });
      const player3 = createPlayer({ id: 'p3', status: 'playing' });
      const player4 = createPlayer({ id: 'p4', status: 'playing' });
      const substitute = createPlayer({ id: 'sub1', status: 'checked-in', skill: 2 });

      const match = createMatch({
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4, substitute],
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'REMOVE_FROM_COURT', playerId: 'p1', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      // Substitute should now be playing
      expect(newState.session.players.find(p => p.id === 'sub1')!.status).toBe('playing');

      // Match should have substitute in team1
      const updatedMatch = newState.session.activeMatches.find(m => m.id === 'match1')!;
      expect(updatedMatch.team1).toContain('sub1');
      expect(updatedMatch.team1).not.toContain('p1');
    });

    it('removes match when no substitute available', () => {
      const player1 = createPlayer({ id: 'p1', status: 'playing' });
      const player2 = createPlayer({ id: 'p2', status: 'playing' });
      const player3 = createPlayer({ id: 'p3', status: 'playing' });
      const player4 = createPlayer({ id: 'p4', status: 'playing' });
      // No one in queue to substitute

      const match = createMatch({
        id: 'match1',
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2, player3, player4],
          activeMatches: [match],
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'REMOVE_FROM_COURT', playerId: 'p1', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      // Match should be removed
      expect(newState.session.activeMatches).toHaveLength(0);
    });
  });

  describe('SET_COURTS', () => {
    it('clamps courts between 1 and 10', () => {
      const state = createState();

      // Test lower bound
      let newState = sessionReducer(state, { type: 'SET_COURTS', courts: 0 });
      expect(newState.session.courts).toBe(1);

      // Test upper bound
      newState = sessionReducer(state, { type: 'SET_COURTS', courts: 15 });
      expect(newState.session.courts).toBe(10);

      // Test valid value
      newState = sessionReducer(state, { type: 'SET_COURTS', courts: 5 });
      expect(newState.session.courts).toBe(5);
    });
  });

  describe('UNDO_WINNER', () => {
    it('reverses win/loss stats for all players', () => {
      const players = [
        createPlayer({ id: 'p1', gamesPlayed: 1, wins: 1, losses: 0, status: 'checked-in' }),
        createPlayer({ id: 'p2', gamesPlayed: 1, wins: 1, losses: 0, status: 'checked-in' }),
        createPlayer({ id: 'p3', gamesPlayed: 1, wins: 0, losses: 1, status: 'checked-in' }),
        createPlayer({ id: 'p4', gamesPlayed: 1, wins: 0, losses: 1, status: 'checked-in' }),
      ];

      const completedMatch: Match = {
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        winner: 1,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      };

      const state = createState({
        session: createSession({
          players,
          matches: [completedMatch],
          activeMatches: [],
          startTime: Date.now() - 120000,
        }),
        undoAction: {
          type: 'winner',
          data: { matchId: 'match1', winner: 1, match: completedMatch },
          timestamp: Date.now(),
        },
      });

      const action: SessionAction = { type: 'UNDO_WINNER', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      // Stats should be reversed
      expect(newState.session.players.find(p => p.id === 'p1')!.wins).toBe(0);
      expect(newState.session.players.find(p => p.id === 'p1')!.gamesPlayed).toBe(0);
      expect(newState.session.players.find(p => p.id === 'p3')!.losses).toBe(0);
      expect(newState.session.players.find(p => p.id === 'p3')!.gamesPlayed).toBe(0);
    });

    it('restores match to active and removes from completed', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
        createPlayer({ id: 'p2', status: 'checked-in' }),
        createPlayer({ id: 'p3', status: 'checked-in' }),
        createPlayer({ id: 'p4', status: 'checked-in' }),
      ];

      const completedMatch: Match = {
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        winner: 1,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      };

      const state = createState({
        session: createSession({
          players,
          matches: [completedMatch],
          activeMatches: [],
          startTime: Date.now() - 120000,
        }),
        undoAction: {
          type: 'winner',
          data: { matchId: 'match1', winner: 1, match: completedMatch },
          timestamp: Date.now(),
        },
      });

      const action: SessionAction = { type: 'UNDO_WINNER', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      // Match should be back in active, removed from completed
      expect(newState.session.matches).toHaveLength(0);
      expect(newState.session.activeMatches).toHaveLength(1);
      expect(newState.session.activeMatches[0].winner).toBeNull();
    });

    it('puts players back to playing status', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
        createPlayer({ id: 'p2', status: 'checked-in' }),
        createPlayer({ id: 'p3', status: 'checked-in' }),
        createPlayer({ id: 'p4', status: 'checked-in' }),
      ];

      const completedMatch: Match = {
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        winner: 1,
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      };

      const state = createState({
        session: createSession({
          players,
          matches: [completedMatch],
          activeMatches: [],
          startTime: Date.now() - 120000,
        }),
        undoAction: {
          type: 'winner',
          data: { matchId: 'match1', winner: 1, match: completedMatch },
          timestamp: Date.now(),
        },
      });

      const action: SessionAction = { type: 'UNDO_WINNER', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      // All original players should be back to playing
      ['p1', 'p2', 'p3', 'p4'].forEach(id => {
        expect(newState.session.players.find(p => p.id === id)!.status).toBe('playing');
      });
    });

    it('clears undo action after undo', () => {
      const players = [
        createPlayer({ id: 'p1' }),
        createPlayer({ id: 'p2' }),
        createPlayer({ id: 'p3' }),
        createPlayer({ id: 'p4' }),
      ];

      const completedMatch: Match = {
        id: 'match1',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
        winner: 1,
        startTime: Date.now(),
        endTime: Date.now(),
      };

      const state = createState({
        session: createSession({
          players,
          matches: [completedMatch],
          startTime: Date.now(),
        }),
        undoAction: {
          type: 'winner',
          data: { matchId: 'match1', winner: 1, match: completedMatch },
          timestamp: Date.now(),
        },
      });

      const action: SessionAction = { type: 'UNDO_WINNER', matchId: 'match1' };
      const newState = sessionReducer(state, action);

      expect(newState.undoAction).toBeNull();
    });
  });

  describe('START_SESSION', () => {
    it('sets startTime', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
        createPlayer({ id: 'p2', status: 'checked-in' }),
        createPlayer({ id: 'p3', status: 'checked-in' }),
        createPlayer({ id: 'p4', status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({
          players,
          startTime: null,
        }),
      });

      const before = Date.now();
      const action: SessionAction = { type: 'START_SESSION' };
      const newState = sessionReducer(state, action);
      const after = Date.now();

      expect(newState.session.startTime).toBeGreaterThanOrEqual(before);
      expect(newState.session.startTime).toBeLessThanOrEqual(after);
    });

    it('changes screen to play', () => {
      const players = [
        createPlayer({ status: 'checked-in' }),
        createPlayer({ status: 'checked-in' }),
        createPlayer({ status: 'checked-in' }),
        createPlayer({ status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({ players }),
        screen: 'setup',
      });

      const action: SessionAction = { type: 'START_SESSION' };
      const newState = sessionReducer(state, action);

      expect(newState.screen).toBe('play');
    });
  });

  describe('END_SESSION', () => {
    it('sets endTime', () => {
      const state = createState({
        session: createSession({
          startTime: Date.now() - 60000,
        }),
        screen: 'play',
      });

      const before = Date.now();
      const action: SessionAction = { type: 'END_SESSION' };
      const newState = sessionReducer(state, action);
      const after = Date.now();

      expect(newState.session.endTime).toBeGreaterThanOrEqual(before);
      expect(newState.session.endTime).toBeLessThanOrEqual(after);
    });

    it('changes screen to leaderboard', () => {
      const state = createState({
        session: createSession({
          startTime: Date.now() - 60000,
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'END_SESSION' };
      const newState = sessionReducer(state, action);

      expect(newState.screen).toBe('leaderboard');
    });
  });

  describe('FILL_COURT - lastPartner tracking', () => {
    it('sets lastPartner to teammate for doubles', () => {
      // 4 players in queue, all checked in
      const players = [
        createPlayer({ id: 'p1', name: 'Player1', status: 'checked-in' }),
        createPlayer({ id: 'p2', name: 'Player2', status: 'checked-in' }),
        createPlayer({ id: 'p3', name: 'Player3', status: 'checked-in' }),
        createPlayer({ id: 'p4', name: 'Player4', status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'doubles',
          courts: 1,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      // Should have created a match
      expect(newState.session.activeMatches).toHaveLength(1);
      const match = newState.session.activeMatches[0];

      // Get team assignments
      const team1Player1 = newState.session.players.find(p => p.id === match.team1[0])!;
      const team1Player2 = newState.session.players.find(p => p.id === match.team1[1])!;
      const team2Player1 = newState.session.players.find(p => p.id === match.team2[0])!;
      const team2Player2 = newState.session.players.find(p => p.id === match.team2[1])!;

      // Team 1 players should have each other as lastPartner
      expect(team1Player1.lastPartner).toBe(team1Player2.id);
      expect(team1Player2.lastPartner).toBe(team1Player1.id);

      // Team 2 players should have each other as lastPartner
      expect(team2Player1.lastPartner).toBe(team2Player2.id);
      expect(team2Player2.lastPartner).toBe(team2Player1.id);
    });

    it('sets lastPartner to null for singles', () => {
      const players = [
        createPlayer({ id: 'p1', name: 'Player1', status: 'checked-in' }),
        createPlayer({ id: 'p2', name: 'Player2', status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'singles',
          courts: 1,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      // Should have created a match
      expect(newState.session.activeMatches).toHaveLength(1);

      // In singles, there's no partner, so lastPartner should be null
      const playingPlayers = newState.session.players.filter(p => p.status === 'playing');
      playingPlayers.forEach(p => {
        expect(p.lastPartner).toBeNull();
      });
    });

    it('updates courtsPlayed when filling court', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in', courtsPlayed: [] }),
        createPlayer({ id: 'p2', status: 'checked-in', courtsPlayed: [] }),
        createPlayer({ id: 'p3', status: 'checked-in', courtsPlayed: [] }),
        createPlayer({ id: 'p4', status: 'checked-in', courtsPlayed: [] }),
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'doubles',
          courts: 2,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 2 };
      const newState = sessionReducer(state, action);

      // All playing players should have court 2 in their courtsPlayed
      const playingPlayers = newState.session.players.filter(p => p.status === 'playing');
      expect(playingPlayers).toHaveLength(4);
      playingPlayers.forEach(p => {
        expect(p.courtsPlayed).toContain(2);
      });
    });
  });

  describe('Singles mode', () => {
    it('RECORD_WINNER works with 2 players in singles', () => {
      const player1 = createPlayer({ id: 'p1', name: 'SinglesP1', status: 'playing' });
      const player2 = createPlayer({ id: 'p2', name: 'SinglesP2', status: 'playing' });

      const match = createMatch({
        id: 'match1',
        team1: ['p1'],  // Singles: 1 player per team
        team2: ['p2'],
      });

      const state = createState({
        session: createSession({
          players: [player1, player2],
          activeMatches: [match],
          gameMode: 'singles',
          startTime: Date.now(),
        }),
      });

      const action: SessionAction = { type: 'RECORD_WINNER', matchId: 'match1', winner: 1 };
      const newState = sessionReducer(state, action);

      // Player 1 should have 1 win
      expect(newState.session.players.find(p => p.id === 'p1')!.wins).toBe(1);
      expect(newState.session.players.find(p => p.id === 'p1')!.gamesPlayed).toBe(1);

      // Player 2 should have 1 loss
      expect(newState.session.players.find(p => p.id === 'p2')!.losses).toBe(1);
      expect(newState.session.players.find(p => p.id === 'p2')!.gamesPlayed).toBe(1);
    });

    it('FILL_COURT creates match with 2 players for singles', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
        createPlayer({ id: 'p2', status: 'checked-in' }),
        createPlayer({ id: 'p3', status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'singles',
          courts: 1,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      expect(newState.session.activeMatches).toHaveLength(1);
      const match = newState.session.activeMatches[0];

      // Singles match should have 1 player per team
      expect(match.team1).toHaveLength(1);
      expect(match.team2).toHaveLength(1);

      // Only 2 players should be playing
      const playingPlayers = newState.session.players.filter(p => p.status === 'playing');
      expect(playingPlayers).toHaveLength(2);

      // 1 player should still be in queue
      const queuedPlayers = newState.session.players.filter(p => p.status === 'checked-in');
      expect(queuedPlayers).toHaveLength(1);
    });

    it('does not create match with only 1 player in singles', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'singles',
          courts: 1,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      // Should not create a match with only 1 player
      expect(newState.session.activeMatches).toHaveLength(0);
    });
  });

  describe('FILL_COURT edge cases', () => {
    it('does not fill already occupied court', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'playing' }),
        createPlayer({ id: 'p2', status: 'playing' }),
        createPlayer({ id: 'p3', status: 'playing' }),
        createPlayer({ id: 'p4', status: 'playing' }),
        createPlayer({ id: 'p5', status: 'checked-in' }),
        createPlayer({ id: 'p6', status: 'checked-in' }),
        createPlayer({ id: 'p7', status: 'checked-in' }),
        createPlayer({ id: 'p8', status: 'checked-in' }),
      ];

      const existingMatch = createMatch({
        id: 'existing',
        court: 1,
        team1: ['p1', 'p2'],
        team2: ['p3', 'p4'],
      });

      const state = createState({
        session: createSession({
          players,
          activeMatches: [existingMatch],
          gameMode: 'doubles',
          courts: 2,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      // Try to fill court 1 which is already occupied
      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      // Should still have only 1 match
      expect(newState.session.activeMatches).toHaveLength(1);
      expect(newState.session.activeMatches[0].id).toBe('existing');
    });

    it('does not create match without enough players', () => {
      const players = [
        createPlayer({ id: 'p1', status: 'checked-in' }),
        createPlayer({ id: 'p2', status: 'checked-in' }),
        createPlayer({ id: 'p3', status: 'checked-in' }),
        // Only 3 players - need 4 for doubles
      ];

      const state = createState({
        session: createSession({
          players,
          gameMode: 'doubles',
          courts: 1,
          startTime: Date.now(),
        }),
        screen: 'play',
      });

      const action: SessionAction = { type: 'FILL_COURT', court: 1 };
      const newState = sessionReducer(state, action);

      // Should not create a match
      expect(newState.session.activeMatches).toHaveLength(0);
    });
  });
});
