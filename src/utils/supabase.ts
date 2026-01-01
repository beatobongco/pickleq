import { createClient } from '@supabase/supabase-js';
import type { Venue, VenuePlayer, SkillLevel } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Local storage keys
const VENUE_KEY = 'pickleq_venue';
const SYNC_QUEUE_KEY = 'pickleq_sync_queue';

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
export async function createVenue(slug: string, name: string): Promise<Venue | null> {
  if (!supabase) {
    // Offline mode - create local-only venue
    const venue: Venue = {
      id: crypto.randomUUID(),
      slug,
      name,
      createdAt: new Date().toISOString(),
    };
    setLocalVenue(venue);
    return venue;
  }

  const { data, error } = await supabase
    .from('venues')
    .insert({ slug, name })
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
  };

  setLocalVenue(venue);
  return venue;
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
