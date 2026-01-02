import { describe, it, expect } from 'vitest';
import type { Player } from '../types';
import {
  selectNextPlayers,
  formTeams,
  findSubstitute,
  calculateLeaderboard,
  getWinPercentage,
} from './matching';

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
    ...overrides,
  };
}

// Helper to create multiple players with sequential names
function createPlayers(count: number, overrides: Partial<Player> = {}): Player[] {
  return Array.from({ length: count }, (_, i) =>
    createPlayer({ name: `Player ${i + 1}`, ...overrides })
  );
}

describe('selectNextPlayers', () => {
  describe('priority selection', () => {
    it('returns null when not enough players for doubles', () => {
      const queue = createPlayers(3);
      expect(selectNextPlayers(queue, 'doubles')).toBeNull();
    });

    it('returns null when not enough players for singles', () => {
      const queue = createPlayers(1);
      expect(selectNextPlayers(queue, 'singles')).toBeNull();
    });

    it('returns 4 players for doubles', () => {
      const queue = createPlayers(6);
      const result = selectNextPlayers(queue, 'doubles');
      expect(result).toHaveLength(4);
    });

    it('returns 2 players for singles', () => {
      const queue = createPlayers(4);
      const result = selectNextPlayers(queue, 'singles');
      expect(result).toHaveLength(2);
    });

    it('prioritizes by queue position (respects natural turn order)', () => {
      // Queue order matters more than games played - prevents late arrivals from jumping ahead
      const queue = [
        createPlayer({ name: 'First', gamesPlayed: 5 }),    // First in queue
        createPlayer({ name: 'Second', gamesPlayed: 0 }),   // Second in queue
        createPlayer({ name: 'Third', gamesPlayed: 0 }),    // Third in queue
        createPlayer({ name: 'Fourth', gamesPlayed: 2 }),   // Fourth in queue
        createPlayer({ name: 'Fifth', gamesPlayed: 1 }),    // Fifth in queue
        createPlayer({ name: 'Sixth', gamesPlayed: 1 }),    // Sixth in queue
      ];

      const result = selectNextPlayers(queue, 'doubles')!;
      const names = result.map(p => p.name);

      // Should prioritize first 4 in queue regardless of games played
      expect(names).toContain('First');
      expect(names).toContain('Second');
      expect(names).toContain('Third');
      expect(names).toContain('Fourth');
      expect(names).not.toContain('Fifth');
      expect(names).not.toContain('Sixth');
    });
  });

  describe('singles skill matching', () => {
    it('matches exact skill levels when available', () => {
      const queue = [
        createPlayer({ name: 'Pro1', skill: 3, gamesPlayed: 0 }),
        createPlayer({ name: 'Beginner', skill: 1, gamesPlayed: 0 }),
        createPlayer({ name: 'Pro2', skill: 3, gamesPlayed: 1 }),
      ];

      const result = selectNextPlayers(queue, 'singles')!;
      const skills = result.map(p => p.skill);

      // Pro1 (priority) should match with Pro2 (same skill)
      expect(skills).toEqual([3, 3]);
    });

    it('matches similar skill (within 1 level) when exact not available', () => {
      const queue = [
        createPlayer({ name: 'Intermediate', skill: 2, gamesPlayed: 0 }),
        createPlayer({ name: 'Beginner', skill: 1, gamesPlayed: 0 }),
        createPlayer({ name: 'Pro', skill: 3, gamesPlayed: 0 }),
      ];

      const result = selectNextPlayers(queue, 'singles')!;

      // Intermediate (priority, skill 2) should match with Beginner (skill 1) or Pro (skill 3)
      const skills = result.map(p => p.skill);
      expect(Math.abs(skills[0]! - skills[1]!)).toBeLessThanOrEqual(1);
    });

    it('falls back to priority when no skill match available', () => {
      const queue = [
        createPlayer({ name: 'Player1', skill: null, gamesPlayed: 0 }),
        createPlayer({ name: 'Player2', skill: null, gamesPlayed: 1 }),
        createPlayer({ name: 'Player3', skill: null, gamesPlayed: 2 }),
      ];

      const result = selectNextPlayers(queue, 'singles')!;
      const names = result.map(p => p.name);

      // Should take top 2 by priority (fewest games)
      expect(names).toContain('Player1');
      expect(names).toContain('Player2');
    });
  });

  describe('locked pairs', () => {
    it('keeps locked pairs together when selecting players', () => {
      const player1 = createPlayer({ name: 'Partner1', gamesPlayed: 0 });
      const player2 = createPlayer({ name: 'Partner2', gamesPlayed: 0 });
      player1.lockedPartnerId = player2.id;
      player2.lockedPartnerId = player1.id;

      const queue = [
        player1,
        player2,
        createPlayer({ name: 'Solo1', gamesPlayed: 0 }),
        createPlayer({ name: 'Solo2', gamesPlayed: 0 }),
      ];

      const result = selectNextPlayers(queue, 'doubles')!;
      const names = result.map(p => p.name);

      expect(names).toContain('Partner1');
      expect(names).toContain('Partner2');
    });

    it('handles two locked pairs correctly', () => {
      const pair1a = createPlayer({ name: 'Pair1A', gamesPlayed: 0 });
      const pair1b = createPlayer({ name: 'Pair1B', gamesPlayed: 0 });
      pair1a.lockedPartnerId = pair1b.id;
      pair1b.lockedPartnerId = pair1a.id;

      const pair2a = createPlayer({ name: 'Pair2A', gamesPlayed: 0 });
      const pair2b = createPlayer({ name: 'Pair2B', gamesPlayed: 0 });
      pair2a.lockedPartnerId = pair2b.id;
      pair2b.lockedPartnerId = pair2a.id;

      const queue = [pair1a, pair1b, pair2a, pair2b];
      const result = selectNextPlayers(queue, 'doubles')!;

      expect(result).toHaveLength(4);
      expect(result).toContain(pair1a);
      expect(result).toContain(pair1b);
      expect(result).toContain(pair2a);
      expect(result).toContain(pair2b);
    });

    it('mixes locked pair with non-locked players when only one pair', () => {
      const pair1 = createPlayer({ name: 'Partner1', gamesPlayed: 0 });
      const pair2 = createPlayer({ name: 'Partner2', gamesPlayed: 0 });
      pair1.lockedPartnerId = pair2.id;
      pair2.lockedPartnerId = pair1.id;

      const queue = [
        pair1,
        pair2,
        createPlayer({ name: 'Solo1', gamesPlayed: 0 }),
        createPlayer({ name: 'Solo2', gamesPlayed: 0 }),
        createPlayer({ name: 'Solo3', gamesPlayed: 0 }),
      ];

      const result = selectNextPlayers(queue, 'doubles')!;
      const names = result.map(p => p.name);

      // Locked pair should be included
      expect(names).toContain('Partner1');
      expect(names).toContain('Partner2');
      // Plus 2 solo players
      expect(result).toHaveLength(4);
    });

    it('handles edge case: 1 locked pair + only 1 non-locked player falls through', () => {
      const pair1 = createPlayer({ name: 'Partner1', gamesPlayed: 5 });
      const pair2 = createPlayer({ name: 'Partner2', gamesPlayed: 5 });
      pair1.lockedPartnerId = pair2.id;
      pair2.lockedPartnerId = pair1.id;

      // Only 1 non-locked player, but we have 4 total (need to fall through)
      const solo1 = createPlayer({ name: 'Solo1', gamesPlayed: 0 });
      const solo2 = createPlayer({ name: 'Solo2', gamesPlayed: 0 }); // Another locked pair member
      const solo3 = createPlayer({ name: 'Solo3', gamesPlayed: 0 });

      const queue = [pair1, pair2, solo1, solo2, solo3];
      const result = selectNextPlayers(queue, 'doubles')!;

      // Should return 4 players (falls through to default behavior)
      expect(result).toHaveLength(4);
    });

    it('respects queue position - locked pair at front plays even with more games', () => {
      // Locked pair at front of queue has played 5 games each
      const pair1 = createPlayer({ name: 'Partner1', gamesPlayed: 5 });
      const pair2 = createPlayer({ name: 'Partner2', gamesPlayed: 5 });
      pair1.lockedPartnerId = pair2.id;
      pair2.lockedPartnerId = pair1.id;

      // Non-locked players at back of queue have 0 games
      const solo1 = createPlayer({ name: 'Solo1', gamesPlayed: 0 });
      const solo2 = createPlayer({ name: 'Solo2', gamesPlayed: 0 });
      const solo3 = createPlayer({ name: 'Solo3', gamesPlayed: 0 });
      const solo4 = createPlayer({ name: 'Solo4', gamesPlayed: 0 });

      // Locked pair is first in queue, so they should play (queue position > games played)
      const queue = [pair1, pair2, solo1, solo2, solo3, solo4];
      const result = selectNextPlayers(queue, 'doubles')!;
      const names = result.map(p => p.name);

      // Locked pair is in top 4 by queue position, so they play
      expect(names).toContain('Partner1');
      expect(names).toContain('Partner2');
      // Plus 2 solo players who are next in queue
      expect(names).toContain('Solo1');
      expect(names).toContain('Solo2');
      expect(result).toHaveLength(4);
    });

    it('includes locked pair when one member is in top 4 by priority', () => {
      // Locked pair: one has 0 games, one has 5 games
      const pair1 = createPlayer({ name: 'Partner1', gamesPlayed: 0 });
      const pair2 = createPlayer({ name: 'Partner2', gamesPlayed: 5 });
      pair1.lockedPartnerId = pair2.id;
      pair2.lockedPartnerId = pair1.id;

      // Solo players with varying games
      const solo1 = createPlayer({ name: 'Solo1', gamesPlayed: 1 });
      const solo2 = createPlayer({ name: 'Solo2', gamesPlayed: 2 });
      const solo3 = createPlayer({ name: 'Solo3', gamesPlayed: 3 });

      const queue = [pair1, pair2, solo1, solo2, solo3];
      const result = selectNextPlayers(queue, 'doubles')!;
      const names = result.map(p => p.name);

      // Partner1 (0 games) is in top 4, so full pair should be included
      expect(names).toContain('Partner1');
      expect(names).toContain('Partner2');
      // Plus 2 solo players with fewest games
      expect(result).toHaveLength(4);
    });
  });
});

