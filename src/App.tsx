import { useState, useEffect } from 'react';
import { SessionProvider, useSession } from './store/useSession';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { GlobalLeaderboardScreen } from './screens/GlobalLeaderboardScreen';
import { PlayersScreen } from './screens/PlayersScreen';
import { VenueSetupScreen } from './screens/VenueSetupScreen';
import { PublicLeaderboardScreen } from './screens/PublicLeaderboardScreen';
import { PublicSessionScreen } from './screens/PublicSessionScreen';

function AppContent() {
  const { screen } = useSession();

  switch (screen) {
    case 'setup':
      return <SetupScreen />;
    case 'play':
      return <PlayScreen />;
    case 'leaderboard':
      return <LeaderboardScreen />;
    case 'global-leaderboard':
      return <GlobalLeaderboardScreen />;
    case 'players':
      return <PlayersScreen />;
    case 'venue-setup':
      return <VenueSetupScreen />;
    default:
      return <SetupScreen />;
  }
}

function App() {
  const [venueSlug, setVenueSlug] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Handle GitHub Pages SPA redirect
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get('p');
    if (redirectPath) {
      window.history.replaceState(null, '', redirectPath);
    }

    // Check routing
    const path = window.location.pathname;

    // Check for session route: /venue/:slug/session/:sessionId
    const sessionMatch = path.match(/^\/venue\/([a-z0-9-]+)\/session\/([a-z0-9-]+)\/?$/i);
    if (sessionMatch) {
      setVenueSlug(sessionMatch[1]);
      setSessionId(sessionMatch[2]);
      return;
    }

    // Check for venue route: /venue/:slug
    const venueMatch = path.match(/^\/venue\/([a-z0-9-]+)\/?$/i);
    if (venueMatch) {
      setVenueSlug(venueMatch[1]);
    }
  }, []);

  // Public session page (shareable session results)
  if (venueSlug && sessionId) {
    return <PublicSessionScreen slug={venueSlug} sessionId={sessionId} />;
  }

  // Public venue leaderboard (no session provider needed)
  if (venueSlug) {
    return <PublicLeaderboardScreen slug={venueSlug} />;
  }

  // Staff app with full session management
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
