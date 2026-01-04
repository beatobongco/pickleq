import { useRef, useState } from 'react';
import { Button } from './Button';
import { LeaderboardCard } from './LeaderboardCard';
import { captureElement, shareImage, downloadImage, canNativeShare } from '../utils/share';
import { trackLeaderboardShared } from '../utils/analytics';
import type { SkillLevel } from '../types';

interface LeaderboardPlayer {
  name: string;
  skill?: SkillLevel;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

interface ShareLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: LeaderboardPlayer[];
  venueName?: string;
  location?: string;
  totalGames?: number;
  cardType: 'session' | 'alltime';
}

export function ShareLeaderboardModal({
  isOpen,
  onClose,
  players,
  venueName,
  location,
  totalGames,
  cardType,
}: ShareLeaderboardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!cardRef.current) return;

    setIsSharing(true);
    try {
      const blob = await captureElement(cardRef.current);
      await shareImage(blob, `PickleQ ${cardType === 'alltime' ? 'All-Time' : 'Session'} Leaderboard`);
      trackLeaderboardShared(cardType, 'native');
    } catch (err) {
      console.error('Failed to share:', err);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsSharing(true);
    try {
      const blob = await captureElement(cardRef.current);
      downloadImage(blob);
      trackLeaderboardShared(cardType, 'download');
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Failed to save image. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const currentDate = cardType === 'alltime'
    ? `as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 pb-safe">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Share Leaderboard</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-4 overflow-hidden h-[380px]">
          <div className="transform scale-[0.55] origin-top">
            <LeaderboardCard
              players={players}
              venueName={venueName}
              location={location}
              date={currentDate}
              totalGames={totalGames}
              cardType={cardType}
            />
          </div>
        </div>

        {/* Hidden card for capturing */}
        <div className="absolute -left-[9999px]">
          <LeaderboardCard
            ref={cardRef}
            players={players}
            venueName={venueName}
            location={location}
            date={currentDate}
            totalGames={totalGames}
            cardType={cardType}
            forSharing={true}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {canNativeShare() ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleShare}
              disabled={isSharing}
              className="flex-1"
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownload}
              disabled={isSharing}
              className="flex-1"
            >
              {isSharing ? 'Saving...' : 'Save Image'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
        </div>

        {!canNativeShare() && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Save the image and share it on Instagram, Facebook, or anywhere!
          </p>
        )}
      </div>
    </div>
  );
}