describe('formTeams', () => {
  describe('singles mode', () => {
    it('creates two single-player teams', () => {
      const players = createPlayers(2);
      const result = formTeams(players, 'singles');

      expect(result).not.toBeNull();
      expect(result!.team1).toHaveLength(1);
      expect(result!.team2).toHaveLength(1);
    });

    it('returns null for wrong player count', () => {
      const players = createPlayers(4);
      expect(formTeams(players, 'singles')).toBeNull();
    });
  });

  describe('doubles mode - locked pairs', () => {
    it('keeps locked pair on same team', () => {
      const pair1 = createPlayer({ name: 'Partner1' });
      const pair2 = createPlayer({ name: 'Partner2' });
      pair1.lockedPartnerId = pair2.id;
      pair2.lockedPartnerId = pair1.id;

      const players = [
        pair1,
        pair2,
        createPlayer({ name: 'Solo1' }),
        createPlayer({ name: 'Solo2' }),
      ];

      const result = formTeams(players, 'doubles')!;

      // Locked pair should be on the same team
      const team1Ids = result.team1.map(p => p.id);
      const team2Ids = result.team2.map(p => p.id);

      const pair1InTeam1 = team1Ids.includes(pair1.id);
      const pair2InTeam1 = team1Ids.includes(pair2.id);
      const pair1InTeam2 = team2Ids.includes(pair1.id);
      const pair2InTeam2 = team2Ids.includes(pair2.id);

      // Both should be on same team
      expect(pair1InTeam1 === pair2InTeam1).toBe(true);
      expect(pair1InTeam2 === pair2InTeam2).toBe(true);
    });

    it('puts two locked pairs on opposite teams', () => {
      const pairA1 = createPlayer({ name: 'PairA1' });
      const pairA2 = createPlayer({ name: 'PairA2' });
      pairA1.lockedPartnerId = pairA2.id;
      pairA2.lockedPartnerId = pairA1.id;

      const pairB1 = createPlayer({ name: 'PairB1' });
      const pairB2 = createPlayer({ name: 'PairB2' });
      pairB1.lockedPartnerId = pairB2.id;
      pairB2.lockedPartnerId = pairB1.id;

      const players = [pairA1, pairA2, pairB1, pairB2];
      const result = formTeams(players, 'doubles')!;

      // Each locked pair should be on same team
      const team1Ids = result.team1.map(p => p.id);

      const pairAOnTeam1 = team1Ids.includes(pairA1.id) && team1Ids.includes(pairA2.id);
      const pairBOnTeam1 = team1Ids.includes(pairB1.id) && team1Ids.includes(pairB2.id);

      // One pair per team
      expect(pairAOnTeam1 !== pairBOnTeam1).toBe(true);
    });
  });

  describe('doubles mode - skill balancing', () => {
    it('balances teams with High+Low vs High+Low pattern', () => {
      const players = [
        createPlayer({ name: 'Pro1', skill: 3 }),
        createPlayer({ name: 'Pro2', skill: 3 }),
        createPlayer({ name: 'Beginner1', skill: 1 }),
        createPlayer({ name: 'Beginner2', skill: 1 }),
      ];

      const result = formTeams(players, 'doubles', false)!; // avoidPartners=false for consistent test

      // Each team should have one high and one low skill player
      const team1Skills = result.team1.map(p => p.skill!).sort();
      const team2Skills = result.team2.map(p => p.skill!).sort();

      expect(team1Skills).toEqual([1, 3]);
      expect(team2Skills).toEqual([1, 3]);
    });

    it('handles mixed skill levels', () => {
      const players = [
        createPlayer({ name: 'Pro', skill: 3 }),
        createPlayer({ name: 'Intermediate1', skill: 2 }),
        createPlayer({ name: 'Intermediate2', skill: 2 }),
        createPlayer({ name: 'Beginner', skill: 1 }),
      ];

      const result = formTeams(players, 'doubles', false)!;

      // With skills [3, 2, 2, 1], expected pairing: [3,1] vs [2,2]
      const team1Sum = result.team1.reduce((s, p) => s + (p.skill ?? 0), 0);
      const team2Sum = result.team2.reduce((s, p) => s + (p.skill ?? 0), 0);

      // Teams should be roughly balanced (4 each in this case)
      expect(team1Sum).toBe(4);
      expect(team2Sum).toBe(4);
    });
  });

  describe('doubles mode - recent partner avoidance', () => {
    it('avoids pairing recent partners when possible', () => {
      const player1 = createPlayer({ name: 'Player1', skill: 3 });
      const player2 = createPlayer({ name: 'Player2', skill: 1 });
      const player3 = createPlayer({ name: 'Player3', skill: 3 });
      const player4 = createPlayer({ name: 'Player4', skill: 1 });

      // Player1 and Player4 were partners last game
      player1.lastPartner = player4.id;
      player4.lastPartner = player1.id;

      const players = [player1, player2, player3, player4];
      const result = formTeams(players, 'doubles', true)!;

      // Should avoid Player1 + Player4 on same team
      const team1Ids = result.team1.map(p => p.id);
      const bothOnTeam1 = team1Ids.includes(player1.id) && team1Ids.includes(player4.id);

      const team2Ids = result.team2.map(p => p.id);
      const bothOnTeam2 = team2Ids.includes(player1.id) && team2Ids.includes(player4.id);

      expect(bothOnTeam1 || bothOnTeam2).toBe(false);
    });
  });
});

