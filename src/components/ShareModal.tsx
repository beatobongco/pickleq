import { useRef, useState } from 'react';
import { Button } from './Button';
import { PlayerStatsCard } from './PlayerStatsCard';
import { captureElement, shareImage, downloadImage, canNativeShare } from '../utils/share';
import type { SkillLevel } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    name: string;
    skill: SkillLevel;
    wins: number;
    losses: number;
    gamesPlayed: number;
  };
  location?: string;
  venueName?: string;
  // All-time ranking info (only for ranked players)
  rank?: number;
  totalRankedPlayers?: number;
  // Card type for styling
  cardType?: 'session' | 'alltime';
}

export function ShareModal({ isOpen, onClose, player, location, venueName, rank, totalRankedPlayers, cardType }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!cardRef.current) {
      console.error('Share failed: cardRef is null');
      return;
    }

    setIsSharing(true);
    try {
      console.log('Capturing element...');
      const blob = await captureElement(cardRef.current);
      console.log('Blob created:', blob.size, 'bytes');
      await shareImage(blob, `${player.name}'s PickleQ Stats`);
      console.log('Share complete');
    } catch (err) {
      console.error('Failed to share:', err);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) {
      console.error('Download failed: cardRef is null');
      return;
    }

    setIsSharing(true);
    try {
      console.log('Capturing element for download...');
      const blob = await captureElement(cardRef.current);
      console.log('Blob created:', blob.size, 'bytes');
      downloadImage(blob);
      console.log('Download triggered');
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Failed to save image. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const currentDate = cardType === 'alltime'
    ? `as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Share Stats</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-6 overflow-hidden">
          <div className="transform scale-[0.85] origin-top">
            <PlayerStatsCard
              ref={cardRef}
              name={player.name}
              skill={player.skill}
              wins={player.wins}
              losses={player.losses}
              gamesPlayed={player.gamesPlayed}
              location={location}
              venueName={venueName}
              date={currentDate}
              rank={rank}
              totalPlayers={totalRankedPlayers}
              cardType={cardType}
            />
          </div>
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
            Save the image and share it on your favorite platform!
          </p>
        )}
      </div>
    </div>
  );
}
