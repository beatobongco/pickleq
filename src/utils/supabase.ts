import { createClient } from '@supabase/supabase-js';
import type { Venue, VenuePlayer, VenueSession, SessionPlayer, SkillLevel } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Local storage keys
const VENUE_KEY = 'pickleq_venue';
const SYNC_QUEUE_KEY = 'pickleq_sync_queue';

// Simple password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Venue management
export function getLocalVenue(): Venue | null {
  const stored = localStorage.getItem(VENUE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setLocalVenue(venue: Venue): void {
  localStorage.setItem(VENUE_KEY, JSON.stringify(venue));
}

export function clearLocalVenue(): void {
  localStorage.removeItem(VENUE_KEY);
}

// Check if slug is available
export async function checkSlugAvailable(slug: string): Promise<boolean> {
  if (!supabase) return true; // Allow offline setup

  const { data, error } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error && error.code === 'PGRST116') {
    // No rows found = slug is available
    return true;
  }

  return !data;
}

// Create or get venue
export async function createVenue(slug: string, name: string, password: string): Promise<Venue | null> {
  const passwordHash = await hashPassword(password);

  if (!supabase) {
    // Offline mode - create local-only venue
    const venue: Venue = {
      id: crypto.randomUUID(),
      slug,
      name,
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    setLocalVenue(venue);
    return venue;
  }

  const { data, error } = await supabase
    .from('venues')
    .insert({ slug, name, password_hash: passwordHash })
    .select()
    .single();

  if (error) {
    console.error('Failed to create venue:', error);
    return null;
  }

  const venue: Venue = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    createdAt: data.created_at,
    passwordHash,
  };

  setLocalVenue(venue);
  return venue;
}

// Join existing venue with password
export async function joinVenue(slug: string, password: string): Promise<{ success: boolean; error?: string; venue?: Venue }> {
  if (!supabase) {
    return { success: false, error: 'Offline mode - cannot join existing venue' };
  }

  // Get venue by slug
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return { success: false, error: 'Venue not found' };
  }

  // Verify password
  const passwordHash = await hashPassword(password);
  if (data.password_hash !== passwordHash) {
    return { success: false, error: 'Incorrect password' };
  }

  const venue: Venue = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    createdAt: data.created_at,
    passwordHash,
  };

  setLocalVenue(venue);

  // Load locations from cloud and merge with localStorage
  await syncLocationsToLocal(venue.id);

  // Load roster from cloud and merge with localStorage players
  await syncRosterToLocal(venue.id);

  return { success: true, venue };
}

// Sync cloud locations to localStorage (replaces local data - cloud is authoritative)
async function syncLocationsToLocal(venueId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('locations')
    .select('name, courts')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error || !data) return;

  // Replace local with cloud data (no merge to prevent cross-venue contamination)
  localStorage.setItem('dinksync_locations', JSON.stringify(data));
}

// Sync cloud roster to localStorage players (replaces local data - cloud is authoritative)
async function syncRosterToLocal(venueId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('players')
    .select('name, skill, lifetime_wins, lifetime_losses, lifetime_games, last_played_at')
    .eq('venue_id', venueId)
    .order('last_played_at', { ascending: false });

  if (error || !data) return;

  // Convert cloud players to local format and replace (no merge to prevent cross-venue contamination)
  const cloudPlayers = data.map((p) => ({
    id: crypto.randomUUID(),
    name: p.name,
    skill: p.skill,
    lifetimeWins: p.lifetime_wins,
    lifetimeLosses: p.lifetime_losses,
    lifetimeGames: p.lifetime_games,
    lastPlayed: p.last_played_at ? new Date(p.last_played_at).getTime() : null,
  }));

  localStorage.setItem('dinksync_players', JSON.stringify(cloudPlayers));
}

// Get venue by slug (for public leaderboard)
export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    createdAt: data.created_at,
  };
}

// Get players for a venue (for public leaderboard)
export async function getVenuePlayers(venueId: string): Promise<VenuePlayer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('venue_id', venueId)
    .order('lifetime_wins', { ascending: false });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    venueId: p.venue_id,
    name: p.name,
    skill: p.skill as SkillLevel,
    lifetimeWins: p.lifetime_wins,
    lifetimeLosses: p.lifetime_losses,
    lifetimeGames: p.lifetime_games,
    lastPlayedAt: p.last_played_at,
  }));
}

