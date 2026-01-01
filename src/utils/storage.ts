import type { Session, SkillLevel } from '../types';

const STORAGE_KEY = 'dinksync_session';
const LOCATIONS_KEY = 'dinksync_locations';
const PLAYERS_KEY = 'dinksync_players';

export interface SavedLocation {
  name: string;
  courts: number;
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSavedLocations(): SavedLocation[] {
  const data = localStorage.getItem(LOCATIONS_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    // Handle migration from old string[] format to new SavedLocation[] format
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === 'string') {
        // Old format: convert to new format with default 4 courts
        return parsed.map((name: string) => ({ name, courts: 4 }));
      }
      return parsed as SavedLocation[];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocation(location: string, courts: number): void {
  const locations = getSavedLocations();
  const existingIndex = locations.findIndex(loc => loc.name === location);

  if (existingIndex >= 0) {
    // Update existing location's court count and move to front
    locations.splice(existingIndex, 1);
  }

  locations.unshift({ name: location, courts });
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations.slice(0, 10)));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Player database for persistence across sessions
export interface SavedPlayer {
  id: string;
  name: string;
  skill: SkillLevel;
  lifetimeWins: number;
  lifetimeLosses: number;
  lifetimeGames: number;
  lastPlayed: number | null;
}

export function getSavedPlayers(): SavedPlayer[] {
  const data = localStorage.getItem(PLAYERS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as SavedPlayer[];
  } catch {
    return [];
  }
}

export function savePlayers(players: SavedPlayer[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function searchPlayers(query: string): SavedPlayer[] {
  if (!query.trim()) return [];
  const players = getSavedPlayers();
  const lowerQuery = query.toLowerCase();
  return players
    .filter(p => p.name.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      // Exact match first
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      // Then by most recently played
      return (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0);
    })
    .slice(0, 10);
}

export function updatePlayerStats(
  name: string,
  skill: SkillLevel,
  sessionWins: number,
  sessionLosses: number
): void {
  const players = getSavedPlayers();
  const normalizedName = name.trim();
  const existingIndex = players.findIndex(
    p => p.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (existingIndex >= 0) {
    // Update existing player
    const player = players[existingIndex];
    player.skill = skill ?? player.skill;
    player.lifetimeWins += sessionWins;
    player.lifetimeLosses += sessionLosses;
    player.lifetimeGames += sessionWins + sessionLosses;
    player.lastPlayed = Date.now();
  } else {
    // Add new player
    players.push({
      id: generateId(),
      name: normalizedName,
      skill,
      lifetimeWins: sessionWins,
      lifetimeLosses: sessionLosses,
      lifetimeGames: sessionWins + sessionLosses,
      lastPlayed: Date.now(),
    });
  }

  savePlayers(players);
}

export function getOrCreateSavedPlayer(name: string): SavedPlayer | null {
  const players = getSavedPlayers();
  const normalizedName = name.trim();
  const existing = players.find(
    p => p.name.toLowerCase() === normalizedName.toLowerCase()
  );
  return existing ?? null;
}
