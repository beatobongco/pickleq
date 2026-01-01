import type { Session } from '../types';

const STORAGE_KEY = 'dinksync_session';
const LOCATIONS_KEY = 'dinksync_locations';

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

export function getSavedLocations(): string[] {
  const data = localStorage.getItem(LOCATIONS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function saveLocation(location: string): void {
  const locations = getSavedLocations();
  if (!locations.includes(location)) {
    locations.unshift(location);
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations.slice(0, 10)));
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