// Sync queue for offline support
interface SyncItem {
  venueId: string;
  players: Array<{
    name: string;
    skill: SkillLevel;
    wins: number;
    losses: number;
    gamesPlayed: number;
  }>;
  timestamp: number;
}

function getSyncQueue(): SyncItem[] {
  const stored = localStorage.getItem(SYNC_QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function setSyncQueue(queue: SyncItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Sync session stats to Supabase
export async function syncSessionStats(
  players: Array<{
    name: string;
    skill: SkillLevel;
    wins: number;
    losses: number;
    gamesPlayed: number;
  }>
): Promise<boolean> {
  const venue = getLocalVenue();
  if (!venue) return false;

  // Filter to only players who played
  const activePlayers = players.filter((p) => p.gamesPlayed > 0);
  if (activePlayers.length === 0) return true;

  if (!supabase) {
    // Queue for later sync
    const queue = getSyncQueue();
    queue.push({
      venueId: venue.id,
      players: activePlayers,
      timestamp: Date.now(),
    });
    setSyncQueue(queue);
    return true;
  }

  try {
    // Upsert each player's stats
    for (const player of activePlayers) {
      const { error } = await supabase.rpc('upsert_player_stats', {
        p_venue_id: venue.id,
        p_name: player.name,
        p_skill: player.skill,
        p_wins: player.wins,
        p_losses: player.losses,
        p_games: player.gamesPlayed,
      });

      if (error) {
        console.error('Failed to sync player:', player.name, error);
        // If RPC fails, try direct upsert
        await upsertPlayerDirect(venue.id, player);
      }
    }

    return true;
  } catch (err) {
    console.error('Sync failed:', err);
    // Queue for retry
    const queue = getSyncQueue();
    queue.push({
      venueId: venue.id,
      players: activePlayers,
      timestamp: Date.now(),
    });
    setSyncQueue(queue);
    return false;
  }
}

// Direct upsert fallback (if RPC not available)
async function upsertPlayerDirect(
  venueId: string,
  player: {
    name: string;
    skill: SkillLevel;
    wins: number;
    losses: number;
    gamesPlayed: number;
  }
): Promise<void> {
  if (!supabase) return;

  // Check if player exists
  const { data: existing } = await supabase
    .from('players')
    .select('id, lifetime_wins, lifetime_losses, lifetime_games')
    .eq('venue_id', venueId)
    .eq('name', player.name)
    .single();

  if (existing) {
    // Update existing player
    await supabase
      .from('players')
      .update({
        skill: player.skill,
        lifetime_wins: existing.lifetime_wins + player.wins,
        lifetime_losses: existing.lifetime_losses + player.losses,
        lifetime_games: existing.lifetime_games + player.gamesPlayed,
        last_played_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Insert new player
    await supabase.from('players').insert({
      venue_id: venueId,
      name: player.name,
      skill: player.skill,
      lifetime_wins: player.wins,
      lifetime_losses: player.losses,
      lifetime_games: player.gamesPlayed,
      last_played_at: new Date().toISOString(),
    });
  }
}

// Process queued syncs (call on app startup or when online)
export async function processSyncQueue(): Promise<void> {
  if (!supabase) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const remaining: SyncItem[] = [];

  for (const item of queue) {
    try {
      for (const player of item.players) {
        await upsertPlayerDirect(item.venueId, player);
      }
    } catch {
      // Keep in queue for retry
      remaining.push(item);
    }
  }

  setSyncQueue(remaining);
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// ============================================
// Session-based sync (for shareable session URLs)
// ============================================

interface SessionSyncData {
  location: string;
  courts: number;
  totalGames: number;
  startedAt: string | null;
  players: Array<{
    name: string;
    skill: SkillLevel;
    wins: number;
    losses: number;
    gamesPlayed: number;
  }>;
}

// Create a session and sync player stats, returns session ID for sharing
export async function createSessionAndSync(data: SessionSyncData): Promise<string | null> {
  const venue = getLocalVenue();
  if (!venue || !supabase) return null;

  const activePlayers = data.players.filter((p) => p.gamesPlayed > 0);
  if (activePlayers.length === 0) return null;

  try {
    // Create session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        venue_id: venue.id,
        location: data.location,
        courts: data.courts,
        total_games: data.totalGames,
        started_at: data.startedAt,
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      console.error('Failed to create session:', sessionError);
      return null;
    }

    const sessionId = sessionData.id;

    // Insert session players
    const sessionPlayers = activePlayers.map((p) => ({
      session_id: sessionId,
      player_name: p.name,
      skill: p.skill,
      wins: p.wins,
      losses: p.losses,
      games_played: p.gamesPlayed,
    }));

    const { error: playersError } = await supabase
      .from('session_players')
      .insert(sessionPlayers);

    if (playersError) {
      console.error('Failed to insert session players:', playersError);
    }

    // Also update lifetime stats
    for (const player of activePlayers) {
      await upsertPlayerDirect(venue.id, player);
    }

    return sessionId;
  } catch (err) {
    console.error('Session sync failed:', err);
    return null;
  }
}

// Get session by ID (for public session page)
export async function getSessionById(sessionId: string): Promise<VenueSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    venueId: data.venue_id,
    location: data.location,
    courts: data.courts,
    totalGames: data.total_games,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  };
}

// Get session players (for public session page)
export async function getSessionPlayers(sessionId: string): Promise<SessionPlayer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('session_players')
    .select('*')
    .eq('session_id', sessionId)
    .order('wins', { ascending: false });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    sessionId: p.session_id,
    playerName: p.player_name,
    skill: p.skill as SkillLevel,
    wins: p.wins,
    losses: p.losses,
    gamesPlayed: p.games_played,
  }));
}

