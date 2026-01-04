import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { CourtCard } from '../components/CourtCard';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerPicker } from '../components/PlayerPicker';
import { SkillSelector } from '../components/SkillSelector';
import { UndoToast } from '../components/UndoToast';
import { LiveStandingsModal } from '../components/LiveStandingsModal';
import { announceNextMatch, announceWinner, isMuted, setMuted, cancelAllSpeech } from '../utils/speech';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayScreen() {
  const {
    session,
    queue,
    undoAction,
    recordWinner,
    undoWinner,
    checkInPlayer,
    checkOutPlayer,
    endSession,
    clearUndo,
    addPlayer,
    addPlayerWithSkill,
    setPlayerSkill,
    fillCourt,
    lockPartners,
    unlockPartner,
    pullFromCourt,
  } = useSession();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLiveStandings, setShowLiveStandings] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [selectedForPairing, setSelectedForPairing] = useState<string | null>(null);
  const [editingSkillPlayerId, setEditingSkillPlayerId] = useState<string | null>(null);
  const [pullConfirm, setPullConfirm] = useState<{ playerId: string; matchId: string; playerName: string; court: number } | null>(null);
  const sessionPlayerNames = session.players.map(p => p.name);

  const toggleMute = () => {
    const newMuted = !muted;
    setMutedState(newMuted);
    setMuted(newMuted);
  };

  // Track mounted state to prevent announcements after unmount
  const isMountedRef = useRef(true);

  // Cancel all speech when leaving the play screen
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelAllSpeech();
    };
  }, []);

  // Track announced matches to avoid re-announcing
  const announcedMatches = useRef<Set<string>>(new Set());

  // Announce new matches when they appear
  useEffect(() => {
    for (const match of session.activeMatches) {
      if (!announcedMatches.current.has(match.id)) {
        announcedMatches.current.add(match.id);

        // Get player names for announcement
        const team1Names = match.team1
          .map(id => session.players.find(p => p.id === id)?.name)
          .filter(Boolean) as string[];
        const team2Names = match.team2
          .map(id => session.players.find(p => p.id === id)?.name)
          .filter(Boolean) as string[];

        // Small delay to let UI update first
        setTimeout(() => {
          // Only announce if still mounted
          if (isMountedRef.current) {
            announceNextMatch(match.court, team1Names, team2Names);
          }
        }, 3000);
      }
    }
  }, [session.activeMatches, session.players]);

  const notHerePlayers = session.players.filter(p => p.status === 'not-here');
  const leftPlayers = session.players.filter(p => p.status === 'left');

  // Calculate average game duration from completed matches
  const gameStats = useMemo(() => {
    const completedMatches = session.matches.filter(m => m.endTime && m.startTime);
    if (completedMatches.length === 0) {
      return { avgDuration: null, estimatedWait: null };
    }

    const totalDuration = completedMatches.reduce((sum, m) => {
      return sum + ((m.endTime ?? 0) - m.startTime);
    }, 0);
    const avgDuration = totalDuration / completedMatches.length;

    // Estimate wait time based on queue position
    // Players per game depends on mode
    const playersPerGame = session.gameMode === 'doubles' ? 4 : 2;
    // How many "rounds" until you play? Assume all courts rotate together
    const activeCourts = session.activeMatches.length || 1;
    const gamesPerRound = activeCourts;
    const playersServedPerRound = gamesPerRound * playersPerGame;

    return { avgDuration, playersServedPerRound };
  }, [session.matches, session.activeMatches.length, session.gameMode]);

  // Generate court grid
  const courts = Array.from({ length: session.courts }, (_, i) => i + 1);

  const handleRecordWinner = (matchId: string, winner: 1 | 2) => {
    // Find the match and get winner names before recording (which removes the match)
    const match = session.activeMatches.find(m => m.id === matchId);
    if (match) {
      const winningTeam = winner === 1 ? match.team1 : match.team2;
      const winnerNames = winningTeam
        .map(id => session.players.find(p => p.id === id)?.name)
        .filter(Boolean) as string[];

      // Announce winner
      announceWinner(match.court, winnerNames);
    }

    recordWinner(matchId, winner);
  };

  const handleUndo = () => {
    if (undoAction?.type === 'winner') {
      const data = undoAction.data as { matchId: string };
      undoWinner(data.matchId);
    }
    clearUndo();
  };

  const getMatchForCourt = (court: number) => {
    return session.activeMatches.find(m => m.court === court);
  };

  const handlePullPlayer = (playerId: string, matchId: string) => {
    const player = session.players.find(p => p.id === playerId);
    const match = session.activeMatches.find(m => m.id === matchId);
    if (player && match) {
      setPullConfirm({ playerId, matchId, playerName: player.name, court: match.court });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - scoreboard style */}
      <header className="bg-gray-900 text-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">{session.location}</h1>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">GAMES</span>
                <span className="font-bold text-xl">{session.matches.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">COURTS</span>
                <span className="font-bold text-xl">{session.activeMatches.length}/{session.courts}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">QUEUE</span>
                <span className="font-bold text-xl">{queue.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLiveStandings(true)}
              className="p-2 rounded-lg transition-colors bg-gray-700 text-yellow-400 hover:bg-gray-600"
              title="View live standings"
            >
              <span className="text-lg">🏆</span>
            </button>
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${
                muted
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-700 text-green-400 hover:bg-gray-600'
              }`}
              title={muted ? 'Unmute announcements' : 'Mute announcements'}
            >
              {muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
            >
              End
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Courts Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courts.map((court) => (
              <CourtCard
                key={court}
                court={court}
                match={getMatchForCourt(court)}
                players={session.players}
                gameMode={session.gameMode}
                queueLength={queue.length}
                onRecordWinner={handleRecordWinner}
                onStartNextMatch={fillCourt}
                onPullPlayer={handlePullPlayer}
              />
            ))}
          </div>
        </section>

        {/* Queue - styled as "Next Up" lineup */}
        <section className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">NEXT UP</span>
              <span className="text-gray-400 text-sm">({queue.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedForPairing && (
                <button
                  onClick={() => setSelectedForPairing(null)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
              {gameStats.avgDuration && (
                <span className="text-gray-500 text-xs" title="Average game duration this session">
                  Avg game: {formatDuration(gameStats.avgDuration)}
                </span>
              )}
              {(() => {
                const playersNeeded = session.gameMode === 'doubles' ? 4 : 2;
                const playersShort = playersNeeded - queue.length;
                if (playersShort > 0 && queue.length > 0) {
                  return (
                    <span className="text-yellow-400 text-xs">
                      Need {playersShort} more
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No players in queue
            </p>
          ) : (
            <div className="divide-y divide-gray-800 max-h-[40vh] overflow-y-auto">
              {queue.map((player, index) => {
                const winRate = player.gamesPlayed > 0
                  ? Math.round((player.wins / player.gamesPlayed) * 100)
                  : null;
                const isSelected = selectedForPairing === player.id;
                const isLocked = !!player.lockedPartnerId;
                const lockedPartner = isLocked
                  ? queue.find(p => p.id === player.lockedPartnerId)
                  : null;
                const canPairWith = selectedForPairing &&
                  selectedForPairing !== player.id &&
                  !player.lockedPartnerId &&
                  session.gameMode === 'doubles';

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-purple-900/50'
                        : canPairWith
                          ? 'bg-purple-900/20 hover:bg-purple-900/40 cursor-pointer'
                          : 'hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      if (canPairWith) {
                        lockPartners(selectedForPairing, player.id);
                        setSelectedForPairing(null);
                      }
                    }}
                  >
                    <span className="text-2xl font-bold text-gray-600 w-8 text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{player.name}</span>
                        {isLocked && lockedPartner && (
                          <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">
                            🔗 {lockedPartner.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {editingSkillPlayerId === player.id ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <SkillSelector
                              skill={player.skill}
                              onChange={(skill) => {
                                setPlayerSkill(player.id, skill);
                                setEditingSkillPlayerId(null);
                              }}
                              size="sm"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSkillPlayerId(player.id);
                            }}
                            className="flex items-center gap-1 hover:bg-gray-700 px-1 py-0.5 rounded transition-colors"
                            title="Edit skill level"
                          >
                            {player.skill ? (
                              <>
                                <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                                <span className="text-gray-600">{'★'.repeat(3 - player.skill)}</span>
                              </>
                            ) : (
                              <span className="text-gray-500">Set skill</span>
                            )}
                          </button>
                        )}
                        <span>{player.gamesPlayed}G</span>
                        {winRate !== null && (
                          <span className={winRate >= 50 ? 'text-green-400' : 'text-gray-400'}>
                            {winRate}%
                          </span>
                        )}
                        {gameStats.avgDuration && gameStats.playersServedPerRound && (() => {
                          // Which "round" will this player play in? (1-indexed)
                          const round = Math.ceil((index + 1) / gameStats.playersServedPerRound);
                          // Round 1 waits for current games, round 2 waits for round 1, etc.
                          const waitMins = Math.max(1, Math.ceil(round * (gameStats.avgDuration / 60000)));
                          return (
                            <span className="text-gray-500">
                              • ~{waitMins} min wait
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {session.gameMode === 'doubles' && !isLocked && !selectedForPairing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForPairing(player.id);
                          }}
                          className="text-gray-500 hover:text-purple-400 p-2 transition-colors"
                          title="Pair with another player"
                        >
                          🔗
                        </button>
                      )}
                      {isLocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unlockPartner(player.id);
                          }}
                          className="text-purple-400 hover:text-purple-300 p-2 transition-colors"
                          title="Unpair"
                        >
                          ✂️
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          checkOutPlayer(player.id);
                        }}
                        className="text-gray-500 hover:text-red-400 p-2 transition-colors"
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {selectedForPairing && (
            <div className="px-4 py-2 bg-purple-900/30 text-purple-300 text-sm text-center">
              Tap another player to pair as teammates
            </div>
          )}
        </section>

        {/* Add New Player */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Add Player
          </h2>
          <PlayerPicker
            sessionPlayerNames={sessionPlayerNames}
            onAddPlayer={addPlayer}
            onAddPlayerWithSkill={addPlayerWithSkill}
          />
        </section>

        {/* Late Arrivals */}
        {notHerePlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Not Yet Here ({notHerePlayers.length})
            </h2>
            <div className="space-y-2">
              {notHerePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showSkill={false}
                  showActions={true}
                  onCheckIn={() => checkInPlayer(player.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Left Early */}
        {leftPlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-500 mb-3">
              Left ({leftPlayers.length})
            </h2>
            <div className="space-y-2">
              {leftPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-gray-100 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="text-gray-600">{player.name}</span>
                    <span className="ml-3 text-sm text-gray-400">
                      {player.wins}-{player.losses} ({player.gamesPlayed} games)
                    </span>
                  </div>
                  <button
                    onClick={() => checkInPlayer(player.id)}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                  >
                    Check In
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Undo Toast */}
      {undoAction && undoAction.type === 'winner' && (
        <UndoToast
          message="Winner recorded"
          onUndo={handleUndo}
          onDismiss={clearUndo}
        />
      )}

      {/* End Session Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              End Session?
            </h3>
            <p className="text-gray-600 mb-6">
              This will show the final leaderboard. {session.activeMatches.length > 0 && 'Active matches will be cancelled.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  setShowEndConfirm(false);
                  endSession();
                }}
                className="flex-1"
              >
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pull Player Confirmation */}
      {pullConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Remove from Court {pullConfirm.court}?
            </h3>
            <p className="text-gray-600 mb-6">
              <strong>{pullConfirm.playerName}</strong> will return to the queue.
              {queue.length > 0
                ? ' A substitute will take their spot.'
                : ' The match will be cancelled since no substitutes are available.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setPullConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  pullFromCourt(pullConfirm.playerId, pullConfirm.matchId);
                  setPullConfirm(null);
                }}
                className="flex-1"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Standings Modal */}
      <LiveStandingsModal
        isOpen={showLiveStandings}
        onClose={() => setShowLiveStandings(false)}
        players={session.players}
        totalGames={session.matches.length}
        location={session.location}
      />
    </div>
  );
}
