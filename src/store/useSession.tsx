/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, Player, Match, AppScreen, SkillLevel, UndoAction, GameMode } from '../types';
import { saveSession, loadSession, clearSession, generateId, saveLocation, updatePlayerStats, getSavedLocations } from '../utils/storage';
import { selectNextPlayers, formTeams, createMatch, findSubstitute } from '../utils/matching';
import { createSessionAndSync, processSyncQueue, getLocalVenue } from '../utils/supabase';

// Exported for testing
export interface SessionState {
  session: Session;
  screen: AppScreen;
  undoAction: UndoAction | null;
  syncedSessionId: string | null;
}

// Exported for testing
export type SessionAction =
  | { type: 'LOAD_SESSION'; session: Session }
  | { type: 'SET_LOCATION'; location: string }
  | { type: 'SET_COURTS'; courts: number }
  | { type: 'SET_GAME_MODE'; gameMode: GameMode }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'ADD_PLAYER_WITH_SKILL'; name: string; skill: SkillLevel }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'SET_PLAYER_SKILL'; playerId: string; skill: SkillLevel }
  | { type: 'CHECK_IN_PLAYER'; playerId: string }
  | { type: 'CHECK_OUT_PLAYER'; playerId: string }
  | { type: 'START_SESSION' }
  | { type: 'END_SESSION' }
  | { type: 'RECORD_WINNER'; matchId: string; winner: 1 | 2 }
  | { type: 'REMOVE_FROM_COURT'; playerId: string; matchId: string }
  | { type: 'SET_SCREEN'; screen: AppScreen }
  | { type: 'SET_UNDO'; action: UndoAction | null }
  | { type: 'UNDO_WINNER'; matchId: string }
  | { type: 'NEW_SESSION' }
  | { type: 'FILL_COURTS' }
  | { type: 'FILL_COURT'; court: number }
  | { type: 'SET_SYNCED_SESSION_ID'; sessionId: string | null }
  | { type: 'LOCK_PARTNERS'; player1Id: string; player2Id: string }
  | { type: 'UNLOCK_PARTNER'; playerId: string };

// Exported for testing
export function createInitialSession(): Session {
  const savedLocations = getSavedLocations();
  const lastLocation = savedLocations[0];

  return {
    id: generateId(),
    location: lastLocation?.name ?? '',
    courts: lastLocation?.courts ?? 4,
    gameMode: 'doubles',
    players: [],
    matches: [],
    activeMatches: [],
    startTime: null,
    endTime: null,
  };
}

function getCheckedInQueue(players: Player[]): Player[] {
  return players.filter(p => p.status === 'checked-in');
}

function fillSingleCourt(state: SessionState, court: number): SessionState {
  const { session } = state;
  const queue = getCheckedInQueue(session.players);

  // Check if court is already occupied
  const isCourtOccupied = session.activeMatches.some(m => m.court === court);
  if (isCourtOccupied) return state;

  const selectedPlayers = selectNextPlayers(queue, session.gameMode);
  if (!selectedPlayers) return state;

  const teams = formTeams(selectedPlayers, session.gameMode);
  if (!teams) return state;

  const match = createMatch(court, teams.team1, teams.team2);

  // Update player statuses and partners
  const playerIds = [...match.team1, ...match.team2];
  const updatedPlayers = session.players.map(p => {
    if (!playerIds.includes(p.id)) return p;

    const isTeam1 = match.team1.includes(p.id);
    // For singles, there's no partner
    const partnerId = session.gameMode === 'doubles'
      ? (isTeam1
          ? match.team1.find(id => id !== p.id)
          : match.team2.find(id => id !== p.id)) ?? null
      : null;

    return {
      ...p,
      status: 'playing' as const,
      lastPartner: partnerId,
      courtsPlayed: [...p.courtsPlayed, court],
    };
  });

  return {
    ...state,
    session: {
      ...session,
      players: updatedPlayers,
      activeMatches: [...session.activeMatches, match],
    },
  };
}