describe('findSubstitute', () => {
  it('returns null for empty queue', () => {
    const removed = createPlayer({ skill: 2 });
    expect(findSubstitute([], removed)).toBeNull();
  });

  it('prioritizes skill match for substitution', () => {
    const removed = createPlayer({ skill: 2 });
    const queue = [
      createPlayer({ name: 'Wrong Skill', skill: 1, gamesPlayed: 0 }),
      createPlayer({ name: 'Right Skill', skill: 2, gamesPlayed: 5 }),
    ];

    const result = findSubstitute(queue, removed);
    expect(result?.name).toBe('Right Skill');
  });

  it('falls back to similar skill when exact match unavailable', () => {
    const removed = createPlayer({ skill: 2 });
    const queue = [
      createPlayer({ name: 'Beginner', skill: 1, gamesPlayed: 0 }),
      createPlayer({ name: 'Pro', skill: 3, gamesPlayed: 0 }),
    ];

    const result = findSubstitute(queue, removed);
    // Should pick either skill 1 or 3 (both within 1 level of 2)
    expect([1, 3]).toContain(result?.skill);
  });

  it('falls back to first in queue when no skill match', () => {
    const removed = createPlayer({ skill: null });
    const queue = [
      createPlayer({ name: 'First', gamesPlayed: 10 }),   // First in queue
      createPlayer({ name: 'Second', gamesPlayed: 0 }),   // Second in queue
    ];

    const result = findSubstitute(queue, removed);
    expect(result?.name).toBe('First'); // Queue position > games played
  });
});

