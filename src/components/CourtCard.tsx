import type { Match, Player } from '../types';
import { Button } from './Button';
import { getSkillLabel } from './SkillSelector';
import { announceNextMatch } from '../utils/speech';

interface CourtCardProps {
  court: number;
  match?: Match;
  players: Player[];
  onRecordWinner: (matchId: string, winner: 1 | 2) => void;
  onRemovePlayer: (playerId: string, matchId: string) => void;
}

function TeamDisplay({
  playerIds,
  players,
  team,
  onRemovePlayer,
  matchId,
}: {
  playerIds: [string, string];
  players: Player[];
  team: 1 | 2;
  onRemovePlayer: (playerId: string, matchId: string) => void;
  matchId: string;
}) {
  const teamPlayers = playerIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
  const bgColor = team === 1 ? 'bg-[#1976D2]/10' : 'bg-[#F57C00]/10';
  const borderColor = team === 1 ? 'border-[#1976D2]' : 'border-[#F57C00]';
  const textColor = team === 1 ? 'text-[#1976D2]' : 'text-[#F57C00]';

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-xl p-3 flex-1`}>
      <div className={`text-xs font-bold ${textColor} mb-2`}>
        TEAM {team}
      </div>
      <div className="space-y-2">
        {teamPlayers.map(player => (
          <button
            key={player.id}
            onClick={() => onRemovePlayer(player.id, matchId)}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800 truncate">
                {player.name}
              </span>
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Remove
              </span>
            </div>
            {player.skill && (
              <div className="text-sm">
                <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                <span className="text-gray-300">{'★'.repeat(3 - player.skill)}</span>
                <span className="text-gray-500 ml-1">{getSkillLabel(player.skill)}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CourtCard({
  court,
  match,
  players,
  onRecordWinner,
  onRemovePlayer,
}: CourtCardProps) {
  if (!match) {
    return (
      <div className="bg-gray-100 rounded-2xl p-4 border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400 mb-1">Court {court}</div>
          <div className="text-gray-400">Waiting for players...</div>
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
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="text-2xl font-bold text-gray-800">Court {court}</div>
        <button
          onClick={handleAnnounce}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Announce match"
        >
          🔊
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <TeamDisplay
          playerIds={match.team1}
          players={players}
          team={1}
          onRemovePlayer={onRemovePlayer}
          matchId={match.id}
        />
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-400">vs</span>
        </div>
        <TeamDisplay
          playerIds={match.team2}
          players={players}
          team={2}
          onRemovePlayer={onRemovePlayer}
          matchId={match.id}
        />
      </div>

      <div className="flex gap-3">
        <Button
          variant="team1"
          size="lg"
          onClick={() => onRecordWinner(match.id, 1)}
          className="flex-1"
        >
          Team 1 Wins
        </Button>
        <Button
          variant="team2"
          size="lg"
          onClick={() => onRecordWinner(match.id, 2)}
          className="flex-1"
        >
          Team 2 Wins
        </Button>
      </div>
    </div>
  );
}
