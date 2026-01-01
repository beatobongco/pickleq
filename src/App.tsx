import { SessionProvider, useSession } from './store/useSession';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { GlobalLeaderboardScreen } from './screens/GlobalLeaderboardScreen';

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
    default:
      return <SetupScreen />;
  }
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;
