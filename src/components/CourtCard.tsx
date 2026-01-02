import { useState, useEffect } from 'react';
import type { Match, Player, GameMode } from '../types';
import { Button } from './Button';
import { getSkillLabel } from './SkillSelector';
import { announceNextMatch } from '../utils/speech';

interface CourtCardProps {
  court: number;
  match?: Match;
  players: Player[];
  gameMode: GameMode;
  queueLength: number;
  onRecordWinner: (matchId: string, winner: 1 | 2) => void;
  onStartNextMatch: (court: number) => void;
}

function ElapsedTime({ startTime }: { startTime: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
}

function TeamDisplay({
  playerIds,
  players,
  team,
  isSingles,
}: {
  playerIds: string[];
  players: Player[];
  team: 1 | 2;
  isSingles: boolean;
}) {
  const teamPlayers = playerIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
  const bgColor = team === 1 ? 'bg-[#1976D2]' : 'bg-[#F57C00]';
  const lightBg = team === 1 ? 'bg-[#1976D2]/10' : 'bg-[#F57C00]/10';

  return (
    <div className={`${lightBg} rounded-xl flex-1 overflow-hidden`}>
      {/* Team header bar */}
      <div className={`${bgColor} px-3 py-1.5`}>
        <span className="text-xs font-bold text-white tracking-wide">
          {isSingles ? (teamPlayers[0]?.name.split(' ')[0].toUpperCase() || 'PLAYER') : `TEAM ${team}`}
        </span>
      </div>
      {/* Players */}
      <div className="p-2 space-y-1">
        {teamPlayers.map(player => (
          <div
            key={player.id}
            className="px-2 py-1.5"
          >
            <div className="font-semibold text-gray-900 truncate">
              {player.name}
            </div>
            {player.skill && (
              <div className="text-xs text-gray-500">
                <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                <span className="text-gray-300">{'★'.repeat(3 - player.skill)}</span>
                <span className="ml-1">{getSkillLabel(player.skill)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourtCard({
  court,
  match,
  players,
  gameMode,
  queueLength,
  onRecordWinner,
  onStartNextMatch,
}: CourtCardProps) {
  const isSingles = gameMode === 'singles';
  const playersNeeded = isSingles ? 2 : 4;
  const canStartMatch = queueLength >= playersNeeded;

  if (!match) {
    return (
      <div className="bg-gray-100 rounded-2xl p-4 border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400 mb-1">Court {court}</div>
          {canStartMatch ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onStartNextMatch(court)}
              className="mt-2"
            >
              Start Next Match
            </Button>
          ) : (
            <div className="text-gray-400">
              Waiting for players...
              {queueLength > 0 && (
                <span className="block text-sm mt-1">
                  ({queueLength}/{playersNeeded} in queue)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleAnnounce = () => {
    const team1Names = match.team1
      .map(id => players.find(p => p.id === id)?.name)
      .filter(Boolean) as string[];
    const team2Names = match.team2
      .map(id => players.find(p => p.id === id)?.name)
      .filter(Boolean) as string[];
    announceNextMatch(court, team1Names, team2Names);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Scoreboard header */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">Court {court}</span>
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 font-mono text-sm">
            <ElapsedTime startTime={match.startTime} />
          </span>
          <button
            onClick={handleAnnounce}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Announce match"
          >
            🔊
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3 mb-4">
          <TeamDisplay
            playerIds={match.team1}
            players={players}
            team={1}
            isSingles={isSingles}
          />
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-400">vs</span>
          </div>
          <TeamDisplay
            playerIds={match.team2}
            players={players}
            team={2}
            isSingles={isSingles}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="team1"
            size="lg"
            onClick={() => onRecordWinner(match.id, 1)}
            className="flex-1"
          >
            {isSingles
              ? `${players.find(p => p.id === match.team1[0])?.name || 'Player 1'} Wins`
              : 'Team 1 Wins'}
          </Button>
          <Button
            variant="team2"
            size="lg"
            onClick={() => onRecordWinner(match.id, 2)}
            className="flex-1"
          >
            {isSingles
              ? `${players.find(p => p.id === match.team2[0])?.name || 'Player 2'} Wins`
              : 'Team 2 Wins'}
          </Button>
        </div>
      </div>
    </div>
  );
}