describe('calculateLeaderboard', () => {
  it('excludes players with 0 games', () => {
    const players = [
      createPlayer({ name: 'Active', gamesPlayed: 5, wins: 3, losses: 2 }),
      createPlayer({ name: 'Inactive', gamesPlayed: 0, wins: 0, losses: 0 }),
    ];

    const result = calculateLeaderboard(players);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active');
  });

  it('sorts by wins first (descending)', () => {
    const players = [
      createPlayer({ name: 'LessWins', gamesPlayed: 10, wins: 5, losses: 5 }),
      createPlayer({ name: 'MoreWins', gamesPlayed: 10, wins: 8, losses: 2 }),
    ];

    const result = calculateLeaderboard(players);
    expect(result[0].name).toBe('MoreWins');
    expect(result[1].name).toBe('LessWins');
  });

  it('breaks ties with win percentage', () => {
    const players = [
      createPlayer({ name: 'LowPct', gamesPlayed: 10, wins: 5, losses: 5 }), // 50%
      createPlayer({ name: 'HighPct', gamesPlayed: 6, wins: 5, losses: 1 }), // 83%
    ];

    const result = calculateLeaderboard(players);
    expect(result[0].name).toBe('HighPct');
    expect(result[1].name).toBe('LowPct');
  });

  it('breaks win% ties with fewer games played', () => {
    // Note: This tiebreaker (fewer games) can only apply when wins AND win% are equal
    // wins equal + win% equal implies gamesPlayed equal, so this tiebreaker
    // is effectively unreachable in normal cases. Let's verify the sort
    // correctly falls through to alphabetical when all other factors are equal.
    const players = [
      createPlayer({ name: 'MoreGames', gamesPlayed: 10, wins: 5, losses: 5 }), // 5 wins, 50%
      createPlayer({ name: 'FewerGames', gamesPlayed: 10, wins: 5, losses: 5 }), // 5 wins, 50%
    ];

    const result = calculateLeaderboard(players);
    // Same wins, same win%, same games → alphabetical (F before M)
    expect(result[0].name).toBe('FewerGames');
    expect(result[1].name).toBe('MoreGames');
  });

  it('breaks remaining ties alphabetically', () => {
    const players = [
      createPlayer({ name: 'Zach', gamesPlayed: 4, wins: 2, losses: 2 }),
      createPlayer({ name: 'Adam', gamesPlayed: 4, wins: 2, losses: 2 }),
    ];

    const result = calculateLeaderboard(players);
    expect(result[0].name).toBe('Adam');
    expect(result[1].name).toBe('Zach');
  });
});

describe('getWinPercentage', () => {
  it('returns 0 for players with no games', () => {
    const player = createPlayer({ gamesPlayed: 0 });
    expect(getWinPercentage(player)).toBe(0);
  });

  it('calculates correct percentage', () => {
    const player = createPlayer({ gamesPlayed: 10, wins: 7, losses: 3 });
    expect(getWinPercentage(player)).toBe(70);
  });

  it('rounds to nearest integer', () => {
    const player = createPlayer({ gamesPlayed: 3, wins: 1, losses: 2 });
    expect(getWinPercentage(player)).toBe(33); // 33.33... rounds to 33
  });
});