function fillAvailableCourts(state: SessionState): SessionState {
  const { session } = state;
  const queue = getCheckedInQueue(session.players);
  const activeCourts = new Set(session.activeMatches.map(m => m.court));

  // Find available courts
  const availableCourts: number[] = [];
  for (let i = 1; i <= session.courts; i++) {
    if (!activeCourts.has(i)) {
      availableCourts.push(i);
    }
  }

  // Try to fill each available court
  let updatedPlayers = [...session.players];
  const updatedActiveMatches = [...session.activeMatches];
  let currentQueue = queue;

  for (const court of availableCourts) {
    const selectedPlayers = selectNextPlayers(currentQueue, session.gameMode);
    if (!selectedPlayers) break;

    const teams = formTeams(selectedPlayers, session.gameMode);
    if (!teams) break;

    const match = createMatch(court, teams.team1, teams.team2);

    // Update player statuses and partners
    const playerIds = [...match.team1, ...match.team2];
    updatedPlayers = updatedPlayers.map(p => {
      if (!playerIds.includes(p.id)) return p;

      const isTeam1 = match.team1.includes(p.id);
      // For singles, there's no partner
      const partnerId = session.gameMode === 'doubles'
        ? (isTeam1
            ? match.team1.find(id => id !== p.id)
            : match.team2.find(id => id !== p.id)) ?? null
        : null;

      return {
        ...p,
        status: 'playing' as const,
        lastPartner: partnerId,
        courtsPlayed: [...p.courtsPlayed, court],
      };
    });

    updatedActiveMatches.push(match);

    // Update queue for next iteration
    currentQueue = currentQueue.filter(p => !playerIds.includes(p.id));
  }

  return {
    ...state,
    session: {
      ...session,
      players: updatedPlayers,
      activeMatches: updatedActiveMatches,
    },
  };
}

