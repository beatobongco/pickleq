import { SessionProvider, useSession } from './store/useSession';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { GlobalLeaderboardScreen } from './screens/GlobalLeaderboardScreen';
import { PlayersScreen } from './screens/PlayersScreen';

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
