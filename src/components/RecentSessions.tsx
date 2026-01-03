import type { VenueSession } from '../types';

interface RecentSessionsProps {
  sessions: VenueSession[];
  loading?: boolean;
  venueSlug?: string; // For public leaderboard URL format
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function RecentSessions({ sessions, loading, venueSlug }: RecentSessionsProps) {
  const getSessionUrl = (sessionId: string) => {
    if (venueSlug) {
      return `/venue/${venueSlug}/session/${sessionId}`;
    }
    return `/session/${sessionId}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-700">Recent Sessions</h2>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-400">
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-6 text-center text-gray-400">
          <div className="text-2xl mb-2">📅</div>
          <p>No sessions recorded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sessions.map((session) => (
            <a
              key={session.id}
              href={getSessionUrl(session.id)}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl">📅</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {formatSessionDate(session.endedAt)}
                </div>
                <div className="text-sm text-gray-500">
                  {session.location}
                  <span className="mx-1">•</span>
                  {session.courts} court{session.courts !== 1 ? 's' : ''}
                  <span className="mx-1">•</span>
                  {session.totalGames} game{session.totalGames !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