// Exported for testing
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'LOAD_SESSION':
      return { ...state, session: action.session };

    case 'SET_LOCATION':
      return {
        ...state,
        session: { ...state.session, location: action.location },
      };

    case 'SET_COURTS':
      return {
        ...state,
        session: { ...state.session, courts: Math.max(1, Math.min(10, action.courts)) },
      };

    case 'SET_GAME_MODE':
      return {
        ...state,
        session: { ...state.session, gameMode: action.gameMode },
      };

    case 'ADD_PLAYER': {
      // If session is active, add player directly to queue (checked-in)
      const isActiveSession = state.session.startTime !== null && state.session.endTime === null;
      const newPlayer: Player = {
        id: generateId(),
        name: action.name.trim(),
        skill: null,
        status: isActiveSession ? 'checked-in' : 'not-here',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        lastPartner: null,
        lockedPartnerId: null,
        courtsPlayed: [],
        checkedInAt: isActiveSession ? Date.now() : null,
      };
      return {
        ...state,
        session: {
          ...state.session,
          players: [...state.session.players, newPlayer],
        },
      };
    }

    case 'ADD_PLAYER_WITH_SKILL': {
      // If session is active, add player directly to queue (checked-in)
      const isActiveSession = state.session.startTime !== null && state.session.endTime === null;
      const newPlayer: Player = {
        id: generateId(),
        name: action.name.trim(),
        skill: action.skill,
        status: isActiveSession ? 'checked-in' : 'not-here',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        lastPartner: null,
        lockedPartnerId: null,
        courtsPlayed: [],
        checkedInAt: isActiveSession ? Date.now() : null,
      };
      return {
        ...state,
        session: {
          ...state.session,
          players: [...state.session.players, newPlayer],
        },
      };
    }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.filter(p => p.id !== action.playerId),
        },
      };

    case 'SET_PLAYER_SKILL':
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p =>
            p.id === action.playerId ? { ...p, skill: action.skill } : p
          ),
        },
      };

    case 'CHECK_IN_PLAYER': {
      const isActiveSession = state.session.startTime !== null && state.session.endTime === null;
      const newState = {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p =>
            p.id === action.playerId
              ? { ...p, status: 'checked-in' as const, checkedInAt: Date.now() }
              : p
          ),
        },
      };
      // Try to fill courts if session is active and there are enough players
      return isActiveSession ? fillAvailableCourts(newState) : newState;
    }

    case 'CHECK_OUT_PLAYER':
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p =>
            p.id === action.playerId ? { ...p, status: 'left' } : p
          ),
        },
      };

    case 'START_SESSION': {
      saveLocation(state.session.location, state.session.courts);
      const startedState = {
        ...state,
        session: {
          ...state.session,
          startTime: Date.now(),
        },
        screen: 'play' as AppScreen,
      };
      return fillAvailableCourts(startedState);
    }

    case 'END_SESSION': {
      // Save player stats to the persistent database
      for (const player of state.session.players) {
        if (player.gamesPlayed > 0) {
          updatePlayerStats(player.name, player.skill, player.wins, player.losses);
        }
      }

      // Note: Supabase sync is handled by the SessionProvider via effect
      // to allow setting the synced session ID after async operation

      return {
        ...state,
        session: {
          ...state.session,
          endTime: Date.now(),
        },
        screen: 'leaderboard',
        syncedSessionId: null, // Will be set after async sync
      };
    }

    case 'RECORD_WINNER': {
      const match = state.session.activeMatches.find(m => m.id === action.matchId);
      if (!match) return state;

      const winningTeam = action.winner === 1 ? match.team1 : match.team2;
      const losingTeam = action.winner === 1 ? match.team2 : match.team1;

      // Update match
      const completedMatch: Match = {
        ...match,
        winner: action.winner,
        endTime: Date.now(),
      };

      // Update player stats and return them to queue
      const updatedPlayers = state.session.players.map(p => {
        if (winningTeam.includes(p.id)) {
          return {
            ...p,
            status: 'checked-in' as const,
            gamesPlayed: p.gamesPlayed + 1,
            wins: p.wins + 1,
          };
        }
        if (losingTeam.includes(p.id)) {
          return {
            ...p,
            status: 'checked-in' as const,
            gamesPlayed: p.gamesPlayed + 1,
            losses: p.losses + 1,
          };
        }
        return p;
      });

      const newState = {
        ...state,
        session: {
          ...state.session,
          players: updatedPlayers,
          matches: [...state.session.matches, completedMatch],
          activeMatches: state.session.activeMatches.filter(m => m.id !== action.matchId),
        },
        undoAction: {
          type: 'winner' as const,
          data: { matchId: action.matchId, winner: action.winner, match: completedMatch },
          timestamp: Date.now(),
        },
      };

      // Don't auto-fill - let staff manually start next match
      // This allows waiting for other courts to finish so players can mix
      return newState;
    }

    case 'UNDO_WINNER': {
      const undoData = state.undoAction?.data as { matchId: string; winner: number; match: Match } | undefined;
      if (!undoData || state.undoAction?.type !== 'winner') return state;

      const match = undoData.match;
      const winningTeam = undoData.winner === 1 ? match.team1 : match.team2;
      const losingTeam = undoData.winner === 1 ? match.team2 : match.team1;

      // Find and remove any players who were auto-assigned to fill the court
      // These are players currently playing on the same court
      const replacementMatch = state.session.activeMatches.find(m => m.court === match.court);
      const replacementPlayers = replacementMatch
        ? [...replacementMatch.team1, ...replacementMatch.team2]
        : [];

      // Reverse player stats and put original players back on court
      const updatedPlayers = state.session.players.map(p => {
        if (winningTeam.includes(p.id)) {
          return {
            ...p,
            status: 'playing' as const,
            gamesPlayed: p.gamesPlayed - 1,
            wins: p.wins - 1,
          };
        }
        if (losingTeam.includes(p.id)) {
          return {
            ...p,
            status: 'playing' as const,
            gamesPlayed: p.gamesPlayed - 1,
            losses: p.losses - 1,
          };
        }
        // Return replacement players to queue
        if (replacementPlayers.includes(p.id)) {
          return {
            ...p,
            status: 'checked-in' as const,
          };
        }
        return p;
      });

      // Restore the match to active and remove from completed
      const restoredMatch: Match = {
        ...match,
        winner: null,
        endTime: null,
      };

      return {
        ...state,
        session: {
          ...state.session,
          players: updatedPlayers,
          matches: state.session.matches.filter(m => m.id !== action.matchId),
          activeMatches: [
            ...state.session.activeMatches.filter(m => m.court !== match.court),
            restoredMatch,
          ],
        },
        undoAction: null,
      };
    }

    case 'REMOVE_FROM_COURT': {
      const match = state.session.activeMatches.find(m => m.id === action.matchId);
      if (!match) return state;

      const removedPlayer = state.session.players.find(p => p.id === action.playerId);
      if (!removedPlayer) return state;

      const queue = getCheckedInQueue(state.session.players);
      const substitute = findSubstitute(queue, removedPlayer);

      if (!substitute) {
        // No substitute available - just remove the player and mark them as left
        return {
          ...state,
          session: {
            ...state.session,
            players: state.session.players.map(p =>
              p.id === action.playerId ? { ...p, status: 'left' } : p
            ),
            // Remove the match if we can't find a substitute
            activeMatches: state.session.activeMatches.filter(m => m.id !== action.matchId),
          },
        };
      }

      // Find which team the removed player was on
      const isTeam1 = match.team1.includes(action.playerId);
      const newTeam1 = isTeam1
        ? match.team1.map(id => id === action.playerId ? substitute.id : id)
        : match.team1;
      const newTeam2 = !isTeam1
        ? match.team2.map(id => id === action.playerId ? substitute.id : id)
        : match.team2;

      // For doubles, find partner; for singles, no partner
      const partnerId = state.session.gameMode === 'doubles'
        ? (isTeam1
            ? newTeam1.find(id => id !== substitute.id)
            : newTeam2.find(id => id !== substitute.id)) ?? null
        : null;

      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p => {
            if (p.id === action.playerId) {
              return { ...p, status: 'left' };
            }
            if (p.id === substitute.id) {
              return {
                ...p,
                status: 'playing',
                lastPartner: partnerId,
                courtsPlayed: [...p.courtsPlayed, match.court],
              };
            }
            return p;
          }),
          activeMatches: state.session.activeMatches.map(m =>
            m.id === action.matchId
              ? { ...m, team1: newTeam1, team2: newTeam2 }
              : m
          ),
        },
      };
    }

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_UNDO':
      return { ...state, undoAction: action.action };

    case 'NEW_SESSION':
      clearSession();
      return {
        session: createInitialSession(),
        screen: 'setup',
        undoAction: null,
        syncedSessionId: null,
      };

    case 'FILL_COURTS':
      return fillAvailableCourts(state);

    case 'FILL_COURT':
      return fillSingleCourt(state, action.court);

    case 'LOCK_PARTNERS': {
      // Lock two players together as partners
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p => {
            if (p.id === action.player1Id) {
              return { ...p, lockedPartnerId: action.player2Id };
            }
            if (p.id === action.player2Id) {
              return { ...p, lockedPartnerId: action.player1Id };
            }
            return p;
          }),
        },
      };
    }

    case 'UNLOCK_PARTNER': {
      // Unlock a player and their partner
      const player = state.session.players.find(p => p.id === action.playerId);
      const partnerId = player?.lockedPartnerId;
      return {
        ...state,
        session: {
          ...state.session,
          players: state.session.players.map(p => {
            if (p.id === action.playerId || p.id === partnerId) {
              return { ...p, lockedPartnerId: null };
            }
            return p;
          }),
        },
      };
    }

    case 'SET_SYNCED_SESSION_ID':
      return { ...state, syncedSessionId: action.sessionId };

    default:
      return state;
  }
}

