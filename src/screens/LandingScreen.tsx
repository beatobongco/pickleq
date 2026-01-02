import { useEffect } from 'react';
import { Button } from '../components/Button';
import { trackLandingPageViewed, trackGetStartedClicked } from '../utils/analytics';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export function LandingScreen({ onGetStarted }: LandingScreenProps) {
  useEffect(() => {
    trackLandingPageViewed();
  }, []);

  const handleGetStarted = () => {
    trackGetStartedClicked();
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <header className="px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏓</span>
            <span className="text-2xl font-bold text-gray-900">PickleQ</span>
          </div>
          <Button variant="primary" size="sm" onClick={handleGetStarted}>
            Get Started
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="text-center py-12 md:py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Open Play,<br />Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The free, easy-to-use app for managing pickleball open play sessions.
            Handle check-ins, match players by skill, and keep courts rotating smoothly.
          </p>
          <Button variant="primary" size="lg" onClick={handleGetStarted} className="text-lg px-8">
            Start Managing Open Play
          </Button>
        </section>

        {/* Who It's For */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Perfect For
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="font-semibold text-gray-900 mb-2">Recreation Centers</h3>
              <p className="text-gray-600 text-sm">
                Run professional open play sessions with fair rotations and skill-based matching
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-3">🎾</div>
              <h3 className="font-semibold text-gray-900 mb-2">Pickleball Clubs</h3>
              <p className="text-gray-600 text-sm">
                Track member stats, create leaderboards, and keep everyone playing
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-semibold text-gray-900 mb-2">Friend Groups</h3>
              <p className="text-gray-600 text-sm">
                Organize pickup games with automatic team balancing
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add Players</h3>
                <p className="text-gray-600">
                  Enter player names and optionally set skill levels (1-3 stars).
                  Players are saved for future sessions.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Check In Arrivals</h3>
                <p className="text-gray-600">
                  As players show up, check them in. Late arrivals can join anytime
                  and get added to the queue automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Auto-Match & Rotate</h3>
                <p className="text-gray-600">
                  The app picks balanced teams and assigns courts. When a game ends,
                  tap the winner and the next 4 players are assigned automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">See Results</h3>
                <p className="text-gray-600">
                  End the session to see the leaderboard. Players can share their stats,
                  and lifetime records are tracked across sessions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-12">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Skill-based team balancing</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Fair queue rotation (play, then back of line)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Multiple court support (1-10)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Works offline (no internet needed)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Public venue leaderboards with QR codes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Shareable stats cards for players</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Cloud sync across devices</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">100% free, no ads</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to run smoother open play?
          </h2>
          <p className="text-gray-600 mb-6">
            No signup required. Just tap the button and start your first session.
          </p>
          <Button variant="primary" size="lg" onClick={handleGetStarted} className="text-lg px-8">
            Get Started Free
          </Button>
        </section>

        {/* Footer */}
        <footer className="pt-12 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>Made for the pickleball community by <a className="text-blue-600" href="https://beatobongco.com">Beato Bongco</a>.</p>
        </footer>
      </main>
    </div>
  );
}