// Get lifetime stats for a player at a venue (for session page to show both)
export async function getPlayerLifetimeStats(
  venueId: string,
  playerName: string
): Promise<VenuePlayer | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('venue_id', venueId)
    .eq('name', playerName)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    venueId: data.venue_id,
    name: data.name,
    skill: data.skill as SkillLevel,
    lifetimeWins: data.lifetime_wins,
    lifetimeLosses: data.lifetime_losses,
    lifetimeGames: data.lifetime_games,
    lastPlayedAt: data.last_played_at,
  };
}

// ============================================
// Location sync (for cross-device persistence)
// ============================================

export interface VenueLocation {
  id: string;
  venueId: string;
  name: string;
  courts: number;
}

// Get locations for a venue from Supabase
export async function getVenueLocations(venueId: string): Promise<VenueLocation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((loc) => ({
    id: loc.id,
    venueId: loc.venue_id,
    name: loc.name,
    courts: loc.courts,
  }));
}

// Save a location to Supabase (upsert by name)
export async function saveVenueLocation(name: string, courts: number): Promise<void> {
  const venue = getLocalVenue();
  if (!venue || !supabase) return;

  // Check if location exists
  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('name', name)
    .single();

  if (existing) {
    // Update existing
    await supabase
      .from('locations')
      .update({ courts })
      .eq('id', existing.id);
  } else {
    // Insert new
    await supabase
      .from('locations')
      .insert({ venue_id: venue.id, name, courts });
  }
}

// Sync local locations to Supabase and fetch any new ones
export async function syncLocations(): Promise<VenueLocation[]> {
  const venue = getLocalVenue();
  if (!venue || !supabase) return [];

  // Fetch cloud locations
  return getVenueLocations(venue.id);
}

// ============================================
// Roster sync (player list for venue)
// ============================================

// Get roster (all players who have played at this venue) for autocomplete
export async function getVenueRoster(venueId: string): Promise<Array<{ name: string; skill: SkillLevel }>> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('players')
    .select('name, skill')
    .eq('venue_id', venueId)
    .order('last_played_at', { ascending: false });

  if (error || !data) return [];

  return data.map((p) => ({
    name: p.name,
    skill: p.skill as SkillLevel,
  }));
}

// Add a new player to the roster (for when they're first added to a session)
export async function addToRoster(name: string, skill: SkillLevel): Promise<void> {
  const venue = getLocalVenue();
  if (!venue || !supabase) return;

  // Check if player already exists
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('venue_id', venue.id)
    .eq('name', name)
    .single();

  if (!existing) {
    // Insert new player with 0 stats
    await supabase.from('players').insert({
      venue_id: venue.id,
      name,
      skill,
      lifetime_wins: 0,
      lifetime_losses: 0,
      lifetime_games: 0,
    });
  } else if (skill !== null) {
    // Update skill if provided
    await supabase
      .from('players')
      .update({ skill })
      .eq('id', existing.id);
  }
}