interface SessionContextValue {
  session: Session;
  screen: AppScreen;
  undoAction: UndoAction | null;
  syncedSessionId: string | null;
  checkedInCount: number;
  canStartSession: boolean;
  queue: Player[];
  dispatch: React.Dispatch<SessionAction>;
  setLocation: (location: string) => void;
  setCourts: (courts: number) => void;
  setGameMode: (gameMode: GameMode) => void;
  addPlayer: (name: string) => void;
  addPlayerWithSkill: (name: string, skill: SkillLevel) => void;
  removePlayer: (playerId: string) => void;
  setPlayerSkill: (playerId: string, skill: SkillLevel) => void;
  checkInPlayer: (playerId: string) => void;
  checkOutPlayer: (playerId: string) => void;
  startSession: () => void;
  endSession: () => void;
  recordWinner: (matchId: string, winner: 1 | 2) => void;
  undoWinner: (matchId: string) => void;
  removeFromCourt: (playerId: string, matchId: string) => void;
  setScreen: (screen: AppScreen) => void;
  clearUndo: () => void;
  newSession: () => void;
  fillCourts: () => void;
  fillCourt: (court: number) => void;
  lockPartners: (player1Id: string, player2Id: string) => void;
  unlockPartner: (playerId: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function getInitialState(): SessionState {
  const saved = loadSession();
  if (saved) {
    let screen: AppScreen = 'setup';
    if (saved.endTime) {
      screen = 'leaderboard';
    } else if (saved.startTime) {
      screen = 'play';
    }
    return {
      session: saved,
      screen,
      undoAction: null,
      syncedSessionId: null,
    };
  }
  return {
    session: createInitialSession(),
    screen: 'setup',
    undoAction: null,
    syncedSessionId: null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, null, getInitialState);

  // Save session to localStorage on changes
  useEffect(() => {
    saveSession(state.session);
  }, [state.session]);

  // Process any queued syncs on startup (for offline recovery)
  useEffect(() => {
    processSyncQueue().catch(console.error);
  }, []);

  // Auto-clear undo after 10 seconds
  useEffect(() => {
    if (state.undoAction) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_UNDO', action: null });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [state.undoAction]);

  // Sync to Supabase when session ends
  useEffect(() => {
    if (state.session.endTime && !state.syncedSessionId && getLocalVenue()) {
      const syncSession = async () => {
        const sessionId = await createSessionAndSync({
          location: state.session.location,
          courts: state.session.courts,
          totalGames: state.session.matches.length,
          startedAt: state.session.startTime ? new Date(state.session.startTime).toISOString() : null,
          players: state.session.players
            .filter(p => p.gamesPlayed > 0)
            .map(p => ({
              name: p.name,
              skill: p.skill,
              wins: p.wins,
              losses: p.losses,
              gamesPlayed: p.gamesPlayed,
            })),
        });
        if (sessionId) {
          dispatch({ type: 'SET_SYNCED_SESSION_ID', sessionId });
        }
      };
      syncSession().catch(console.error);
    }
  }, [state.session.endTime, state.syncedSessionId, state.session.location, state.session.courts, state.session.matches.length, state.session.startTime, state.session.players]);

  const checkedInCount = state.session.players.filter(
    p => p.status === 'checked-in' || p.status === 'playing'
  ).length;

  const minPlayers = state.session.gameMode === 'doubles' ? 4 : 2;
  const canStartSession = checkedInCount >= minPlayers && state.session.location.trim() !== '';

  const queue = getCheckedInQueue(state.session.players);

  const value: SessionContextValue = {
    session: state.session,
    screen: state.screen,
    undoAction: state.undoAction,
    syncedSessionId: state.syncedSessionId,
    checkedInCount,
    canStartSession,
    queue,
    dispatch,
    setLocation: useCallback((location: string) =>
      dispatch({ type: 'SET_LOCATION', location }), []),
    setCourts: useCallback((courts: number) =>
      dispatch({ type: 'SET_COURTS', courts }), []),
    setGameMode: useCallback((gameMode: GameMode) =>
      dispatch({ type: 'SET_GAME_MODE', gameMode }), []),
    addPlayer: useCallback((name: string) =>
      dispatch({ type: 'ADD_PLAYER', name }), []),
    addPlayerWithSkill: useCallback((name: string, skill: SkillLevel) =>
      dispatch({ type: 'ADD_PLAYER_WITH_SKILL', name, skill }), []),
    removePlayer: useCallback((playerId: string) =>
      dispatch({ type: 'REMOVE_PLAYER', playerId }), []),
    setPlayerSkill: useCallback((playerId: string, skill: SkillLevel) =>
      dispatch({ type: 'SET_PLAYER_SKILL', playerId, skill }), []),
    checkInPlayer: useCallback((playerId: string) =>
      dispatch({ type: 'CHECK_IN_PLAYER', playerId }), []),
    checkOutPlayer: useCallback((playerId: string) =>
      dispatch({ type: 'CHECK_OUT_PLAYER', playerId }), []),
    startSession: useCallback(() =>
      dispatch({ type: 'START_SESSION' }), []),
    endSession: useCallback(() =>
      dispatch({ type: 'END_SESSION' }), []),
    recordWinner: useCallback((matchId: string, winner: 1 | 2) =>
      dispatch({ type: 'RECORD_WINNER', matchId, winner }), []),
    undoWinner: useCallback((matchId: string) =>
      dispatch({ type: 'UNDO_WINNER', matchId }), []),
    removeFromCourt: useCallback((playerId: string, matchId: string) =>
      dispatch({ type: 'REMOVE_FROM_COURT', playerId, matchId }), []),
    setScreen: useCallback((screen: AppScreen) =>
      dispatch({ type: 'SET_SCREEN', screen }), []),
    clearUndo: useCallback(() =>
      dispatch({ type: 'SET_UNDO', action: null }), []),
    newSession: useCallback(() =>
      dispatch({ type: 'NEW_SESSION' }), []),
    fillCourts: useCallback(() =>
      dispatch({ type: 'FILL_COURTS' }), []),
    fillCourt: useCallback((court: number) =>
      dispatch({ type: 'FILL_COURT', court }), []),
    lockPartners: useCallback((player1Id: string, player2Id: string) =>
      dispatch({ type: 'LOCK_PARTNERS', player1Id, player2Id }), []),
    unlockPartner: useCallback((playerId: string) =>
      dispatch({ type: 'UNLOCK_PARTNER', playerId }), []),
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
