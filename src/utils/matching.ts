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

// Calculate average skill of a pair (returns null if neither has skill set)
function getPairAverageSkill(pair: Player[]): number | null {
  const skills = pair.map(p => p.skill).filter(s => s !== null) as number[];
  if (skills.length === 0) return null;
  return skills.reduce((a, b) => a + b, 0) / skills.length;
}

// Check if two pairs have a significant skill gap (> 1 level difference)
function pairsHaveSkillGap(pair1: Player[], pair2: Player[]): boolean {
  const skill1 = getPairAverageSkill(pair1);
  const skill2 = getPairAverageSkill(pair2);

  // If either pair has no skill info, no gap to detect
  if (skill1 === null || skill2 === null) return false;

  // Gap of more than 1 level is considered significant
  return Math.abs(skill1 - skill2) > 1;
}

// Check if two pairs just played against each other (both players in pair have same lastPartner pointing to other pair)
function pairsJustPlayed(pair1: Player[], pair2: Player[]): boolean {
  // In the last game, lastPartner is set to your teammate
  // We need to check if pairs faced each other by seeing if any player from pair1
  // was an opponent of pair2 in the last game
  // After a game, players' lastPartner is set to their teammate in that game
  // So pair1[0].lastPartner === pair1[1].id means they were partners
  // To check if they played against pair2, we check if players have same gamesPlayed
  // and both pairs just finished (their lastPartner points to their locked partner)

  const pair1JustPlayedTogether = pair1[0].lastPartner === pair1[1].id &&
                                   pair1[1].lastPartner === pair1[0].id;
  const pair2JustPlayedTogether = pair2[0].lastPartner === pair2[1].id &&
                                   pair2[1].lastPartner === pair2[0].id;

  // If both pairs just played with their locked partner, and they have the same
  // number of games played, they likely just played against each other
  if (pair1JustPlayedTogether && pair2JustPlayedTogether) {
    const pair1Games = pair1[0].gamesPlayed;
    const pair2Games = pair2[0].gamesPlayed;
    // If they have same games played, they likely just faced each other
    return pair1Games === pair2Games && pair1Games > 0;
  }

  return false;
}

