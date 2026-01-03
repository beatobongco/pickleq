import { useState, createContext, useContext, useEffect } from 'react';
import { SessionProvider, useSession } from './store/useSession';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { GlobalLeaderboardScreen } from './screens/GlobalLeaderboardScreen';
import { PlayersScreen } from './screens/PlayersScreen';
import { VenueSetupScreen } from './screens/VenueSetupScreen';
import { PublicLeaderboardScreen } from './screens/PublicLeaderboardScreen';
import { PublicSessionScreen } from './screens/PublicSessionScreen';
import { LandingScreen } from './screens/LandingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getLocalVenue } from './utils/supabase';
import { identifyVenue } from './utils/analytics';

const HAS_VISITED_KEY = 'pickleq_has_visited';

// Parse initial route from URL (runs once at load time)
function parseInitialRoute(): {
  type: 'landing' | 'app' | 'venue' | 'session';
  venueSlug?: string;
  sessionId?: string;
} {
  // Handle GitHub Pages SPA redirect
  const params = new URLSearchParams(window.location.search);
  const redirectPath = params.get('p');
  if (redirectPath) {
    window.history.replaceState(null, '', redirectPath);
  }

  const path = window.location.pathname;

  // /app route - always show the staff app
  if (path === '/app' || path === '/app/') {
    localStorage.setItem(HAS_VISITED_KEY, 'true');
    return { type: 'app' };
  }

  // /venue/:slug/session/:sessionId - public session results
  const sessionMatch = path.match(/^\/venue\/([a-z0-9-]+)\/session\/([a-z0-9-]+)\/?$/i);
  if (sessionMatch) {
    return { type: 'session', venueSlug: sessionMatch[1], sessionId: sessionMatch[2] };
  }

  // /venue/:slug - public venue leaderboard
  const venueMatch = path.match(/^\/venue\/([a-z0-9-]+)\/?$/i);
  if (venueMatch) {
    return { type: 'venue', venueSlug: venueMatch[1] };
  }

  // / - always show landing page
  return { type: 'landing' };
}

// Context for navigating back to landing page
const LandingContext = createContext<(() => void) | null>(null);
export const useLanding = () => useContext(LandingContext);

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

// Parse route once at module load time
const initialRoute = parseInitialRoute();

function App() {
  const [route, setRoute] = useState(initialRoute);

  // Identify venue on app load if one is configured
  useEffect(() => {
    const venue = getLocalVenue();
    if (venue) {
      identifyVenue(venue.id, venue.name, venue.slug);
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem(HAS_VISITED_KEY, 'true');
    setRoute({ type: 'app' });
    window.history.pushState(null, '', '/app');
  };

  const handleShowLanding = () => {
    setRoute({ type: 'landing' });
    window.history.pushState(null, '', '/');
  };

  // Public session page (shareable session results)
  if (route.type === 'session' && route.venueSlug && route.sessionId) {
    return (
      <ErrorBoundary>
        <PublicSessionScreen slug={route.venueSlug} sessionId={route.sessionId} />
      </ErrorBoundary>
    );
  }

  // Public venue leaderboard (no session provider needed)
  if (route.type === 'venue' && route.venueSlug) {
    return (
      <ErrorBoundary>
        <PublicLeaderboardScreen slug={route.venueSlug} />
      </ErrorBoundary>
    );
  }

  // Landing page for new visitors
  if (route.type === 'landing') {
    return (
      <ErrorBoundary>
        <LandingScreen onGetStarted={handleGetStarted} />
      </ErrorBoundary>
    );
  }

  // Staff app with full session management
  return (
    <ErrorBoundary>
      <LandingContext.Provider value={handleShowLanding}>
        <SessionProvider>
          <AppContent />
        </SessionProvider>
      </LandingContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
