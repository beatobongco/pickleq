import type { Player, Match, GameMode } from '../types';
import { generateId } from './storage';

interface MatchCandidate {
  player: Player;
  priority: number;
}

function calculatePriority(player: Player, queuePosition: number): number {
  // Lower number = higher priority
  // Primary: fewer games played
  // Secondary: earlier in queue (checked in earlier)
  return player.gamesPlayed * 1000 + queuePosition;
}

export function selectNextPlayers(queue: Player[], gameMode: GameMode): Player[] | null {
  const needed = gameMode === 'doubles' ? 4 : 2;
  if (queue.length < needed) return null;

  const candidates: MatchCandidate[] = queue.map((player, index) => ({
    player,
    priority: calculatePriority(player, index),
  }));

  // Sort by priority (lowest first = should play next)
  candidates.sort((a, b) => a.priority - b.priority);

  // Take the required number of highest priority players
  return candidates.slice(0, needed).map(c => c.player);
}

export function formTeams(
  players: Player[],
  gameMode: GameMode,
  avoidPartners: boolean = true
): { team1: Player[]; team2: Player[] } | null {
  // Singles mode: 2 players, one per "team"
  if (gameMode === 'singles') {
    if (players.length !== 2) return null;
    return { team1: [players[0]], team2: [players[1]] };
  }

  // Doubles mode: 4 players, 2 per team
  if (players.length !== 4) return null;

  const sorted = [...players];

  // Check if we have skill levels set
  const hasSkills = sorted.some(p => p.skill !== null);

  if (hasSkills) {
    // Sort by skill level for balanced team formation
    sorted.sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0));

    // Try to form balanced teams: High+Low vs High+Low
    // sorted[0] = highest skill, sorted[3] = lowest skill
    let team1: Player[] = [sorted[0], sorted[3]];
    let team2: Player[] = [sorted[1], sorted[2]];

    // Check if we should avoid recent partners
    if (avoidPartners) {
      const team1WasRecent = sorted[0].lastPartner === sorted[3].id ||
                            sorted[3].lastPartner === sorted[0].id;
      const team2WasRecent = sorted[1].lastPartner === sorted[2].id ||
                            sorted[2].lastPartner === sorted[1].id;

      // If both teams have recent partners, try swapping
      if (team1WasRecent || team2WasRecent) {
        const altTeam1: Player[] = [sorted[0], sorted[2]];
        const altTeam2: Player[] = [sorted[1], sorted[3]];

        const altTeam1Recent = sorted[0].lastPartner === sorted[2].id ||
                              sorted[2].lastPartner === sorted[0].id;
        const altTeam2Recent = sorted[1].lastPartner === sorted[3].id ||
                              sorted[3].lastPartner === sorted[1].id;

        // Use alternative if it has fewer recent partner issues
        const originalIssues = (team1WasRecent ? 1 : 0) + (team2WasRecent ? 1 : 0);
        const altIssues = (altTeam1Recent ? 1 : 0) + (altTeam2Recent ? 1 : 0);

        if (altIssues < originalIssues) {
          team1 = altTeam1;
          team2 = altTeam2;
        }
      }
    }

    return { team1, team2 };
  } else {
    // No skill levels - random assignment
    const shuffled = [...sorted].sort(() => Math.random() - 0.5);

    let team1: Player[] = [shuffled[0], shuffled[1]];
    let team2: Player[] = [shuffled[2], shuffled[3]];

    // Try to avoid recent partners even in random mode
    if (avoidPartners) {
      const team1WasRecent = shuffled[0].lastPartner === shuffled[1].id ||
                            shuffled[1].lastPartner === shuffled[0].id;

      if (team1WasRecent) {
        // Swap one player between teams
        team1 = [shuffled[0], shuffled[2]];
        team2 = [shuffled[1], shuffled[3]];
      }
    }

    return { team1, team2 };
  }
}

export function createMatch(
  court: number,
  team1: Player[],
  team2: Player[]
): Match {
  return {
    id: generateId(),
    court,
    team1: team1.map(p => p.id),
    team2: team2.map(p => p.id),
    winner: null,
    startTime: Date.now(),
    endTime: null,
  };
}

export function findSubstitute(
  queue: Player[],
  removedPlayer: Player
): Player | null {
  if (queue.length === 0) return null;

  // Get skill level of removed player
  const targetSkill = removedPlayer.skill;

  // Find candidates with matching skill, sorted by priority
  const candidates: MatchCandidate[] = queue.map((player, index) => ({
    player,
    priority: calculatePriority(player, index),
  }));

  candidates.sort((a, b) => a.priority - b.priority);

  // First try to find someone with matching skill
  if (targetSkill !== null) {
    const skillMatch = candidates.find(c => c.player.skill === targetSkill);
    if (skillMatch) return skillMatch.player;

    // Then try similar skill (within 1 level)
    const similarMatch = candidates.find(c => {
      if (c.player.skill === null) return false;
      return Math.abs(c.player.skill - targetSkill) <= 1;
    });
    if (similarMatch) return similarMatch.player;
  }

  // Fall back to highest priority player
  return candidates[0]?.player ?? null;
}

export function getPlayersWhoHaventPlayedRecently(
  players: Player[],
  _activeMatches: Match[],
  rotationThreshold: number = 3
): Player[] {
  // Find players who are checked in but haven't played in a while
  const checkedIn = players.filter(p => p.status === 'checked-in');

  // Calculate average games played
  const avgGames = checkedIn.reduce((sum, p) => sum + p.gamesPlayed, 0) / checkedIn.length;

  // Alert if someone is more than threshold games behind
  return checkedIn.filter(p => avgGames - p.gamesPlayed >= rotationThreshold);
}

export function calculateLeaderboard(players: Player[]): Player[] {
  // Filter to only players who played at least one game
  const played = players.filter(p => p.gamesPlayed > 0);

  return played.sort((a, b) => {
    // Primary: Win percentage (higher is better)
    const aWinPct = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
    const bWinPct = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;

    // Tiebreaker 1: Most wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // Tiebreaker 2: Fewer games played (rewards efficiency)
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;

    // Tiebreaker 3: Alphabetical
    return a.name.localeCompare(b.name);
  });
}

export function getWinPercentage(player: Player): number {
  if (player.gamesPlayed === 0) return 0;
  return Math.round((player.wins / player.gamesPlayed) * 100);
}