export function selectNextPlayers(queue: Player[], gameMode: GameMode): Player[] | null {
  const needed = gameMode === 'doubles' ? 4 : 2;
  if (queue.length < needed) return null;

  // For singles, try to match players of similar skill
  if (gameMode === 'singles') {
    const candidates: MatchCandidate[] = queue.map((player, index) => ({
      player,
      priority: calculatePriority(player, index),
    }));
    candidates.sort((a, b) => a.priority - b.priority);

    // Get the highest priority player
    const firstPlayer = candidates[0].player;
    const firstSkill = firstPlayer.skill;

    // If first player has skill, try to find a similar skill opponent
    if (firstSkill !== null) {
      // Look for exact skill match first (excluding first player)
      const exactMatch = candidates.slice(1).find(c => c.player.skill === firstSkill);
      if (exactMatch) {
        return [firstPlayer, exactMatch.player];
      }

      // Then try similar skill (within 1 level)
      const similarMatch = candidates.slice(1).find(c => {
        if (c.player.skill === null) return false;
        return Math.abs(c.player.skill - firstSkill) <= 1;
      });
      if (similarMatch) {
        return [firstPlayer, similarMatch.player];
      }
    }

    // Fall back to top 2 by priority
    return [candidates[0].player, candidates[1].player];
  }

  // For doubles, check for locked pairs first
  if (gameMode === 'doubles') {
    // Find all locked pairs in the queue
    const lockedPairs: Player[][] = [];
    const seenIds = new Set<string>();

    for (const player of queue) {
      if (player.lockedPartnerId && !seenIds.has(player.id)) {
        const partner = queue.find(p => p.id === player.lockedPartnerId);
        if (partner) {
          lockedPairs.push([player, partner]);
          seenIds.add(player.id);
          seenIds.add(partner.id);
        }
      }
    }

    // Sort pairs by average priority
    lockedPairs.sort((pairA, pairB) => {
      const avgA = (calculatePriority(pairA[0], queue.indexOf(pairA[0])) +
                   calculatePriority(pairA[1], queue.indexOf(pairA[1]))) / 2;
      const avgB = (calculatePriority(pairB[0], queue.indexOf(pairB[0])) +
                   calculatePriority(pairB[1], queue.indexOf(pairB[1]))) / 2;
      return avgA - avgB;
    });

    const nonLocked = queue.filter(p => !p.lockedPartnerId);

    // If we have at least 2 locked pairs
    if (lockedPairs.length >= 2) {
      // Check if the top 2 pairs just played against each other OR have a big skill gap
      const shouldAvoidPairing = pairsJustPlayed(lockedPairs[0], lockedPairs[1]) ||
                                  pairsHaveSkillGap(lockedPairs[0], lockedPairs[1]);

      if (shouldAvoidPairing) {
        // Try to mix: use the highest priority pair with non-locked players
        if (nonLocked.length >= 2) {
          const candidates: MatchCandidate[] = nonLocked.map((player) => ({
            player,
            priority: calculatePriority(player, queue.indexOf(player)),
          }));
          candidates.sort((a, b) => a.priority - b.priority);
          return [...lockedPairs[0], candidates[0].player, candidates[1].player];
        }
        // If we have 3+ locked pairs, try to find a better skill match
        if (lockedPairs.length >= 3) {
          // Find the pair with closest skill to pair 0
          const pair0Skill = getPairAverageSkill(lockedPairs[0]);
          let bestMatchIdx = 2;
          let bestGap = Infinity;

          for (let i = 2; i < lockedPairs.length; i++) {
            const pairSkill = getPairAverageSkill(lockedPairs[i]);
            if (pair0Skill !== null && pairSkill !== null) {
              const gap = Math.abs(pair0Skill - pairSkill);
              if (gap < bestGap) {
                bestGap = gap;
                bestMatchIdx = i;
              }
            }
          }
          return [...lockedPairs[0], ...lockedPairs[bestMatchIdx]];
        }
        // No choice but to have unbalanced match
      }
      return [...lockedPairs[0], ...lockedPairs[1]];
    }

    // If we have exactly 1 locked pair, use them + 2 highest priority non-locked players
    if (lockedPairs.length === 1) {
      const pair = lockedPairs[0];
      if (nonLocked.length >= 2) {
        const candidates: MatchCandidate[] = nonLocked.map((player) => ({
          player,
          priority: calculatePriority(player, queue.indexOf(player)),
        }));
        candidates.sort((a, b) => a.priority - b.priority);
        return [...pair, candidates[0].player, candidates[1].player];
      }
      // Not enough non-locked players - can't form a valid match with this locked pair
      // Fall through to default behavior which will select 4 highest priority players
      // This may split the locked pair, but it's better than being stuck
    }
  }

  // Default behavior: prioritize by games played
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

  // First, check for locked pairs - they MUST stay together
  const lockedPairs: Player[][] = [];
  const unlockedPlayers: Player[] = [];
  const seenIds = new Set<string>();

  for (const player of players) {
    if (seenIds.has(player.id)) continue;

    if (player.lockedPartnerId) {
      const partner = players.find(p => p.id === player.lockedPartnerId);
      if (partner) {
        lockedPairs.push([player, partner]);
        seenIds.add(player.id);
        seenIds.add(partner.id);
      } else {
        // Partner not in this group, treat as unlocked
        unlockedPlayers.push(player);
        seenIds.add(player.id);
      }
    } else {
      unlockedPlayers.push(player);
      seenIds.add(player.id);
    }
  }

  // If we have 2 locked pairs, each pair becomes a team (randomize sides)
  if (lockedPairs.length === 2) {
    if (Math.random() < 0.5) {
      return { team1: lockedPairs[0], team2: lockedPairs[1] };
    } else {
      return { team1: lockedPairs[1], team2: lockedPairs[0] };
    }
  }

  // If we have 1 locked pair, they are team1, unlocked players are team2 (randomize sides)
  if (lockedPairs.length === 1 && unlockedPlayers.length === 2) {
    if (Math.random() < 0.5) {
      return { team1: lockedPairs[0], team2: unlockedPlayers };
    } else {
      return { team1: unlockedPlayers, team2: lockedPairs[0] };
    }
  }

  // No locked pairs - use original skill-based or random logic
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
      const team2WasRecent = shuffled[2].lastPartner === shuffled[3].id ||
                            shuffled[3].lastPartner === shuffled[2].id;

      if (team1WasRecent || team2WasRecent) {
        // Try alternative arrangement
        const altTeam1: Player[] = [shuffled[0], shuffled[2]];
        const altTeam2: Player[] = [shuffled[1], shuffled[3]];

        const altTeam1Recent = shuffled[0].lastPartner === shuffled[2].id ||
                              shuffled[2].lastPartner === shuffled[0].id;
        const altTeam2Recent = shuffled[1].lastPartner === shuffled[3].id ||
                              shuffled[3].lastPartner === shuffled[1].id;

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
    // Primary: Most wins (rewards playing and winning)
    if (b.wins !== a.wins) return b.wins - a.wins;

    // Tiebreaker 1: Win percentage (higher is better)
    const aWinPct = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
    const bWinPct = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;

    // Tiebreaker 2: Fewer games played (rewards efficiency at same wins)
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;

    // Tiebreaker 3: Alphabetical
    return a.name.localeCompare(b.name);
  });
}

export function getWinPercentage(player: Player): number {
  if (player.gamesPlayed === 0) return 0;
  return Math.round((player.wins / player.gamesPlayed) * 100);
}
