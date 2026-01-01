import { SessionProvider, useSession } from './store/useSession';
import { SetupScreen } from './screens/SetupScreen';
import { PlayScreen } from './screens/PlayScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';

function AppContent() {
  const { screen } = useSession();

  switch (screen) {
    case 'setup':
      return <SetupScreen />;
    case 'play':
      return <PlayScreen />;
    case 'leaderboard':
      return <LeaderboardScreen />;
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
